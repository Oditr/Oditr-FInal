// ── REST API: Audit Endpoint ──
// POST /api/v1/audit — Run a performance audit via API key
// Requires: Bearer <api_key> header
// Pro plan: 1,000 req/day | Enterprise: 10,000 req/day

import { NextRequest, NextResponse } from 'next/server'
import { runCustomAudit } from '@/lib/audit-engine'
import { cacheKey, getCached, setCache } from '@/lib/audit-engine/cache'
import { fetchPSI } from '@/lib/psi-pool'
import {
  authenticateApiRequest,
  isApiError,
  apiErrorResponse,
  withRateLimitHeaders,
} from '@/lib/api-auth'
import { getFeatureFlag, captureServerEvent } from '@/lib/posthog'

export const maxDuration = 180

// ── SSRF Protection ──
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '[::]']
const PRIVATE_IP = [
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./,
]
// IPv6-mapped IPv4 patterns (e.g. [::ffff:127.0.0.1], [::ffff:10.0.0.1])
const IPV6_MAPPED = /^\[?::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?$/i
// Cloud metadata endpoints
const METADATA_IPS = ['169.254.169.254', 'metadata.google.internal']

function isBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (BLOCKED_HOSTS.includes(h) || BLOCKED_HOSTS.includes(`[${h}]`)) return true
  if (METADATA_IPS.includes(h)) return true
  // Check IPv6-mapped IPv4 addresses
  const mapped = h.match(IPV6_MAPPED)
  if (mapped) {
    const ipv4 = mapped[1]
    if (BLOCKED_HOSTS.includes(ipv4)) return true
    if (PRIVATE_IP.some(p => p.test(ipv4))) return true
    if (METADATA_IPS.includes(ipv4)) return true
  }
  return PRIVATE_IP.some(p => p.test(h))
}

