import type { StoredScan } from '@/lib/scan-store'

export interface RegressionDetail {
  type: 'score_drop' | 'cwv_degradation' | 'new_issue'
  title: string
  description: string
  severity: 'critical' | 'moderate'
}

export interface RegressionReport {
  hasRegression: boolean
  details: RegressionDetail[]
}

/**
 * Compare the current scan with the previous scan to detect performance regressions.
 */
export function detectRegressions(current: StoredScan, previous: StoredScan | null): RegressionReport {
  const details: RegressionDetail[] = []

  if (!previous) {
    return { hasRegression: false, details }
  }

  // 1. Health Score Drop (> 5 pts is considered a regression)
  if (previous.healthScore - current.healthScore > 5) {
    details.push({
      type: 'score_drop',
      title: 'Health Score Dropped',
      description: `Score decreased from ${previous.healthScore} to ${current.healthScore} (${current.healthScore - previous.healthScore} pts).`,
      severity: previous.healthScore - current.healthScore > 10 ? 'critical' : 'moderate',
    })
  }

  // 2. CWV Degradations
  if (current.cwvSummary && previous.cwvSummary) {
    const checkCwv = (metric: keyof NonNullable<StoredScan['cwvSummary']>, label: string) => {
      const currValStr = current.cwvSummary![metric]
      const prevValStr = previous.cwvSummary![metric]
      
      // Basic parse logic (assuming format like "1.2 s" or "300 ms")
      const parseVal = (str: string) => {
        const num = parseFloat(str)
        if (str.includes('s') && !str.includes('ms')) return num * 1000
        return num
      }

      const currMs = parseVal(currValStr)
      const prevMs = parseVal(prevValStr)

      // If metric got worse by 15% and at least 100ms
      if (currMs > prevMs * 1.15 && currMs - prevMs > 100) {
        details.push({
          type: 'cwv_degradation',
          title: `${label} Degraded`,
          description: `${label} slowed down from ${prevValStr} to ${currValStr}.`,
          severity: 'moderate',
        })
      }
    }

    checkCwv('lcp', 'LCP')
    checkCwv('inp', 'INP')
    checkCwv('cls', 'CLS')
  }

  // 3. New Critical Issues
  if (current.intelligenceSnapshot?.fixFirst && previous.intelligenceSnapshot?.fixFirst) {
    const prevIds = new Set(previous.intelligenceSnapshot.fixFirst.map((i: any) => i.id))
    const newIssues = current.intelligenceSnapshot.fixFirst.filter((i: any) => !prevIds.has(i.id))

    for (const issue of newIssues) {
      details.push({
        type: 'new_issue',
        title: 'New Critical Issue',
        description: issue.title,
        severity: 'critical',
      })
    }
  }

  return {
    hasRegression: details.length > 0,
    details,
  }
}
