// ── Alert Payload Service ──
// Builds structured alert payloads from regression results.
// Clean interface for future email/Slack/webhook integrations.

import type { AlertPayload, RegressionSeverity } from './types'

interface AlertInput {
  projectId: string
  reportId: string
  url: string
  severity: RegressionSeverity
  summary: string
  scoreDelta: number
  criticalIssueCount: number
  highIssueCount: number
  revenueRiskDelta: number | null
  topAffectedPage?: string
  recommendedAction: string
}

/**
 * Build an alert payload from regression data.
 */
export function buildAlertPayload(input: AlertInput): AlertPayload {
  return {
    projectId: input.projectId,
    reportId: input.reportId,
    url: input.url,
    regressionSeverity: input.severity,
    summary: input.summary,
    scoreDelta: input.scoreDelta,
    criticalIssueCount: input.criticalIssueCount,
    highIssueCount: input.highIssueCount,
    revenueRiskDelta: input.revenueRiskDelta,
    topAffectedPage: input.topAffectedPage,
    recommendedAction: input.recommendedAction,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Severity label for display.
 */
export function severityLabel(severity: RegressionSeverity): string {
  switch (severity) {
    case 'critical_regression': return 'Critical Regression'
    case 'high_regression': return 'High Regression'
    case 'moderate_regression': return 'Moderate Regression'
    case 'minor_regression': return 'Minor Regression'
    case 'no_significant_change': return 'No Significant Change'
    case 'improvement': return 'Improvement'
  }
}

/**
 * Severity color for UI.
 */
export function severityColor(severity: RegressionSeverity): string {
  switch (severity) {
    case 'critical_regression': return '#f87171'
    case 'high_regression': return '#fb923c'
    case 'moderate_regression': return '#fbbf24'
    case 'minor_regression': return '#60a5fa'
    case 'no_significant_change': return '#9ca3af'
    case 'improvement': return '#34d399'
  }
}

// ── Future Alert Dispatch Interface ──

export interface AlertChannel {
  type: 'email' | 'slack' | 'discord' | 'webhook'
  config: Record<string, string>
}

/**
 * TODO: Dispatch alert to configured channels.
 * Currently a placeholder. Implement when email/Slack infrastructure is available.
 *
 * Future signature:
 * export async function dispatchAlert(payload: AlertPayload, channels: AlertChannel[]): Promise<void>
 */
export async function dispatchAlert(
  payload: AlertPayload,
  _channels: AlertChannel[] = []
): Promise<{ dispatched: boolean; channel: string | null }> {
  // Log the alert for now
  console.log(`[Alert] ${severityLabel(payload.regressionSeverity)} for ${payload.url}:`, payload.summary)

  // TODO: Implement email dispatch when email infrastructure is available
  // TODO: Implement Slack webhook dispatch
  // TODO: Implement Discord webhook dispatch
  // TODO: Implement generic webhook dispatch

  return { dispatched: false, channel: null }
}
