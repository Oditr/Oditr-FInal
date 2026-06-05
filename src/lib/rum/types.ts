// ── VitalFix RUM — Type Definitions ──
// Shared types for the Real User Monitoring system:
//   vf.js (client script) → /api/rum/collect (ingest) → aggregator (analysis)

// ═══════════════════════════════════════════════
// BEACON PAYLOAD — what vf.js sends to the server
// ═══════════════════════════════════════════════

/** A single CWV metric measurement from a real user session */
export interface RumMetricEntry {
  /** Metric name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB' */
  name: string
  /** Metric value (ms for timing metrics, unitless for CLS) */
  value: number
  /** Rating based on Google's thresholds: 'good' | 'needs-improvement' | 'poor' */
  rating: 'good' | 'needs-improvement' | 'poor'
  /** Navigation type: 'navigate' | 'reload' | 'back-forward' | 'prerender' */
  navigationType?: string
}

/** The beacon payload sent by vf.js to /api/rum/collect */
export interface RumBeacon {
  /** Site ID provided during script installation */
  siteId: string
  /** Anonymous session identifier (generated per page load, no PII) */
  sessionId: string
  /** Current page route / pathname */
  route: string
  /** Page URL (full, for debugging — stripped of query params on server) */
  url: string
  /** Collected metrics */
  metrics: RumMetricEntry[]
  /** Device classification */
  device: {
    type: 'mobile' | 'desktop' | 'tablet'
    /** Logical CPU cores (navigator.hardwareConcurrency) */
    cores?: number
    /** Device memory in GB (navigator.deviceMemory) */
    memory?: number
  }
  /** Network information */
  network: {
    /** Effective connection type: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown' */
    effectiveType: string
    /** Downlink speed in Mbps */
    downlink?: number
    /** Round-trip time in ms */
    rtt?: number
  }
  /** Script version */
  version: string
  /** Timestamp of collection (ISO string) */
  collectedAt: string
}

// ═══════════════════════════════════════════════
// STORED EVENT — what gets written to the database
// ═══════════════════════════════════════════════

/** A single stored RUM event (one row per beacon) */
export interface RumEvent {
  id: string
  siteId: string
  sessionId: string
  route: string
  /** Individual metric values (nullable — not every beacon has all metrics) */
  lcpMs: number | null
  clsScore: number | null
  inpMs: number | null
  fcpMs: number | null
  ttfbMs: number | null
  /** Device metadata */
  deviceType: string
  /** Network metadata */
  connectionType: string
  /** When the event was collected by the client */
  collectedAt: string
  /** When the event was ingested by the server */
  ingestedAt: string
}

// ═══════════════════════════════════════════════
// AGGREGATED SUMMARY — what /api/rum/summary returns
// ═══════════════════════════════════════════════

/** Aggregated metric summary for a time window */
export interface RumMetricSummary {
  metric: string
  /** 75th percentile value */
  p75: number
  /** Median (50th percentile) */
  median: number
  /** Number of samples */
  count: number
  /** Distribution across ratings */
  good: number
  needsImprovement: number
  poor: number
}

/** Trend classification for a metric */
export type RumTrend = 'improving' | 'stable' | 'degrading'

/** Route-level performance breakdown */
export interface RumRouteSummary {
  route: string
  /** Number of page views */
  pageViews: number
  /** Per-metric summaries */
  metrics: RumMetricSummary[]
}

/** Full RUM summary for a site */
export interface RumSiteSummary {
  siteId: string
  /** Time window for this summary */
  period: '7d' | '28d'
  /** Overall metric summaries */
  metrics: RumMetricSummary[]
  /** Per-route breakdown (top routes) */
  routes: RumRouteSummary[]
  /** Trend for each metric */
  trends: Record<string, RumTrend>
  /** Total unique sessions in the period */
  totalSessions: number
  /** Total page views */
  totalPageViews: number
  /** Last updated timestamp */
  updatedAt: string
}
