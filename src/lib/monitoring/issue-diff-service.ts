// ── Issue Diff Service ──
// Matches issues between two audit snapshots using fuzzy matching
// and classifies each as new / existing / resolved / worsened / improved.

import type { IssueSnapshot, IssueDiff, IssueDiffStatus } from './types'

/**
 * Generate a fingerprint for fuzzy-matching issues across scans.
 * Issues may have different IDs between scans, so we match by:
 * - Category + title (lowercased, trimmed)
 * - Affected URL (normalized)
 */
function issueFingerprint(issue: IssueSnapshot): string {
  const cat = (issue.category || '').toLowerCase().trim()
  const title = (issue.title || '').toLowerCase().trim()
  const url = normalizeAffectedUrl(issue.affectedUrl || '')
  return `${cat}::${title}::${url}`
}

function normalizeAffectedUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '')
  } catch {
    return url.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '')
  }
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 5, high: 4, medium: 3, low: 2, info: 1,
}

function severityRank(s: string): number {
  return SEVERITY_ORDER[s] || 0
}

/**
 * Diff two lists of issues.
 * Returns a unified list of IssueDiff entries.
 */
export function diffIssues(
  previousIssues: IssueSnapshot[],
  currentIssues: IssueSnapshot[]
): {
  diffs: IssueDiff[]
  newIssues: IssueSnapshot[]
  resolvedIssues: IssueSnapshot[]
  worsenedIssues: IssueDiff[]
  improvedIssues: IssueDiff[]
  existingIssues: IssueDiff[]
  newCriticalCount: number
  newHighCount: number
  resolvedCriticalCount: number
  resolvedHighCount: number
} {
  // Build fingerprint maps
  const prevMap = new Map<string, IssueSnapshot>()
  for (const issue of previousIssues) {
    prevMap.set(issueFingerprint(issue), issue)
  }

  const currMap = new Map<string, IssueSnapshot>()
  for (const issue of currentIssues) {
    currMap.set(issueFingerprint(issue), issue)
  }

  const diffs: IssueDiff[] = []
  const newIssues: IssueSnapshot[] = []
  const resolvedIssues: IssueSnapshot[] = []
  const worsenedIssues: IssueDiff[] = []
  const improvedIssues: IssueDiff[] = []
  const existingIssues: IssueDiff[] = []

  // Check current issues against previous
  for (const [fp, current] of currMap.entries()) {
    const previous = prevMap.get(fp)

    if (!previous) {
      // New issue
      const diff: IssueDiff = { issue: current, status: 'new', currentSeverity: current.severity }
      diffs.push(diff)
      newIssues.push(current)
    } else {
      // Issue exists in both — check if severity changed
      const prevRank = severityRank(previous.severity)
      const currRank = severityRank(current.severity)

      let status: IssueDiffStatus = 'existing'
      if (currRank > prevRank) status = 'worsened'
      else if (currRank < prevRank) status = 'improved'

      const diff: IssueDiff = {
        issue: current,
        status,
        previousSeverity: previous.severity,
        currentSeverity: current.severity,
      }
      diffs.push(diff)

      if (status === 'worsened') worsenedIssues.push(diff)
      else if (status === 'improved') improvedIssues.push(diff)
      else existingIssues.push(diff)
    }
  }

  // Check for resolved issues (in previous but not in current)
  for (const [fp, previous] of prevMap.entries()) {
    if (!currMap.has(fp)) {
      const diff: IssueDiff = { issue: previous, status: 'resolved', previousSeverity: previous.severity }
      diffs.push(diff)
      resolvedIssues.push(previous)
    }
  }

  // Count critical/high changes
  const newCriticalCount = newIssues.filter(i => i.severity === 'critical').length
  const newHighCount = newIssues.filter(i => i.severity === 'high').length
  const resolvedCriticalCount = resolvedIssues.filter(i => i.severity === 'critical').length
  const resolvedHighCount = resolvedIssues.filter(i => i.severity === 'high').length

  return {
    diffs,
    newIssues,
    resolvedIssues,
    worsenedIssues,
    improvedIssues,
    existingIssues,
    newCriticalCount,
    newHighCount,
    resolvedCriticalCount,
    resolvedHighCount,
  }
}
