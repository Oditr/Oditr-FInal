// ── Øditr Revenue Impact Engine — Orchestrator ──
// Public API for computing revenue risk from audit issues.
// Takes a BusinessProfile + audit issues and produces a full RevenueImpactResult.

import type {
  BusinessProfile,
  IssueImpactInput,
  IssueImpactOutput,
  RevenueImpactResult,
  ConfidenceLevel,
} from './types'

import { calculateIssueImpact } from './calculator'

/**
 * Build a complete Revenue Impact Report from a business profile and audit issues.
 *
 * This is the single entry point for the revenue impact engine.
 * Called from the dashboard or API after audit results are available.
 *
 * Runtime: ~1ms (pure in-process computation, no I/O)
 */
export function buildRevenueImpactReport(
  profile: BusinessProfile,
  issues: IssueImpactInput[],
  reportId?: string
): RevenueImpactResult {
  if (!issues || issues.length === 0) {
    return {
      reportId: reportId || crypto.randomUUID(),
      projectId: profile.projectId,
      totalEstimatedRevenueAtRisk: 0,
      totalEstimatedLeadValueAtRisk: 0,
      currency: profile.currency,
      overallConfidence: 'low',
      issueImpacts: [],
      createdAt: new Date().toISOString(),
    }
  }

  // Calculate impact for each issue
  const issueImpacts: IssueImpactOutput[] = issues.map((issue) => {
    // Try to match issue URL to a user-defined important page
    const matchedPage = profile.importantPages.find(
      (p) => issue.affectedUrl && issue.affectedUrl.includes(p.url)
    )
    return calculateIssueImpact(issue, profile, matchedPage)
  })

  // Sort by priority score descending
  issueImpacts.sort((a, b) => b.priorityScore - a.priorityScore)

  // Aggregate totals
  const totalEstimatedRevenueAtRisk = issueImpacts.reduce(
    (sum, i) => sum + i.estimatedRevenueAtRisk,
    0
  )

  // For lead-based businesses, separate lead value
  const isLeadBusiness =
    profile.businessType === 'lead_generation' ||
    profile.businessType === 'agency' ||
    profile.primaryConversionGoal === 'lead_submission' ||
    profile.primaryConversionGoal === 'contact_request'

  const totalEstimatedLeadValueAtRisk = isLeadBusiness
    ? totalEstimatedRevenueAtRisk
    : 0

  // Overall confidence = worst confidence across all issues with real revenue risk
  const significantImpacts = issueImpacts.filter(
    (i) => i.estimatedRevenueAtRisk > 0
  )
  const overallConfidence: ConfidenceLevel =
    significantImpacts.length === 0
      ? 'low'
      : deriveOverallConfidence(significantImpacts)

  return {
    reportId: reportId || crypto.randomUUID(),
    projectId: profile.projectId,
    totalEstimatedRevenueAtRisk: Math.round(totalEstimatedRevenueAtRisk),
    totalEstimatedLeadValueAtRisk: Math.round(totalEstimatedLeadValueAtRisk),
    currency: profile.currency,
    overallConfidence,
    issueImpacts,
    createdAt: new Date().toISOString(),
  }
}

function deriveOverallConfidence(
  impacts: IssueImpactOutput[]
): ConfidenceLevel {
  const levels: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }
  const avg =
    impacts.reduce((s, i) => s + levels[i.confidence], 0) / impacts.length
  if (avg >= 2.5) return 'high'
  if (avg >= 1.5) return 'medium'
  return 'low'
}

// ── Utility: Convert AuditResult issues into IssueImpactInput[] ──
// This bridges the existing audit engine output to revenue impact input.

interface AuditFinding {
  id: string
  title: string
  severity?: string
  category?: string
  description?: string
}

interface LighthouseOpportunity {
  id: string
  title: string
  impact?: string
  score?: number
}

export function auditResultToIssues(
  url: string,
  customFindings?: AuditFinding[],
  lighthouseOpportunities?: LighthouseOpportunity[]
): IssueImpactInput[] {
  const issues: IssueImpactInput[] = []

  // Convert custom audit findings
  if (customFindings) {
    for (const f of customFindings) {
      issues.push({
        issueId: f.id,
        issueTitle: f.title,
        issueCategory: f.category || 'general',
        technicalSeverity: mapSeverity(f.severity),
        affectedUrl: url,
      })
    }
  }

  // Convert Lighthouse opportunities
  if (lighthouseOpportunities) {
    for (const opp of lighthouseOpportunities) {
      issues.push({
        issueId: opp.id,
        issueTitle: opp.title,
        issueCategory: opp.id, // e.g. 'largest-contentful-paint', 'render-blocking-resources'
        technicalSeverity: mapOpportunitySeverity(opp),
        affectedUrl: url,
      })
    }
  }

  return issues
}

function mapSeverity(
  severity?: string
): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'critical'
    case 'high':
    case 'moderate':
      return 'high'
    case 'medium':
      return 'medium'
    default:
      return 'low'
  }
}

function mapOpportunitySeverity(opp: LighthouseOpportunity): 'low' | 'medium' | 'high' | 'critical' {
  if (opp.impact === 'high' || (opp.score != null && opp.score < 0.3)) return 'high'
  if (opp.impact === 'medium' || (opp.score != null && opp.score < 0.6)) return 'medium'
  return 'low'
}

// Re-export types
export type {
  BusinessProfile,
  BusinessType,
  ConversionGoal,
  FunnelStage,
  BusinessCriticality,
  ConfidenceLevel,
  ImpactCategory,
  PriorityLabel,
  FixDifficulty,
  ImportantPage,
  IssueImpactInput,
  IssueImpactOutput,
  RevenueImpactResult,
} from './types'
