// ── RUM Aggregation Service ──
// Queries raw RUM events and computes aggregates (p75, page-level summaries).

import { supabase } from '@/lib/supabase'
import type { RumMetricSummary, RumPageSummary, MetricName } from './types'

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * values.length) - 1
  return values[index]
}

export async function getProjectSummary(projectId: string, days = 7): Promise<RumMetricSummary[]> {
  if (!supabase) return []

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch all metrics for the time window
  // For MVP we pull and calculate in memory. 
  // In a real production system, this requires Postgres `percentile_cont` or a materialized view.
  const { data, error } = await supabase
    .from('rum_events')
    .select('metric_name, metric_value, metric_rating')
    .eq('project_id', projectId)
    .gte('timestamp', since.toISOString())

  if (error || !data) return []

  const metrics: MetricName[] = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB']
  const summaries: RumMetricSummary[] = []

  for (const metric of metrics) {
    const events = data.filter(e => e.metric_name === metric)
    const values = events.map(e => e.metric_value)
    
    summaries.push({
      metric,
      p75: percentile(values, 75),
      goodCount: events.filter(e => e.metric_rating === 'good').length,
      needsImprovementCount: events.filter(e => e.metric_rating === 'needs-improvement').length,
      poorCount: events.filter(e => e.metric_rating === 'poor').length,
      totalSamples: events.length
    })
  }

  return summaries
}

export async function getWorstPages(projectId: string, days = 7, limit = 10): Promise<RumPageSummary[]> {
  if (!supabase) return []

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch all events
  const { data, error } = await supabase
    .from('rum_events')
    .select('path, metric_name, metric_value')
    .eq('project_id', projectId)
    .gte('timestamp', since.toISOString())

  if (error || !data) return []

  // Group by path
  const pages = new Map<string, { lcp: number[], cls: number[], inp: number[] }>()

  for (const row of data) {
    if (!pages.has(row.path)) {
      pages.set(row.path, { lcp: [], cls: [], inp: [] })
    }
    const page = pages.get(row.path)!
    
    if (row.metric_name === 'LCP') page.lcp.push(row.metric_value)
    if (row.metric_name === 'CLS') page.cls.push(row.metric_value)
    if (row.metric_name === 'INP') page.inp.push(row.metric_value)
  }

  const results: RumPageSummary[] = []

  for (const [path, metrics] of Array.from(pages.entries())) {
    const totalSamples = Math.max(metrics.lcp.length, metrics.cls.length, metrics.inp.length)
    if (totalSamples < 5) continue // Skip pages with very low traffic

    const lcpP75 = percentile(metrics.lcp, 75)
    
    results.push({
      path,
      samples: totalSamples,
      lcpP75,
      clsP75: percentile(metrics.cls, 75),
      inpP75: percentile(metrics.inp, 75),
    })
  }

  // Sort by worst LCP for now
  results.sort((a, b) => (b.lcpP75 || 0) - (a.lcpP75 || 0))

  return results.slice(0, limit)
}
