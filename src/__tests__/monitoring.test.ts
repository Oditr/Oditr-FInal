import { describe, it, expect } from 'vitest'
import { diffIssues } from '../lib/monitoring/issue-diff-service'
import { diffVitals, hasAnyCriticalVitalRegression } from '../lib/monitoring/vitals-diff-service'
import { getScoreDirection } from '../lib/monitoring/score-trend-service'
import type { IssueSnapshot, CwvSnapshot } from '../lib/monitoring/types'

describe('Monitoring Engine - Issue Diff Service', () => {
  const prevIssues: IssueSnapshot[] = [
    { id: '1', title: 'Missing alt text', description: 'desc', category: 'accessibility', severity: 'medium', affectedUrl: '/' },
    { id: '2', title: 'Broken Link', description: 'desc', category: 'links', severity: 'high', affectedUrl: '/about' },
  ]

  const currIssues: IssueSnapshot[] = [
    { id: '1b', title: 'Missing alt text', description: 'desc', category: 'accessibility', severity: 'high', affectedUrl: '/' }, // Worsened
    { id: '3', title: 'Server Error 500', description: 'desc', category: 'links', severity: 'critical', affectedUrl: '/contact' }, // New
    // Broken link resolved
  ]

  it('detects new, resolved, and worsened issues', () => {
    const result = diffIssues(prevIssues, currIssues)
    
    expect(result.resolvedIssues).toHaveLength(1)
    expect(result.resolvedIssues[0].title).toBe('Broken Link')

    expect(result.newIssues).toHaveLength(1)
    expect(result.newIssues[0].title).toBe('Server Error 500')
    expect(result.newCriticalCount).toBe(1)

    expect(result.worsenedIssues).toHaveLength(1)
    expect(result.worsenedIssues[0].issue.title).toBe('Missing alt text')
    expect(result.worsenedIssues[0].previousSeverity).toBe('medium')
    expect(result.worsenedIssues[0].currentSeverity).toBe('high')
  })
})

describe('Monitoring Engine - Vitals Diff Service', () => {
  const prev: CwvSnapshot = { lcp: 2000, cls: 0.05, inp: 100, fcp: 1500, tbt: 50, si: 3000, ttfb: 400 }
  const curr: CwvSnapshot = { lcp: 2050, cls: 0.30, inp: 550, fcp: 1000, tbt: 50, si: 3000, ttfb: 400 }

  it('classifies vitals deltas correctly', () => {
    const deltas = diffVitals(prev, curr)
    
    const lcp = deltas.find(d => d.metric === 'lcp')
    expect(lcp?.status).toBe('unchanged') // +50ms is within noise threshold (100)

    const cls = deltas.find(d => d.metric === 'cls')
    expect(cls?.status).toBe('critical') // Jumped from 0.05 to 0.30 (crossed 0.25 poor threshold)

    const inp = deltas.find(d => d.metric === 'inp')
    expect(inp?.status).toBe('critical') // Jumped from 100 to 550 (crossed 500 poor threshold)

    const fcp = deltas.find(d => d.metric === 'fcp')
    expect(fcp?.status).toBe('improved') // -500ms
  })

  it('detects critical vital regression', () => {
    const deltas = diffVitals(prev, curr)
    expect(hasAnyCriticalVitalRegression(deltas)).toBe(true)
  })
})

describe('Monitoring Engine - Score Trend Service', () => {
  it('identifies score direction', () => {
    expect(getScoreDirection([{ overallScore: 80 } as any, { overallScore: 85 } as any])).toBe('improving')
    expect(getScoreDirection([{ overallScore: 90 } as any, { overallScore: 85 } as any])).toBe('declining')
    expect(getScoreDirection([{ overallScore: 80 } as any, { overallScore: 81 } as any])).toBe('stable')
  })
})
