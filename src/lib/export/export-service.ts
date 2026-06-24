// ── Export Service (Engine 16) ──
// Generates CSV and JSON exports for reports, projects, RUM data.

export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function arrayToCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(',')
  const dataLines = rows.map(row => row.map(escapeCsvField).join(','))
  return [headerLine, ...dataLines].join('\n')
}

// ── Export audit report issues as CSV ──
export function exportIssuesAsCsv(issues: any[]): string {
  const headers = ['Severity', 'Category', 'Title', 'Impact', 'Effort', 'Revenue Risk']
  const rows = issues.map(issue => [
    issue.severity || '',
    issue.category || '',
    issue.title || issue.description || '',
    issue.impact || '',
    issue.effort || '',
    issue.revenueRisk || '',
  ])
  return arrayToCsv(headers, rows)
}

// ── Export project scan history as CSV ──
export function exportScanHistoryAsCsv(history: any[]): string {
  const headers = ['Date', 'URL', 'Score', 'Performance', 'SEO', 'Accessibility', 'Critical Issues', 'High Issues']
  const rows = history.map(h => [
    h.created_at ? new Date(h.created_at).toISOString() : '',
    h.url || '',
    h.overall_score ?? '',
    h.performance_score ?? '',
    h.seo_score ?? '',
    h.accessibility_score ?? '',
    h.critical_issue_count ?? '',
    h.high_issue_count ?? '',
  ])
  return arrayToCsv(headers, rows)
}

// ── Export RUM summary as CSV ──
export function exportRumSummaryAsCsv(pages: any[]): string {
  const headers = ['Page', 'Sessions', 'LCP (ms)', 'INP (ms)', 'CLS', 'FCP (ms)', 'TTFB (ms)']
  const rows = pages.map(p => [
    p.path || p.page || '',
    p.sessionCount || p.session_count || '',
    p.lcp ?? '',
    p.inp ?? '',
    p.cls ?? '',
    p.fcp ?? '',
    p.ttfb ?? '',
  ])
  return arrayToCsv(headers, rows)
}

// ── Export agency client list as CSV ──
export function exportClientsAsCsv(clients: any[]): string {
  const headers = ['Name', 'Domain', 'Business Type', 'Projects', 'Created At']
  const rows = clients.map(c => [
    c.name || '',
    c.domain || '',
    c.business_type || '',
    c.project_count ?? '',
    c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '',
  ])
  return arrayToCsv(headers, rows)
}

// ── Export revenue impact as CSV ──
export function exportRevenueImpactAsCsv(issues: any[]): string {
  const headers = ['Title', 'Category', 'Severity', 'Estimated Revenue Risk', 'Confidence', 'Priority Score']
  const rows = issues.map(i => [
    i.title || '',
    i.category || '',
    i.severity || '',
    i.estimatedRevenueLoss ?? i.revenueRisk ?? '',
    i.confidence || '',
    i.priorityScore ?? '',
  ])
  return arrayToCsv(headers, rows)
}

// ── Sanitize filename ──
export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase().slice(0, 80)
}
