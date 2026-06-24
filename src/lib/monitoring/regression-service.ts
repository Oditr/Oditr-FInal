// ── Regression Detection Service ──
// Orchestrates issue diff + vitals diff + score comparison.
// Classifies overall regression severity and generates natural-language summary.

import type {
  AuditSnapshot, RegressionReport, RegressionSeverity,
  ScoreDelta, AlertPayload,
} from './types'
import { diffIssues } from './issue-diff-service'
import { diffVitals, hasAnyCriticalVitalRegression } from './vitals-diff-service'
import { buildAlertPayload } from './alert-service'

function generateId(): string {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Compare two audit snapshots and produce a RegressionReport.
 */
export function detectRegression(
  previous: AuditSnapshot,
  current: AuditSnapshot
): RegressionReport {
  const now = new Date().toISOString()

  // ── Score deltas ──
  const overallDelta = current.overallScore - previous.overallScore
  const categoryDeltas = computeCategoryDeltas(previous, current)

  // ── Issue diff ──
  const issueDiffResult = diffIssues(previous.issues, current.issues)

  // ── Vitals diff ──
  const vitalsDeltas = diffVitals(previous.cwv, current.cwv)

  // ── Revenue risk delta ──
  const prevRevRisk = previous.revenueImpactSummary?.totalEstimatedRisk ?? null
  const currRevRisk = current.revenueImpactSummary?.totalEstimatedRisk ?? null
  const revenueRiskDelta = (prevRevRisk !== null && currRevRisk !== null)
    ? currRevRisk - prevRevRisk : null

  // ── AI readiness delta ──
  const prevAiScore = previous.aiReadinessSummary?.score ?? null
  const currAiScore = current.aiReadinessSummary?.score ?? null
  const aiReadinessDelta = (prevAiScore !== null && currAiScore !== null)
    ? currAiScore - prevAiScore : null

  // ── Classify regression severity ──
  const severity = classifyRegressionSeverity({
    overallDelta,
    categoryDeltas,
    newCriticalCount: issueDiffResult.newCriticalCount,
    newHighCount: issueDiffResult.newHighCount,
    hasCriticalVitalRegression: hasAnyCriticalVitalRegression(vitalsDeltas),
    revenueRiskDelta,
    aiReadinessDelta,
    currentScore: current.overallScore,
  })

  // ── Generate summary and recommended actions ──
  const { summary, recommendedActions } = generateSummary({
    overallDelta,
    previousScore: previous.overallScore,
    currentScore: current.overallScore,
    severity,
    issueDiffResult,
    vitalsDeltas,
    revenueRiskDelta,
    aiReadinessDelta,
    current,
  })

  // ── Build alert payload if regression is significant ──
  let alertPayload: AlertPayload | null = null
  if (severity === 'critical_regression' || severity === 'high_regression') {
    alertPayload = buildAlertPayload({
      projectId: current.projectId,
      reportId: current.id,
      url: current.url,
      severity,
      summary,
      scoreDelta: overallDelta,
      criticalIssueCount: issueDiffResult.newCriticalCount,
      highIssueCount: issueDiffResult.newHighCount,
      revenueRiskDelta,
      topAffectedPage: current.revenueImpactSummary?.topAffectedPage,
      recommendedAction: recommendedActions[0] || 'Review the latest audit results.',
    })
  }

  return {
    id: generateId(),
    projectId: current.projectId,
    previousReportId: previous.id,
    currentReportId: current.id,
    overallScoreDelta: overallDelta,
    previousScore: previous.overallScore,
    currentScore: current.overallScore,
    categoryScoreDeltas: categoryDeltas,
    vitalsDeltas,
    revenueRiskDelta,
    aiReadinessDelta,
    newIssues: issueDiffResult.newIssues,
    resolvedIssues: issueDiffResult.resolvedIssues,
    worsenedIssues: issueDiffResult.worsenedIssues,
    improvedIssues: issueDiffResult.improvedIssues,
    severity,
    summary,
    recommendedActions,
    confidence: current.scanStatus === 'partial' ? 'low' : 'medium',
    alertPayload,
    createdAt: now,
  }
}

// ── Category Score Deltas ──

function computeCategoryDeltas(prev: AuditSnapshot, curr: AuditSnapshot): ScoreDelta[] {
  const deltas: ScoreDelta[] = []
  const allCats = new Set([
    ...Object.keys(prev.categoryScores || {}),
    ...Object.keys(curr.categoryScores || {}),
  ])

  for (const cat of Array.from(allCats)) {
    const prevScore = prev.categoryScores?.[cat]?.score ?? 0
    const currScore = curr.categoryScores?.[cat]?.score ?? 0
    deltas.push({
      category: cat,
      label: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      previousScore: prevScore,
      currentScore: currScore,
      delta: currScore - prevScore,
    })
  }

  return deltas
}

// ── Severity Classification ──

interface SeverityInput {
  overallDelta: number
  categoryDeltas: ScoreDelta[]
  newCriticalCount: number
  newHighCount: number
  hasCriticalVitalRegression: boolean
  revenueRiskDelta: number | null
  aiReadinessDelta: number | null
  currentScore: number
}

function classifyRegressionSeverity(input: SeverityInput): RegressionSeverity {
  const {
    overallDelta, categoryDeltas, newCriticalCount, newHighCount,
    hasCriticalVitalRegression, revenueRiskDelta,
  } = input

  // ── Critical Regression ──
  if (overallDelta <= -20) return 'critical_regression'
  if (newCriticalCount > 0) return 'critical_regression'
  if (hasCriticalVitalRegression) return 'critical_regression'
  if (revenueRiskDelta !== null && revenueRiskDelta > 50000) return 'critical_regression'

  // ── High Regression ──
  if (overallDelta <= -10) return 'high_regression'
  if (categoryDeltas.some(d => d.delta <= -15)) return 'high_regression'
  if (newHighCount >= 2) return 'high_regression'

  // ── Moderate Regression ──
  if (overallDelta <= -5) return 'moderate_regression'
  if (categoryDeltas.some(d => d.delta <= -8)) return 'moderate_regression'
  if (newHighCount >= 1) return 'moderate_regression'

  // ── Minor Regression ──
  if (overallDelta < -1) return 'minor_regression'

  // ── Improvement ──
  if (overallDelta >= 5) return 'improvement'

  return 'no_significant_change'
}

// ── Summary Generation ──

interface SummaryInput {
  overallDelta: number
  previousScore: number
  currentScore: number
  severity: RegressionSeverity
  issueDiffResult: ReturnType<typeof diffIssues>
  vitalsDeltas: ReturnType<typeof diffVitals>
  revenueRiskDelta: number | null
  aiReadinessDelta: number | null
  current: AuditSnapshot
}

function generateSummary(input: SummaryInput): { summary: string; recommendedActions: string[] } {
  const {
    overallDelta, previousScore, currentScore, severity,
    issueDiffResult, vitalsDeltas, revenueRiskDelta, aiReadinessDelta,
  } = input

  const parts: string[] = []
  const actions: string[] = []

  // Overall score change
  if (overallDelta < 0) {
    parts.push(`Overall score dropped from ${previousScore} to ${currentScore} (${overallDelta} points) since the last scan.`)
  } else if (overallDelta > 0) {
    parts.push(`Overall score improved from ${previousScore} to ${currentScore} (+${overallDelta} points) since the last scan.`)
  } else {
    parts.push(`Overall score remains at ${currentScore}.`)
  }

  // New issues
  if (issueDiffResult.newIssues.length > 0) {
    const critCount = issueDiffResult.newCriticalCount
    const highCount = issueDiffResult.newHighCount
    if (critCount > 0) {
      parts.push(`${critCount} new critical issue${critCount > 1 ? 's' : ''} appeared.`)
      actions.push('Fix critical issues immediately.')
    }
    if (highCount > 0) {
      parts.push(`${highCount} new high-priority issue${highCount > 1 ? 's' : ''} appeared.`)
      actions.push('Review and address high-priority issues.')
    }
  }

  // Resolved issues
  if (issueDiffResult.resolvedIssues.length > 0) {
    parts.push(`${issueDiffResult.resolvedIssues.length} issue${issueDiffResult.resolvedIssues.length > 1 ? 's were' : ' was'} resolved.`)
  }

  // Vitals
  const worsenedVitals = vitalsDeltas.filter(v => v.status === 'worsened' || v.status === 'critical')
  if (worsenedVitals.length > 0) {
    const names = worsenedVitals.map(v => v.label).join(', ')
    parts.push(`Core Web Vitals worsened: ${names}.`)
    actions.push('Investigate performance regressions in Core Web Vitals.')
  }

  // Revenue risk
  if (revenueRiskDelta !== null && revenueRiskDelta > 0) {
    parts.push(`Estimated revenue risk increased based on current assumptions.`)
    actions.push('Address revenue-impacting issues on critical pages.')
  }

  // AI readiness
  if (aiReadinessDelta !== null && aiReadinessDelta < -10) {
    parts.push(`AI-Agent Readiness dropped.`)
    actions.push('Check robots.txt, llms.txt, and structured data changes.')
  } else if (aiReadinessDelta !== null && aiReadinessDelta > 10) {
    parts.push(`AI-Agent Readiness improved.`)
  }

  if (actions.length === 0) {
    if (severity === 'improvement') {
      actions.push('Continue current optimization efforts.')
    } else {
      actions.push('No urgent action needed. Schedule a follow-up scan.')
    }
  }

  return {
    summary: parts.join(' '),
    recommendedActions: actions,
  }
}
