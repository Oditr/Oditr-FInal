// ── RUM Engine Types & Thresholds ──

export type MetricRating = 'good' | 'needs-improvement' | 'poor'
export type MetricName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'

export interface RumEventPayload {
  projectId: string
  pageviewId: string
  sessionId: string
  url: string
  metricName: MetricName
  metricValue: number
  metricRating: MetricRating
  deviceType?: 'mobile' | 'tablet' | 'desktop'
  browser?: string
  os?: string
  viewportWidth?: number
  viewportHeight?: number
  connectionType?: string
  navigationType?: string
  timestamp: number
}

export interface RumEventRow {
  id?: string
  project_id: string
  pageview_id: string
  session_id: string
  url: string
  path: string
  hostname: string
  metric_name: string
  metric_value: number
  metric_rating: string
  device_type: string | null
  browser: string | null
  os: string | null
  viewport_width: number | null
  viewport_height: number | null
  connection_type: string | null
  navigation_type: string | null
  timestamp: string
}

export interface RumProjectConfig {
  projectId: string
  enabled: boolean
  allowedDomains: string[]
  sampleRate: number
  retentionDays: number
}

export interface RumMetricSummary {
  metric: MetricName
  p75: number | null
  goodCount: number
  needsImprovementCount: number
  poorCount: number
  totalSamples: number
}

export interface RumPageSummary {
  path: string
  samples: number
  lcpP75: number | null
  clsP75: number | null
  inpP75: number | null
}

// ── Thresholds ──
// Adhering to standard web.dev Web Vitals thresholds

export const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
}

export function rateMetricValue(metric: MetricName, value: number): MetricRating {
  const t = THRESHOLDS[metric]
  if (!t) return 'good' // fallback

  if (value <= t.good) return 'good'
  if (value > t.poor) return 'poor'
  return 'needs-improvement'
}
