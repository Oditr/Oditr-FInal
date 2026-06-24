// ── Oditr RUM — Aggregator ──
// Computes percentile metrics, route breakdowns, and trends
// from raw rum_events data.
//
// Design:
//   - Pure functions operating on arrays of RumEvent
//   - No database dependency — aggregation is done in-process
//   - In production, swap to SQL percentile_cont queries for scale
//   - Used by /api/rum/summary to build RumSiteSummary

import type { RumEvent, RumMetricSummary, RumRouteSummary, RumSiteSummary, RumTrend } from './types'

// ═══════════════════════════════════════════════
// PERCENTILE CALCULATION
// ═══════════════════════════════════════════════

/** Compute a given percentile from a sorted numeric array */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)

  if (lower === upper) return sorted[lower]

  // Linear interpolation
  const frac = idx - lower
  return sorted[lower] + frac * (sorted[upper] - sorted[lower])
}

// ═══════════════════════════════════════════════
// METRIC RATING
// ═══════════════════════════════════════════════

type MetricName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'

const THRESHOLDS: Record<MetricName, [number, number]> = {
  LCP:  [2500, 4000],
  CLS:  [0.1, 0.25],
  INP:  [200, 500],
  FCP:  [1800, 3000],
  TTFB: [800, 1800],
}

function rateValue(metric: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const [good, poor] = THRESHOLDS[metric]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}

// ═══════════════════════════════════════════════
// METRIC SUMMARY BUILDER
// ═══════════════════════════════════════════════

/** Extract a single metric's values from events and produce a summary */
function buildMetricSummary(
  metric: MetricName,
  events: RumEvent[],
  extractor: (e: RumEvent) => number | null,
): RumMetricSummary | null {
  const values = events
    .map(extractor)
    .filter((v): v is number => v !== null && isFinite(v))

  if (values.length === 0) return null

  values.sort((a, b) => a - b)

  let good = 0, needsImprovement = 0, poor = 0
  for (const v of values) {
    const r = rateValue(metric, v)
    if (r === 'good') good++
    else if (r === 'needs-improvement') needsImprovement++
    else poor++
  }

  return {
    metric,
    p75: Math.round(percentile(values, 75) * 100) / 100,
    median: Math.round(percentile(values, 50) * 100) / 100,
    count: values.length,
    good,
    needsImprovement,
    poor,
  }
}

// ═══════════════════════════════════════════════
// METRIC EXTRACTORS
// ═══════════════════════════════════════════════

const METRIC_EXTRACTORS: { metric: MetricName; extract: (e: RumEvent) => number | null }[] = [
  { metric: 'LCP',  extract: e => e.lcpMs },
  { metric: 'CLS',  extract: e => e.clsScore },
  { metric: 'INP',  extract: e => e.inpMs },
  { metric: 'FCP',  extract: e => e.fcpMs },
  { metric: 'TTFB', extract: e => e.ttfbMs },
]

// ═══════════════════════════════════════════════
// AGGREGATE FUNCTIONS
// ═══════════════════════════════════════════════

/** Build metric summaries for a set of events */
export function aggregateMetrics(events: RumEvent[]): RumMetricSummary[] {
  const summaries: RumMetricSummary[] = []
  for (const { metric, extract } of METRIC_EXTRACTORS) {
    const summary = buildMetricSummary(metric, events, extract)
    if (summary) summaries.push(summary)
  }
  return summaries
}

/** Build per-route breakdowns */
export function aggregateByRoute(events: RumEvent[], maxRoutes = 20): RumRouteSummary[] {
  // Group events by route
  const routeMap = new Map<string, RumEvent[]>()
  for (const event of events) {
    const route = event.route || '/'
    const existing = routeMap.get(route)
    if (existing) existing.push(event)
    else routeMap.set(route, [event])
  }

  // Build summaries, sorted by page view count
  const routeSummaries: RumRouteSummary[] = []
  routeMap.forEach((routeEvents, route) => {
    routeSummaries.push({
      route,
      pageViews: routeEvents.length,
      metrics: aggregateMetrics(routeEvents),
    })
  })

  routeSummaries.sort((a, b) => b.pageViews - a.pageViews)
  return routeSummaries.slice(0, maxRoutes)
}

/** Calculate trends by comparing two halves of a time period */
export function calculateTrends(events: RumEvent[]): Record<string, RumTrend> {
  if (events.length < 10) {
    // Not enough data for meaningful trends
    return {}
  }

  // Sort by collected_at
  const sorted = [...events].sort((a, b) =>
    new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
  )

  const midpoint = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, midpoint)
  const secondHalf = sorted.slice(midpoint)

  const firstMetrics = aggregateMetrics(firstHalf)
  const secondMetrics = aggregateMetrics(secondHalf)

  const trends: Record<string, RumTrend> = {}
  for (const second of secondMetrics) {
    const first = firstMetrics.find(m => m.metric === second.metric)
    if (!first) continue

    const delta = second.p75 - first.p75
    const threshold = first.p75 * 0.05 // 5% change threshold

    // For CWV, lower is better (except CLS which is unitless but still lower = better)
    if (delta < -threshold) trends[second.metric] = 'improving'
    else if (delta > threshold) trends[second.metric] = 'degrading'
    else trends[second.metric] = 'stable'
  }

  return trends
}

/** Count unique sessions */
export function countUniqueSessions(events: RumEvent[]): number {
  const sessions = new Set<string>()
  for (const event of events) {
    sessions.add(event.sessionId)
  }
  return sessions.size
}

// ═══════════════════════════════════════════════
// FULL SITE SUMMARY
// ═══════════════════════════════════════════════

/** Build a complete site summary from raw events */
export function buildSiteSummary(
  siteId: string,
  events: RumEvent[],
  period: '7d' | '28d' = '28d',
): RumSiteSummary {
  return {
    siteId,
    period,
    metrics: aggregateMetrics(events),
    routes: aggregateByRoute(events),
    trends: calculateTrends(events),
    totalSessions: countUniqueSessions(events),
    totalPageViews: events.length,
    updatedAt: new Date().toISOString(),
  }
}