// ── PSI Response parsing ──
function extractLighthouseData(data: any) {
  const lhr = data?.lighthouseResult
  if (!lhr) return null

  const cats = lhr.categories || {}
  const scores = {
    performance: Math.round((cats.performance?.score || 0) * 100),
    accessibility: Math.round((cats.accessibility?.score || 0) * 100),
    bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    seo: Math.round((cats.seo?.score || 0) * 100),
  }

  const audits = lhr.audits || {}
  const m = (id: string) => {
    const a = audits[id]
    return a ? {
      value: a.displayValue || '—',
      score: a.score ?? 0,
      numericValue: a.numericValue,
    } : { value: '—', score: 0 }
  }

  const cwv = {
    lcp: m('largest-contentful-paint'),
    inp: m('interaction-to-next-paint'),
    cls: m('cumulative-layout-shift'),
    fcp: m('first-contentful-paint'),
    ttfb: m('server-response-time'),
    si: m('speed-index'),
    tbt: m('total-blocking-time'),
  }

  // Opportunities
  const opAudits = Object.values(audits).filter(
    (a: any) => a?.score != null && a.score < 0.9 && a.details?.type === 'opportunity'
  )
  const opportunities = opAudits.map((a: any) => ({
    id: String(a.id || ''),
    title: String(a.title || ''),
    description: String(a.description || ''),
    score: Number(a.score || 0),
    displayValue: String(a.displayValue || ''),
    impact: Number(a.score || 0) < 0.5 ? 'high' : 'medium',
  }))

  // Diagnostics
  const diagAudits = Object.values(audits).filter(
    (a: any) => a?.details?.type === 'table'
  )
  const diagnostics = diagAudits.slice(0, 15).map((a: any) => ({
    id: String(a.id || ''),
    title: String(a.title || ''),
    displayValue: String(a.displayValue || ''),
    score: a.score as number | null,
  }))

  // Field data (CrUX)
  let fieldData = null
  const ld = data?.loadingExperience
  if (ld?.metrics) {
    const fm = (key: string) => {
      const metric = ld.metrics[key]
      return metric ? { p75: metric.percentile, category: metric.category } : null
    }
    fieldData = {
      lcp: fm('LARGEST_CONTENTFUL_PAINT_MS'),
      inp: fm('INTERACTION_TO_NEXT_PAINT'),
      cls: fm('CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      fid: fm('FIRST_INPUT_DELAY_MS'),
      overallCategory: ld.overall_category || 'NONE',
    }
  }

  return {
    lighthouseVersion: lhr.lighthouseVersion,
    scores,
    cwv,
    opportunities,
    diagnostics,
    fieldData,
  }
}

export async function POST(req: NextRequest) {
  // ── Auth + Rate Limit ──
  const auth = await authenticateApiRequest(req)
  if (isApiError(auth)) return apiErrorResponse(auth)

  try {
    // ── Feature Flag: Maintenance Mode ──
    // When enabled in PostHog, the API returns 503 for all requests.
    const maintenanceMode = await getFeatureFlag(
      'maintenance-mode',
      auth.user.id || 'api-user',
      false,  // Default: not in maintenance
    )
    if (maintenanceMode) {
      captureServerEvent(auth.user.id || 'api-user', 'api_maintenance_blocked')
      return withRateLimitHeaders(
        NextResponse.json(
          {
            error: 'VitalFix API is temporarily under maintenance. Please try again shortly.',
            code: 'MAINTENANCE_MODE',
          },
          { status: 503 }
        ),
        auth
      )
    }

    const body = await req.json()
    const { url, strategy = 'mobile' } = body

    // ── Validate URL ──
    if (!url || typeof url !== 'string') {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Missing required field: url', code: 'VALIDATION_ERROR' },
          { status: 400 }
        ),
        auth
      )
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Invalid URL format.', code: 'VALIDATION_ERROR' },
          { status: 400 }
        ),
        auth
      )
    }

    if (isBlocked(parsedUrl.hostname)) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Internal/private URLs are not allowed.', code: 'SSRF_BLOCKED' },
          { status: 400 }
        ),
        auth
      )
    }

    const cleanUrl = parsedUrl.toString()
    const strat = strategy === 'desktop' ? 'desktop' : 'mobile'

    // ── Check Cache ──
    const key = cacheKey(cleanUrl, strat)
    const cached = await getCached(key)
    if (cached) {
      return withRateLimitHeaders(
        NextResponse.json({
          ...cached,
          fromCache: true,
          meta: {
            plan: auth.plan,
            apiUsed: auth.apiUsed,
            apiLimit: auth.apiLimit,
            apiRemaining: auth.apiRemaining,
          },
        }),
        auth
      )
    }

    // ── Run Audits in Parallel ──
    const categories = ['performance', 'accessibility', 'best-practices', 'seo']

    // ── Feature Flag: PSI Kill Switch ──
    const psiEnabled = await getFeatureFlag(
      'psi-api-enabled',
      auth.user.id || 'api-user',
      true,  // Default: PSI enabled
    )

    const [psiResult, customAudit] = await Promise.allSettled([
      psiEnabled
        ? fetchPSI({ url: cleanUrl, strategy: strat, categories, timeout: 90_000 })
            .then(async (res) => {
              if (!res.ok) {
                const errBody = await res.json().catch(() => ({}))
                throw new Error(errBody?.error?.message || `PSI returned ${res.status}`)
              }
              return res.json()
            })
        : Promise.resolve(null),  // PSI disabled — resolve with null immediately
      runCustomAudit(cleanUrl).catch(() => null),
    ])

    // ── Extract Data ──
    const psiData = psiResult.status === 'fulfilled' ? psiResult.value : null
    const lighthouse = psiData ? extractLighthouseData(psiData) : null
    const custom = customAudit.status === 'fulfilled' ? customAudit.value : null

    // ── Calculate Health Score ──
    const psiPerf = lighthouse?.scores?.performance ?? 0
    const customScore = custom?.overallScore ?? 0
    const healthScore = lighthouse && custom
      ? Math.round(psiPerf * 0.6 + customScore * 0.4)
      : lighthouse ? psiPerf : customScore

    // ── Build Response ──
    const result = {
      url: cleanUrl,
      strategy: strat,
      fetchedAt: new Date().toISOString(),
      lighthouseVersion: lighthouse?.lighthouseVersion,
      healthScore,
      scores: lighthouse?.scores || null,
      cwv: lighthouse?.cwv || null,
      fieldData: lighthouse?.fieldData || null,
      opportunities: lighthouse?.opportunities || [],
      diagnostics: lighthouse?.diagnostics || [],
      customAudit: custom || null,
      fromCache: false,
      meta: {
        plan: auth.plan,
        apiUsed: auth.apiUsed,
        apiLimit: auth.apiLimit,
        apiRemaining: auth.apiRemaining,
      },
    }

    // Cache result (5 min TTL)
    await setCache(key, result, 300)

    return withRateLimitHeaders(
      NextResponse.json(result),
      auth
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[API v1 Audit] Error:', message)
    return withRateLimitHeaders(
      NextResponse.json(
        { error: message, code: 'AUDIT_FAILED' },
        { status: 500 }
      ),
      auth
    )
  }
}

// GET /api/v1/audit — Usage info + docs
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if (isApiError(auth)) return apiErrorResponse(auth)

  return withRateLimitHeaders(
    NextResponse.json({
      status: 'ok',
      plan: auth.plan,
      usage: {
        used: auth.apiUsed,
        limit: auth.apiLimit,
        remaining: auth.apiRemaining,
      },
      endpoints: {
        audit: {
          method: 'POST',
          path: '/api/v1/audit',
          body: {
            url: '(required) URL to audit',
            strategy: '(optional) "mobile" or "desktop" — default: "mobile"',
          },
        },
      },
    }),
    auth
  )
}
