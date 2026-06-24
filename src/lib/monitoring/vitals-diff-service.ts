// ── Core Web Vitals Diff Service ──
// Computes deltas for CWV metrics and classifies each change.

import type { CwvSnapshot, VitalDelta, VitalChangeStatus } from './types'

// Thresholds for "critical worsening" per metric
const CRITICAL_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  lcp: { good: 2500, poor: 4000 },    // ms
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },      // ms
  fcp: { good: 1800, poor: 3000 },    // ms
  tbt: { good: 200, poor: 600 },      // ms
  si:  { good: 3400, poor: 5800 },    // ms
  ttfb: { good: 800, poor: 1800 },    // ms
}

const METRIC_LABELS: Record<string, string> = {
  lcp: 'Largest Contentful Paint',
  cls: 'Cumulative Layout Shift',
  inp: 'Interaction to Next Paint',
  fcp: 'First Contentful Paint',
  tbt: 'Total Blocking Time',
  si: 'Speed Index',
  ttfb: 'Time to First Byte',
}

const METRIC_UNITS: Record<string, string> = {
  lcp: 'ms', cls: '', inp: 'ms', fcp: 'ms', tbt: 'ms', si: 'ms', ttfb: 'ms',
}

// How much change is considered "unchanged" (noise threshold)
const NOISE_THRESHOLDS: Record<string, number> = {
  lcp: 100,  // ±100ms
  cls: 0.01, // ±0.01
  inp: 20,   // ±20ms
  fcp: 50,   // ±50ms
  tbt: 30,   // ±30ms
  si: 100,   // ±100ms
  ttfb: 50,  // ±50ms
}

function classifyChange(
  metric: string,
  prev: number | null,
  curr: number | null
): VitalChangeStatus {
  if (prev === null || curr === null) return 'unchanged'

  const delta = curr - prev
  const noise = NOISE_THRESHOLDS[metric] || 50
  const threshold = CRITICAL_THRESHOLDS[metric]

  // Within noise range
  if (Math.abs(delta) <= noise) return 'unchanged'

  // CLS: lower is better (same as all others for our deltas)
  // For all metrics: higher value = worse (except we need to check if it crossed into "poor")
  if (delta > 0) {
    // Worsened — check if it crossed into "poor" territory
    if (threshold && curr > threshold.poor && prev <= threshold.poor) {
      return 'critical'
    }
    return 'worsened'
  }

  // delta < 0 means improvement
  return 'improved'
}

/**
 * Diff two CWV snapshots.
 * Returns an array of VitalDelta entries for each metric.
 */
export function diffVitals(
  previous: CwvSnapshot | null,
  current: CwvSnapshot | null
): VitalDelta[] {
  const metrics = ['lcp', 'cls', 'inp', 'fcp', 'tbt', 'si', 'ttfb'] as const
  const deltas: VitalDelta[] = []

  for (const metric of metrics) {
    const prev = previous?.[metric] ?? null
    const curr = current?.[metric] ?? null
    const delta = (prev !== null && curr !== null) ? curr - prev : null

    deltas.push({
      metric,
      label: METRIC_LABELS[metric] || metric.toUpperCase(),
      previousValue: prev,
      currentValue: curr,
      delta,
      unit: METRIC_UNITS[metric] || '',
      status: classifyChange(metric, prev, curr),
    })
  }

  return deltas
}

/**
 * Check if any vital crossed from good → poor (a serious regression signal).
 */
export function hasAnyCriticalVitalRegression(deltas: VitalDelta[]): boolean {
  return deltas.some(d => d.status === 'critical')
}

/**
 * Format a vital value for display (e.g. "2.4s", "0.12").
 */
export function formatVitalValue(value: number | null, metric: string): string {
  if (value === null) return '—'
  if (metric === 'cls') return value.toFixed(2)
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}
