// ── Oditr Intelligence Engine — Trust System ──
// Attaches confidence levels, evidence sources, and caveats to every intelligence report.
// Users see transparent reasoning about why Oditr is confident (or not) in its recommendations.

import type { TrustAssessment, ConfidenceLevel, FrameworkDetection, SiteContext } from './types'
import { createLogger } from './logger'

const log = createLogger('intelligence:trust')

// ═══════════════════════════════════════════════
// TRUST ASSESSMENT LOGIC
// ═══════════════════════════════════════════════

/**
 * Build a trust assessment from the available data sources and detection results.
 */
export function assessTrust(params: {
  hasPsiData: boolean
  hasCustomAudit: boolean
  hasFieldData: boolean
  frameworkDetection: FrameworkDetection
  siteContext: SiteContext
  issueCount: number
  partial: boolean
}): TrustAssessment {
  const {
    hasPsiData,
    hasCustomAudit,
    hasFieldData,
    frameworkDetection,
    siteContext,
    issueCount,
    partial,
  } = params

  const evidenceSources: string[] = []
  const caveats: string[] = []
  let score = 0

  // ── Data source contributions ──

  if (hasPsiData) {
    evidenceSources.push('Google Lighthouse lab audit')
    score += 30
  } else {
    caveats.push('Lighthouse data unavailable — scores are based on custom audit only.')
  }

  if (hasCustomAudit) {
    evidenceSources.push('Oditr 8-module site audit')
    score += 25
  } else {
    caveats.push('Custom site audit unavailable — only Lighthouse data used.')
  }

  if (hasFieldData) {
    evidenceSources.push('Chrome UX Report (CrUX) real-user data')
    score += 25
  } else {
    caveats.push('No real-user (field) data available. Scores are based on lab simulation only. Install the Oditr monitoring script for real-user metrics.')
  }

  if (hasPsiData && hasCustomAudit) {
    // Both engines ran — high quality
    score += 5
  }

  // ── Detection quality contributions ──

  if (frameworkDetection.reliable) {
    evidenceSources.push(`Framework detected: ${frameworkDetection.label}`)
    score += 5
  } else if (frameworkDetection.framework !== 'unknown') {
    caveats.push(`Framework detection confidence is low (${frameworkDetection.confidence}%). Recommendations may be generic.`)
  }

  if (siteContext.confidence >= 50) {
    evidenceSources.push(`Site category: ${siteContext.label}`)
    score += 5
  }

  // ── Issue count sanity ──

  if (issueCount === 0 && hasPsiData && hasCustomAudit) {
    // Both engines ran but found nothing — this is trustworthy
    score += 5
    evidenceSources.push('Zero issues across both engines')
  }

  // ── Partial results penalty ──

  if (partial) {
    score = Math.max(20, score - 15)
    caveats.push('This is a partial result — one of the audit engines did not complete. Rerun for full accuracy.')
  }

  // Clamp
  score = Math.min(100, Math.max(0, score))

  // Determine level
  const confidenceLevel: ConfidenceLevel =
    score >= 70 ? 'high' :
    score >= 45 ? 'medium' :
    'low'

  // Improvement hint
  let improvementHint: string | undefined
  if (!hasFieldData) {
    improvementHint = 'Install the Oditr monitoring script to collect real-user data and increase recommendation accuracy.'
  } else if (!hasPsiData && !hasCustomAudit) {
    improvementHint = 'Rerun the audit to get full results from both analysis engines.'
  } else if (partial) {
    improvementHint = 'Rerun the audit for complete results and higher confidence.'
  }

  log.info('Trust assessment complete', {
    confidenceLevel,
    score,
    evidenceSources: evidenceSources.length,
    caveats: caveats.length,
  })

  return {
    confidenceLevel,
    confidenceScore: score,
    evidenceSources,
    caveats,
    hasFieldData,
    improvementHint,
  }
}
