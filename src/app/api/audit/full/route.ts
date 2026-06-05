// ── Unified Audit API Route ──
// Runs Lighthouse (PSI) + Custom Audit Engine in parallel
// Includes caching, rate limiting, and structured error handling

import { NextRequest, NextResponse } from 'next/server'
import { runCustomAuditWithMeta, calculateHealthScore } from '@/lib/audit-engine'
import { buildIntelligenceReport } from '@/lib/intelligence'
import { cacheKey, getCached, setCache } from '@/lib/audit-engine/cache'
import { fetchPSI, getPoolStatus } from '@/lib/psi-pool'
import { trackAuditEvent, updateDailyCounters } from '@/lib/analytics'
import { checkQuota, incrementAuditCount } from '@/lib/plans'
import { createServerClient } from '@supabase/ssr'
import {
  getConnectionProfile, getLocationProfile,
  getRegionalInsights, rateMetric,
  type ConnectionProfile, type LocationProfile,
} from '@/lib/audit-context'
import { getFeatureFlag, captureServerEvent } from '@/lib/posthog'

// Vercel serverless function config — audit can take up to 120s
export const maxDuration = 180

// ── Structured error for PSI failures ──
class PSIError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PSIError'
    this.status = status
  }
}

// ── SSRF Protection — block private/internal URLs ──
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '[::]']
const PRIVATE_IP_PATTERNS = [
  /^10\./,                              // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,         // 172.16.0.0/12
  /^192\.168\./,                         // 192.168.0.0/16
  /^169\.254\./,                         // link-local / AWS metadata
  /^0\./,                               // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./,  // CGNAT 100.64.0.0/10
]

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (BLOCKED_HOSTS.includes(h)) return true
  return PRIVATE_IP_PATTERNS.some(p => p.test(h))
}

// ── Rate limiter (in-memory) with periodic cleanup ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5           // max requests
const RATE_WINDOW = 60_000     // per 60 seconds
const CLEANUP_INTERVAL = 5 * 60_000 // clean expired entries every 5 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// Periodic cleanup to prevent unbounded map growth
let lastCleanup = Date.now()
function cleanupRateLimitMap() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  rateLimitMap.forEach((entry, ip) => {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  })
}

// ── PSI fetch via key pool ──
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
// Base timeouts — scaled by connection profile in the handler
const BASE_PSI_TIMEOUT = 90_000
const BASE_CUSTOM_AUDIT_TIMEOUT = 60_000
const BASE_GLOBAL_TIMEOUT = 150_000

