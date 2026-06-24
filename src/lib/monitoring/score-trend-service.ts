// ── Score Trend Service ──
// Reads historical audit snapshots and produces time-series data for charting.

import type { AuditSnapshot, ScoreTrendPoint } from './types'

/**
 * Build score trend points from a list of audit snapshots.
 * Snapshots should be in chronological order (oldest first).
 */
export function buildScoreTrend(snapshots: AuditSnapshot[]): ScoreTrendPoint[] {
  return snapshots.map(s => ({
    reportId: s.id,
    date: s.createdAt,
    overallScore: s.overallScore,
    categoryScores: Object.fromEntries(
      Object.entries(s.categoryScores || {}).map(([k, v]) => [k, v.score])
    ),
    cwv: s.cwv,
  }))
}

/**
 * Get the score direction (improving, declining, stable) from recent trend points.
 */
export function getScoreDirection(
  points: ScoreTrendPoint[],
  windowSize = 3
): 'improving' | 'declining' | 'stable' {
  if (points.length < 2) return 'stable'

  const recent = points.slice(-windowSize)
  if (recent.length < 2) return 'stable'

  const first = recent[0].overallScore
  const last = recent[recent.length - 1].overallScore
  const delta = last - first

  if (delta > 3) return 'improving'
  if (delta < -3) return 'declining'
  return 'stable'
}

/**
 * Compute a simple moving average for a metric.
 */
export function movingAverage(values: number[], window = 3): number[] {
  if (values.length < window) return values
  const result: number[] = []
  for (let i = 0; i <= values.length - window; i++) {
    const slice = values.slice(i, i + window)
    result.push(Math.round(slice.reduce((a, b) => a + b, 0) / slice.length))
  }
  return result
}
