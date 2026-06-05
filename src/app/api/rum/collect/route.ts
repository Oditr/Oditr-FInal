// ── VitalFix RUM — Collect Endpoint ──
// POST /api/rum/collect
//
// Receives beacon payloads from vf.js running on customer sites.
//
// Design:
//   - Lightweight and fast (target: <5ms p99)
//   - Validates payload structure but does NOT require authentication
//   - Returns 204 No Content on success (minimise bytes to client)
//   - Rate-limited by siteId to prevent abuse
//   - Stores events for later aggregation
//   - Dead-letter buffer for failed writes (logged, not lost)

import { NextRequest, NextResponse } from 'next/server'
import type { RumBeacon, RumEvent } from '@/lib/rum/types'

// ── In-memory rate limiter ──
// In production, replace with Redis or similar. This provides basic
// protection against beacon floods from misconfigured scripts.
const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000  // 1 minute
const RATE_LIMIT_MAX = 300           // max beacons per site per minute

// ── In-memory event buffer ──
// In production, this would write to Supabase/Postgres. For now,
// events are buffered in-memory with periodic flush logging.
const eventBuffer: RumEvent[] = []
const BUFFER_MAX = 10_000
const deadLetterLog: { beacon: RumBeacon; error: string; at: string }[] = []

// ── Validation ──

const VALID_METRICS = new Set(['LCP', 'CLS', 'INP', 'FCP', 'TTFB'])
const VALID_RATINGS = new Set(['good', 'needs-improvement', 'poor'])
const VALID_DEVICES = new Set(['mobile', 'desktop', 'tablet'])
const SITE_ID_RE = /^[a-zA-Z0-9_-]{3,64}$/

function validateBeacon(body: unknown): { valid: true; beacon: RumBeacon } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload: expected JSON object' }
  }

  const b = body as Record<string, unknown>

  // Required string fields
  if (typeof b.siteId !== 'string' || !SITE_ID_RE.test(b.siteId)) {
    return { valid: false, error: 'Invalid or missing siteId' }
  }
  if (typeof b.sessionId !== 'string' || b.sessionId.length < 4 || b.sessionId.length > 64) {
    return { valid: false, error: 'Invalid sessionId' }
  }
  if (typeof b.route !== 'string' || b.route.length > 2048) {
    return { valid: false, error: 'Invalid route' }
  }
  if (typeof b.url !== 'string' || b.url.length > 4096) {
    return { valid: false, error: 'Invalid url' }
  }
  if (typeof b.version !== 'string') {
    return { valid: false, error: 'Missing version' }
  }
  if (typeof b.collectedAt !== 'string') {
    return { valid: false, error: 'Missing collectedAt' }
  }

  // Metrics array
  if (!Array.isArray(b.metrics) || b.metrics.length === 0 || b.metrics.length > 10) {
    return { valid: false, error: 'Invalid metrics array (expected 1-10 entries)' }
  }
  for (const m of b.metrics) {
    if (!m || typeof m !== 'object') {
      return { valid: false, error: 'Invalid metric entry' }
    }
    if (!VALID_METRICS.has(m.name)) {
      return { valid: false, error: `Unknown metric: ${m.name}` }
    }
    if (typeof m.value !== 'number' || !isFinite(m.value) || m.value < 0) {
      return { valid: false, error: `Invalid value for ${m.name}` }
    }
    if (!VALID_RATINGS.has(m.rating)) {
      return { valid: false, error: `Invalid rating for ${m.name}` }
    }
  }

  // Device
  if (!b.device || typeof b.device !== 'object') {
    return { valid: false, error: 'Missing device info' }
  }
  const dev = b.device as Record<string, unknown>
  if (!VALID_DEVICES.has(dev.type as string)) {
    return { valid: false, error: 'Invalid device type' }
  }

  // Network
  if (!b.network || typeof b.network !== 'object') {
    return { valid: false, error: 'Missing network info' }
  }

  return { valid: true, beacon: b as unknown as RumBeacon }
}

// ── Rate limiter check ──

function checkRateLimit(siteId: string): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(siteId)

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(siteId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// ── Transform beacon → event ──

function beaconToEvent(beacon: RumBeacon): RumEvent {
  const findMetric = (name: string) => {
    const m = beacon.metrics.find(e => e.name === name)
    return m ? m.value : null
  }

  return {
    id: `${beacon.siteId}_${beacon.sessionId}_${Date.now()}`,
    siteId: beacon.siteId,
    sessionId: beacon.sessionId,
    route: beacon.route,
    lcpMs: findMetric('LCP'),
    clsScore: findMetric('CLS'),
    inpMs: findMetric('INP'),
    fcpMs: findMetric('FCP'),
    ttfbMs: findMetric('TTFB'),
    deviceType: beacon.device.type,
    connectionType: beacon.network.effectiveType,
    collectedAt: beacon.collectedAt,
    ingestedAt: new Date().toISOString(),
  }
}

// ── POST handler ──

export async function POST(req: NextRequest) {
  try {
    // Parse body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new NextResponse(null, { status: 400 })
    }

    // Validate
    const result = validateBeacon(body)
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { beacon } = result

    // Rate limit
    if (!checkRateLimit(beacon.siteId)) {
      return new NextResponse(null, { status: 429 })
    }

    // Transform and buffer
    try {
      const event = beaconToEvent(beacon)

      if (eventBuffer.length < BUFFER_MAX) {
        eventBuffer.push(event)
      } else {
        // Buffer full — log to dead letter
        deadLetterLog.push({
          beacon,
          error: 'Event buffer full',
          at: new Date().toISOString(),
        })
        // Keep dead letter log bounded
        if (deadLetterLog.length > 100) deadLetterLog.shift()

        console.warn(`[rum:collect] Event buffer full (${BUFFER_MAX}). Event dead-lettered for site ${beacon.siteId}`)
      }
    } catch (err) {
      // Write failure — dead letter, don't lose the data
      deadLetterLog.push({
        beacon,
        error: err instanceof Error ? err.message : 'Unknown write error',
        at: new Date().toISOString(),
      })
      console.error(`[rum:collect] Write error for site ${beacon.siteId}:`, err)
    }

    // Always return 204 — client doesn't need to retry on server-side issues
    return new NextResponse(null, { status: 204 })

  } catch (err) {
    console.error('[rum:collect] Unexpected error:', err)
    return new NextResponse(null, { status: 500 })
  }
}

// ── GET handler (diagnostics) ──
// Returns buffer stats for monitoring. In production, this would be
// behind an admin auth gate.

export async function GET() {
  return NextResponse.json({
    bufferSize: eventBuffer.length,
    bufferMax: BUFFER_MAX,
    deadLetterCount: deadLetterLog.length,
    rateLimiterEntries: rateLimiter.size,
  })
}