async function fetchLighthouse(url: string, strategy: string, timeout: number = BASE_PSI_TIMEOUT) {
  // Route through the PSI key pool (handles key rotation, rate limiting, 429 recovery)
  const res = await fetchPSI({
    url,
    strategy,
    categories: CATEGORIES,
    timeout,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const message = errBody?.error?.message || `PageSpeed Insights returned ${res.status}`
    throw new PSIError(message, res.status)
  }

  const data = await res.json()
  const lhr = data.lighthouseResult
  const fex = data.loadingExperience
  const audit = (id: string) => lhr?.audits?.[id]
  const auditVal = (id: string) => audit(id)?.displayValue ?? 'N/A'
  const auditScore = (id: string): number => Math.round((audit(id)?.score ?? 0) * 100)

  const scores = {
    performance: Math.round((lhr?.categories?.performance?.score ?? 0) * 100),
    accessibility: Math.round((lhr?.categories?.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((lhr?.categories?.['best-practices']?.score ?? 0) * 100),
    seo: Math.round((lhr?.categories?.seo?.score ?? 0) * 100),
  }

  const cwv = {
    lcp: { value: auditVal('largest-contentful-paint'), score: auditScore('largest-contentful-paint'), numericValue: audit('largest-contentful-paint')?.numericValue ?? 0 },
    inp: {
      value: auditVal('interaction-to-next-paint') !== 'N/A' ? auditVal('interaction-to-next-paint') : auditVal('total-blocking-time'),
      score: audit('interaction-to-next-paint')?.score != null ? auditScore('interaction-to-next-paint') : auditScore('total-blocking-time'),
      numericValue: audit('interaction-to-next-paint')?.numericValue ?? audit('total-blocking-time')?.numericValue ?? 0,
    },
    cls: { value: auditVal('cumulative-layout-shift'), score: auditScore('cumulative-layout-shift'), numericValue: audit('cumulative-layout-shift')?.numericValue ?? 0 },
    fcp: { value: auditVal('first-contentful-paint'), score: auditScore('first-contentful-paint') },
    ttfb: { value: auditVal('server-response-time'), score: auditScore('server-response-time'), numericValue: audit('server-response-time')?.numericValue ?? 0 },
    si: { value: auditVal('speed-index'), score: auditScore('speed-index') },
    tbt: { value: auditVal('total-blocking-time'), score: auditScore('total-blocking-time'), numericValue: audit('total-blocking-time')?.numericValue ?? 0 },
  }

  const fieldData = fex?.metrics ? {
    lcp: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS ? { p75: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile, category: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.category } : null,
    fid: fex.metrics.FIRST_INPUT_DELAY_MS ? { p75: fex.metrics.FIRST_INPUT_DELAY_MS.percentile, category: fex.metrics.FIRST_INPUT_DELAY_MS.category } : null,
    cls: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ? { p75: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile, category: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category } : null,
    inp: fex.metrics.INTERACTION_TO_NEXT_PAINT ? { p75: fex.metrics.INTERACTION_TO_NEXT_PAINT.percentile, category: fex.metrics.INTERACTION_TO_NEXT_PAINT.category } : null,
    overallCategory: fex.overall_category,
  } : null

  const opportunities = lhr?.audits ?? {}
  const opportunityIds = [
    'render-blocking-resources', 'uses-optimized-images', 'uses-webp-images',
    'uses-text-compression', 'uses-long-cache-ttl', 'efficient-animated-content',
    'unused-javascript', 'unused-css-rules', 'uses-passive-event-listeners',
    'no-document-write', 'dom-size', 'bootup-time', 'mainthread-work-breakdown',
    'uses-rel-preload', 'uses-rel-preconnect', 'font-display',
  ]
  const topOpportunities = opportunityIds
    .filter(id => opportunities[id] && opportunities[id].score !== null && opportunities[id].score < 1)
    .map(id => {
      const a = opportunities[id]
      return {
        id, title: a.title, description: a.description,
        score: Math.round((a.score ?? 0) * 100),
        displayValue: a.displayValue ?? '',
        impact: a.score < 0.5 ? 'high' : a.score < 0.9 ? 'medium' : 'low',
      }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)

  const diagnosticIds = [
    'largest-contentful-paint-element', 'layout-shift-elements',
    'long-tasks', 'third-party-summary', 'network-requests',
    'resource-summary', 'total-byte-weight',
  ]
  const diagnostics = diagnosticIds
    .filter(id => lhr?.audits?.[id])
    .map(id => ({ id, title: lhr.audits[id].title, displayValue: lhr.audits[id].displayValue ?? '', score: lhr.audits[id].score }))

  return {
    url, strategy,
    fetchedAt: new Date().toISOString(),
    scores, cwv, fieldData,
    opportunities: topOpportunities,
    diagnostics,
    lighthouseVersion: lhr?.lighthouseVersion,
    userAgent: lhr?.environment?.hostUserAgent ?? '',
  }
}

// ── Lite PSI fetch — perf-only, shorter timeout ──
// Fallback when the full 4-category request times out. Single-category is ~2-3x faster.
const BASE_PSI_LITE_TIMEOUT = 45_000 // 45s — should be enough for perf-only

async function fetchLighthouseLite(url: string, strategy: string, timeout: number = BASE_PSI_LITE_TIMEOUT) {
  // Route through the PSI key pool (perf-only, shorter timeout)
  const res = await fetchPSI({
    url,
    strategy,
    categories: ['performance'],
    timeout,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new PSIError(errBody?.error?.message || `PSI lite returned ${res.status}`, res.status)
  }

  const data = await res.json()
  const lhr = data.lighthouseResult
  const fex = data.loadingExperience
  const audit = (id: string) => lhr?.audits?.[id]
  const auditVal = (id: string) => audit(id)?.displayValue ?? 'N/A'
  const auditScore = (id: string): number => Math.round((audit(id)?.score ?? 0) * 100)

  const scores = {
    performance: Math.round((lhr?.categories?.performance?.score ?? 0) * 100),
    accessibility: 0, // Not available in lite mode
    bestPractices: 0,
    seo: 0,
  }

  const cwv = {
    lcp: { value: auditVal('largest-contentful-paint'), score: auditScore('largest-contentful-paint'), numericValue: audit('largest-contentful-paint')?.numericValue ?? 0 },
    inp: {
      value: auditVal('interaction-to-next-paint') !== 'N/A' ? auditVal('interaction-to-next-paint') : auditVal('total-blocking-time'),
      score: audit('interaction-to-next-paint')?.score != null ? auditScore('interaction-to-next-paint') : auditScore('total-blocking-time'),
      numericValue: audit('interaction-to-next-paint')?.numericValue ?? audit('total-blocking-time')?.numericValue ?? 0,
    },
    cls: { value: auditVal('cumulative-layout-shift'), score: auditScore('cumulative-layout-shift'), numericValue: audit('cumulative-layout-shift')?.numericValue ?? 0 },
    fcp: { value: auditVal('first-contentful-paint'), score: auditScore('first-contentful-paint') },
    ttfb: { value: auditVal('server-response-time'), score: auditScore('server-response-time'), numericValue: audit('server-response-time')?.numericValue ?? 0 },
    si: { value: auditVal('speed-index'), score: auditScore('speed-index') },
    tbt: { value: auditVal('total-blocking-time'), score: auditScore('total-blocking-time'), numericValue: audit('total-blocking-time')?.numericValue ?? 0 },
  }

  const fieldData = fex?.metrics ? {
    lcp: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS ? { p75: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile, category: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.category } : null,
    fid: fex.metrics.FIRST_INPUT_DELAY_MS ? { p75: fex.metrics.FIRST_INPUT_DELAY_MS.percentile, category: fex.metrics.FIRST_INPUT_DELAY_MS.category } : null,
    cls: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ? { p75: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile, category: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category } : null,
    inp: fex.metrics.INTERACTION_TO_NEXT_PAINT ? { p75: fex.metrics.INTERACTION_TO_NEXT_PAINT.percentile, category: fex.metrics.INTERACTION_TO_NEXT_PAINT.category } : null,
    overallCategory: fex.overall_category,
  } : null

  // Lite mode has fewer opportunities since only performance audits run
  const opportunities = lhr?.audits ?? {}
  const opportunityIds = [
    'render-blocking-resources', 'uses-optimized-images', 'uses-webp-images',
    'uses-text-compression', 'uses-long-cache-ttl', 'unused-javascript',
    'unused-css-rules', 'dom-size', 'bootup-time', 'mainthread-work-breakdown',
  ]
  const topOpportunities = opportunityIds
    .filter(id => opportunities[id] && opportunities[id].score !== null && opportunities[id].score < 1)
    .map(id => {
      const a = opportunities[id]
      return {
        id, title: a.title, description: a.description,
        score: Math.round((a.score ?? 0) * 100),
        displayValue: a.displayValue ?? '',
        impact: a.score < 0.5 ? 'high' : a.score < 0.9 ? 'medium' : 'low',
      }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)

  const diagnosticIds = [
    'largest-contentful-paint-element', 'layout-shift-elements',
    'long-tasks', 'third-party-summary', 'total-byte-weight',
  ]
  const diagnostics = diagnosticIds
    .filter(id => lhr?.audits?.[id])
    .map(id => ({ id, title: lhr.audits[id].title, displayValue: lhr.audits[id].displayValue ?? '', score: lhr.audits[id].score }))

  console.log('[audit API] PSI lite succeeded (perf-only fallback)')

  return {
    url, strategy,
    fetchedAt: new Date().toISOString(),
    scores, cwv, fieldData,
    opportunities: topOpportunities,
    diagnostics,
    lighthouseVersion: lhr?.lighthouseVersion,
    userAgent: lhr?.environment?.hostUserAgent ?? '',
    liteMode: true, // Flag so UI can show "partial PSI data" notice
  }
}

// ── Main handler ──
export async function GET(req: NextRequest) {
  // Cleanup expired rate limit entries periodically
  cleanupRateLimitMap()

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const rawStrategy = searchParams.get('strategy') || 'mobile'

  // Validate strategy parameter
  if (rawStrategy !== 'mobile' && rawStrategy !== 'desktop') {
    return NextResponse.json({ error: 'Invalid strategy. Must be "mobile" or "desktop".' }, { status: 400 })
  }
  const strategy = rawStrategy as 'mobile' | 'desktop'

  // Parse connection + location selectors
  const connectionLabel = searchParams.get('connection') || '4G (Fast)'
  const locationLabel = searchParams.get('location') || 'US East (Virginia)'
  const connProfile = getConnectionProfile(connectionLabel)
  const locProfile = getLocationProfile(locationLabel)

  // Scale timeouts by connection profile
  const PSI_TIMEOUT = Math.round(BASE_PSI_TIMEOUT * connProfile.timeoutMultiplier)
  const CUSTOM_AUDIT_TIMEOUT = Math.round(BASE_CUSTOM_AUDIT_TIMEOUT * connProfile.timeoutMultiplier)
  const GLOBAL_TIMEOUT = Math.round(BASE_GLOBAL_TIMEOUT * connProfile.timeoutMultiplier)

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Extract IP early (needed for analytics tracking)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    trackAuditEvent('invalid_url', ip, { url_attempted: url }).catch(() => { })
    updateDailyCounters({ invalid_urls: 1 }).catch(() => { })
    return NextResponse.json({ error: 'Invalid URL. Must start with http:// or https://' }, { status: 400 })
  }

  // SSRF protection — block private/internal URLs
  if (isBlockedHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'URLs pointing to internal or private networks are not allowed.' }, { status: 400 })
  }

  // Rate limiting (IP-based)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in 60 seconds.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(RATE_WINDOW / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // ── Plan-based quota enforcement ──
  // Extract user from Supabase session cookie (if authenticated)
  let userId: string | null = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const sb = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() { /* read-only in API route */ },
        },
      })
      const { data: { user } } = await sb.auth.getUser()
      userId = user?.id || null
    } catch { /* auth check failed — treat as anonymous */ }
  }

  // Check quota for authenticated users
  if (userId) {
    try {
      const quota = await checkQuota(userId)
      if (!quota.allowed) {
        const upgradeMsg = quota.plan === 'free'
          ? 'Upgrade to Starter ($5/mo) for 25 audits/day.'
          : 'Upgrade to Pro ($19/mo) for unlimited audits.'
        return NextResponse.json(
          {
            error: `Daily audit limit reached (${quota.used}/${quota.limit}). ${upgradeMsg}`,
            hint: 'Visit /pricing to upgrade your plan.',
            quotaExceeded: true,
            used: quota.used,
            limit: quota.limit,
            plan: quota.plan,
          },
          { status: 429 }
        )
      }
    } catch { /* quota check failed — allow through */ }
  }

  // Check cache
  const key = cacheKey(parsedUrl.href, strategy)
  const cached = getCached<any>(key)
  if (cached) {
    trackAuditEvent('cache_hit', ip, { url: parsedUrl.hostname, strategy }).catch(() => { })
    updateDailyCounters({ cache_hits: 1 }).catch(() => { })
    return NextResponse.json({ ...cached, fromCache: true })
  }

  // ── Analytics: track audit start ──
  const auditStartTime = Date.now()
  trackAuditEvent('audit_run', ip, { url: parsedUrl.hostname, strategy }).catch(() => { })
  updateDailyCounters({ total_audits: 1, cache_misses: 1 }).catch(() => { })

  // ── Feature Flag: PSI Kill Switch ──
  // Check if PSI API is enabled via PostHog feature flag.
  // Default: true (PSI runs normally). Set to false in PostHog to disable PSI during outages.
  const psiEnabled = await getFeatureFlag(
    'psi-api-enabled',
    userId || ip,  // Use userId if authenticated, IP as fallback for anonymous
    true,          // Default: PSI is enabled
  )

  // ── Run PSI and Custom Audit INDEPENDENTLY ──
  // Architecture: Each engine has its own timeout. One failing does NOT kill the other.
  // The global safety-net collects whatever partial results are available — NEVER rejects.
  let globalTimer: ReturnType<typeof setTimeout> | undefined

  // Shared results container — populated as engines complete
  let lighthouseResult: any = null
  let customAuditResult: any = null
  let psiError: string | null = null
  let customError: string | null = null

  try {
    // ── Wrap custom audit with its own timeout (resolves null, never rejects) ──
    // Use runCustomAuditWithMeta to capture raw HTML/headers for the intelligence engine
    let auditHtml: string | undefined
    let auditHeaders: Record<string, string> | undefined

    const customAuditWithTimeout = Promise.race([
      runCustomAuditWithMeta(parsedUrl.href).then((meta) => {
        auditHtml = meta.html
        auditHeaders = meta.headers
        return meta.auditResult
      }).catch((err) => {
        customError = err?.message || 'Custom audit failed'
        console.warn('[audit API] Custom audit error:', customError)
        return null
      }),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          customError = 'Custom audit timed out'
          console.warn('[audit API] Custom audit timed out after 60s')
          resolve(null)
        }, CUSTOM_AUDIT_TIMEOUT)
      ),
    ])

    // ── PSI with fallback: full 4-category → lite perf-only on timeout ──
    // If PSI is disabled via feature flag, skip entirely (kill switch for outages)
    const psiWithFallback = async () => {
      if (!psiEnabled) {
        psiError = 'PSI disabled via feature flag'
        console.log('[audit API] PSI skipped — disabled via PostHog feature flag "psi-api-enabled"')
        captureServerEvent(userId || ip, 'psi_killed_by_flag', { url: parsedUrl.hostname })
        return null
      }

      try {
        return await fetchLighthouse(parsedUrl.href, strategy, PSI_TIMEOUT)
      } catch (err: any) {
        psiError = err?.message || 'PSI failed'

        // If PSI timed out or returned 5xx, try a LITE request (perf-only, much faster)
        if (err instanceof PSIError && (err.status === 504 || err.status >= 500)) {
          console.warn('[audit API] PSI full request failed, trying lite (perf-only)…')
          try {
            const PSI_LITE_TIMEOUT = Math.round(BASE_PSI_LITE_TIMEOUT * connProfile.timeoutMultiplier)
            return await fetchLighthouseLite(parsedUrl.href, strategy, PSI_LITE_TIMEOUT)
          } catch (liteErr: any) {
            psiError = `PSI full and lite both failed: ${liteErr?.message || 'unknown'}`
            console.warn('[audit API] PSI lite also failed:', liteErr?.message)
            return null
          }
        }

        // For non-timeout PSI errors, don't retry
        return null
      }
    }

    // ── Run both engines in parallel ──
    const auditPromise = Promise.all([
      psiWithFallback(),
      customAuditWithTimeout,
    ])

    // ── Global safety-net: RESOLVES with partial results, NEVER rejects ──
    const [psiResult, customResult] = await Promise.race([
      auditPromise,
      new Promise<[null, null]>((resolve) => {
        globalTimer = setTimeout(() => {
          console.warn(`[audit API] Global timeout (${GLOBAL_TIMEOUT / 1000}s) — returning partial results`)
          resolve([null, null])
        }, GLOBAL_TIMEOUT)
      }),
    ])

    clearTimeout(globalTimer)

    lighthouseResult = psiResult
    customAuditResult = customResult

    // ── If BOTH engines returned nothing, return error (but with helpful details) ──
    if (!lighthouseResult && !customAuditResult) {
      const message = psiError || customError || 'Both audit engines failed. The site may be unreachable or too complex.'
      console.error('[audit API] Both audits produced no data:', { psi: psiError, custom: customError })
      return NextResponse.json(
        {
          error: message,
          hint: 'Try switching between mobile/desktop, or try again in a moment. Google\'s API may be congested.',
        },
        { status: 502 }
      )
    }

    // Log partial failures (non-blocking)
    if (!lighthouseResult) {
      console.warn('[audit API] PSI unavailable, returning custom audit only:', psiError)
    }
    if (!customAuditResult) {
      console.warn('[audit API] Custom audit unavailable, returning PSI only:', customError)
    }

    // Calculate combined health score (handle partial results gracefully)
    const psiPerf = lighthouseResult?.scores?.performance ?? 0
    const customScore = customAuditResult?.overallScore ?? 0
    const healthScore = lighthouseResult && customAuditResult
      ? calculateHealthScore(psiPerf, customScore)
      : lighthouseResult ? psiPerf : customScore

    // ── Build VitalFix Intelligence Report ──
    // Runs in ~1-5ms — pure in-process computation, no I/O
    const intelligenceReport = buildIntelligenceReport({
      url: parsedUrl.href,
      psiData: lighthouseResult,
      customAudit: customAuditResult,
      html: auditHtml,
      headers: auditHeaders,
      hasFieldData: !!lighthouseResult?.fieldData,
    })

    const response = {
      ...(lighthouseResult || { url: parsedUrl.href, strategy, fetchedAt: new Date().toISOString(), scores: null, cwv: null, fieldData: null, opportunities: [], diagnostics: [] }),
      customAudit: customAuditResult || null,
      healthScore,
      fromCache: false,
      partial: !lighthouseResult || !customAuditResult,
      partialReason: !lighthouseResult ? (psiError || 'PSI unavailable') : !customAuditResult ? (customError || 'Custom audit unavailable') : undefined,
      // ── VitalFix Intelligence Layer ──
      intelligence: intelligenceReport,
      // ── Audit context: connection + location metadata ──
      auditContext: {
        connection: { id: connProfile.id, label: connProfile.label, throughputMbps: connProfile.throughputMbps, expectedRttMs: connProfile.expectedRttMs },
        location: { id: locProfile.id, label: locProfile.label, region: locProfile.region, ttfbAdjustMs: locProfile.ttfbAdjustMs },
      },
      // ── Regional performance insights ──
      regionalInsights: getRegionalInsights(
        { strategy, connection: connProfile, location: locProfile },
        lighthouseResult?.cwv?.ttfb?.numericValue
      ),
      // ── Connection-aware CWV severity ratings ──
      ...(lighthouseResult?.cwv ? {
        cwvRatings: {
          lcp: rateMetric('lcp', lighthouseResult.cwv.lcp.numericValue, { strategy, connection: connProfile, location: locProfile }),
          fcp: rateMetric('fcp', lighthouseResult.cwv.fcp?.numericValue || 0, { strategy, connection: connProfile, location: locProfile }),
          tbt: rateMetric('tbt', lighthouseResult.cwv.tbt.numericValue, { strategy, connection: connProfile, location: locProfile }),
          ttfb: rateMetric('ttfb', lighthouseResult.cwv.ttfb.numericValue, { strategy, connection: connProfile, location: locProfile }),
        },
      } : {}),
    }

    // Only cache complete results (both engines succeeded)
    if (lighthouseResult && customAuditResult) {
      setCache(key, response)
    }

    // ── Analytics: track success ──
    const latencyMs = Date.now() - auditStartTime
    trackAuditEvent('audit_success', ip, {
      url: parsedUrl.hostname, strategy, latency_ms: latencyMs,
      health_score: healthScore, partial: response.partial, cache_hit: false,
    }).catch(() => { })
    updateDailyCounters({
      successful: response.partial ? 0 : 1,
      partial: response.partial ? 1 : 0,
      avg_latency_ms: latencyMs,
    }).catch(() => { })

    // ── Increment daily audit counter for plan enforcement ──
    if (userId) {
      incrementAuditCount(userId).catch(() => { })
    }

    return NextResponse.json(response)
  } catch (err: any) {
    clearTimeout(globalTimer)

    // This catch should rarely fire now — but just in case
    if (err instanceof PSIError) {
      const clientStatus = err.status === 429 ? 429 : err.status >= 400 && err.status < 500 ? 400 : 502
      return NextResponse.json({ error: err.message }, { status: clientStatus })
    }

    console.error('[audit API] Unexpected error:', err)
    // ── Analytics: track failure ──
    const failLatency = Date.now() - auditStartTime
    trackAuditEvent('audit_fail', ip, {
      url: parsedUrl?.hostname, strategy, latency_ms: failLatency,
      error_type: err instanceof PSIError ? 'psi_error' : 'unexpected',
      error_message: err?.message?.slice(0, 200),
    }).catch(() => { })
    updateDailyCounters({ failed: 1, api_failures: 1 }).catch(() => { })

    return NextResponse.json(
      { error: err?.message || 'An unexpected error occurred. Please try again.' },
      { status: 502 }
    )
  }
}

