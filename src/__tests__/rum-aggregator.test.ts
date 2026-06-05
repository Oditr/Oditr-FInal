// ── RUM Aggregator Tests ──
// Tests percentile calculation, metric aggregation, route breakdowns, and trend detection

import { describe, it, expect } from 'vitest'
import {
  aggregateMetrics,
  aggregateByRoute,
  calculateTrends,
  countUniqueSessions,
  buildSiteSummary,
} from '@/lib/rum/aggregator'
import type { RumEvent } from '@/lib/rum/types'

// ── Helpers ──

function makeEvent(overrides: Partial<RumEvent> = {}): RumEvent {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    siteId: 'test-site',
    sessionId: `session_${Math.random().toString(36).slice(2)}`,
    route: '/',
    lcpMs: 2500,
    clsScore: 0.05,
    inpMs: 180,
    fcpMs: 1200,
    ttfbMs: 400,
    deviceType: 'mobile',
    connectionType: '4g',
    collectedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeEvents(count: number, overrides: Partial<RumEvent> = {}): RumEvent[] {
  return Array.from({ length: count }, () => makeEvent(overrides))
}

// ──────────────────────────────────────────────
describe('RUM Aggregator — aggregateMetrics', () => {
  it('produces summaries for all 5 CWV metrics', () => {
    const events = makeEvents(20)
    const summaries = aggregateMetrics(events)

    expect(summaries).toHaveLength(5)
    const names = summaries.map(s => s.metric)
    expect(names).toContain('LCP')
    expect(names).toContain('CLS')
    expect(names).toContain('INP')
    expect(names).toContain('FCP')
    expect(names).toContain('TTFB')
  })

  it('computes correct p75 for uniform data', () => {
    const events = makeEvents(100, { lcpMs: 2000 })
    const summaries = aggregateMetrics(events)
    const lcp = summaries.find(s => s.metric === 'LCP')!

    expect(lcp.p75).toBe(2000)
    expect(lcp.median).toBe(2000)
    expect(lcp.count).toBe(100)
  })

  it('classifies ratings based on CWV thresholds', () => {
    const events = [
      makeEvent({ lcpMs: 1000 }), // good
      makeEvent({ lcpMs: 2000 }), // good
      makeEvent({ lcpMs: 3000 }), // needs-improvement
      makeEvent({ lcpMs: 5000 }), // poor
    ]
    const summaries = aggregateMetrics(events)
    const lcp = summaries.find(s => s.metric === 'LCP')!

    expect(lcp.good).toBe(2)
    expect(lcp.needsImprovement).toBe(1)
    expect(lcp.poor).toBe(1)
  })

  it('skips metrics with all null values', () => {
    const events = makeEvents(10, { inpMs: null })
    const summaries = aggregateMetrics(events)
    const inp = summaries.find(s => s.metric === 'INP')

    expect(inp).toBeUndefined()
  })

  it('handles empty events array', () => {
    const summaries = aggregateMetrics([])
    expect(summaries).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────
describe('RUM Aggregator — aggregateByRoute', () => {
  it('groups events by route', () => {
    const events = [
      ...makeEvents(5, { route: '/' }),
      ...makeEvents(3, { route: '/about' }),
      ...makeEvents(2, { route: '/pricing' }),
    ]
    const routes = aggregateByRoute(events)

    expect(routes).toHaveLength(3)
    expect(routes[0].route).toBe('/')
    expect(routes[0].pageViews).toBe(5)
    expect(routes[1].route).toBe('/about')
    expect(routes[1].pageViews).toBe(3)
  })

  it('limits to maxRoutes', () => {
    const events: RumEvent[] = []
    for (let i = 0; i < 30; i++) {
      events.push(makeEvent({ route: `/page-${i}` }))
    }
    const routes = aggregateByRoute(events, 5)

    expect(routes).toHaveLength(5)
  })

  it('includes per-route metrics', () => {
    const events = makeEvents(10, { route: '/blog' })
    const routes = aggregateByRoute(events)

    expect(routes[0].metrics.length).toBeGreaterThan(0)
    expect(routes[0].metrics[0].count).toBe(10)
  })
})

// ──────────────────────────────────────────────
describe('RUM Aggregator — calculateTrends', () => {
  it('detects improving trend when p75 decreases', () => {
    const now = Date.now()
    const events: RumEvent[] = []

    // First half: slow LCP
    for (let i = 0; i < 10; i++) {
      events.push(makeEvent({
        lcpMs: 4000,
        collectedAt: new Date(now - 7 * 86400000 + i * 1000).toISOString(),
      }))
    }
    // Second half: fast LCP
    for (let i = 0; i < 10; i++) {
      events.push(makeEvent({
        lcpMs: 2000,
        collectedAt: new Date(now + i * 1000).toISOString(),
      }))
    }

    const trends = calculateTrends(events)
    expect(trends.LCP).toBe('improving')
  })

  it('detects degrading trend when p75 increases', () => {
    const now = Date.now()
    const events: RumEvent[] = []

    // First half: fast LCP
    for (let i = 0; i < 10; i++) {
      events.push(makeEvent({
        lcpMs: 1500,
        collectedAt: new Date(now - 7 * 86400000 + i * 1000).toISOString(),
      }))
    }
    // Second half: slow LCP
    for (let i = 0; i < 10; i++) {
      events.push(makeEvent({
        lcpMs: 4500,
        collectedAt: new Date(now + i * 1000).toISOString(),
      }))
    }

    const trends = calculateTrends(events)
    expect(trends.LCP).toBe('degrading')
  })

  it('returns stable for minimal change', () => {
    const now = Date.now()
    const events: RumEvent[] = []
    for (let i = 0; i < 20; i++) {
      events.push(makeEvent({
        lcpMs: 2500 + (Math.random() * 50 - 25), // ±25ms jitter
        collectedAt: new Date(now + i * 1000).toISOString(),
      }))
    }

    const trends = calculateTrends(events)
    expect(trends.LCP).toBe('stable')
  })

  it('returns empty for insufficient data', () => {
    const events = makeEvents(5)
    const trends = calculateTrends(events)
    expect(Object.keys(trends)).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────
describe('RUM Aggregator — countUniqueSessions', () => {
  it('counts unique session IDs', () => {
    const events = [
      makeEvent({ sessionId: 'a' }),
      makeEvent({ sessionId: 'b' }),
      makeEvent({ sessionId: 'a' }),
      makeEvent({ sessionId: 'c' }),
    ]
    expect(countUniqueSessions(events)).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(countUniqueSessions([])).toBe(0)
  })
})

// ──────────────────────────────────────────────
describe('RUM Aggregator — buildSiteSummary', () => {
  it('builds complete summary with all fields', () => {
    const events = makeEvents(50)
    const summary = buildSiteSummary('my-site', events, '28d')

    expect(summary.siteId).toBe('my-site')
    expect(summary.period).toBe('28d')
    expect(summary.metrics.length).toBeGreaterThan(0)
    expect(summary.routes.length).toBeGreaterThan(0)
    expect(summary.totalPageViews).toBe(50)
    expect(summary.totalSessions).toBeGreaterThan(0)
    expect(summary.updatedAt).toBeTruthy()
  })

  it('handles empty events gracefully', () => {
    const summary = buildSiteSummary('empty-site', [], '7d')

    expect(summary.siteId).toBe('empty-site')
    expect(summary.period).toBe('7d')
    expect(summary.metrics).toHaveLength(0)
    expect(summary.routes).toHaveLength(0)
    expect(summary.totalSessions).toBe(0)
    expect(summary.totalPageViews).toBe(0)
  })
})
