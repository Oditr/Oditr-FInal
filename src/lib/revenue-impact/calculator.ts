import {
  BusinessProfile,
  ImportantPage,
  IssueImpactInput,
  IssueImpactOutput,
  ImpactCategory
} from './types'

import {
  DEFAULT_MONTHLY_SESSIONS,
  DEFAULT_CONVERSION_RATES,
  DEFAULT_AOV,
  getEstimatedTrafficShare,
  SEVERITY_IMPACT_FACTORS,
  FUNNEL_STAGE_MULTIPLIERS,
  CRITICALITY_MULTIPLIERS,
  calculateConfidence,
  determinePriorityLabel,
  estimateFixDifficulty
} from './assumptions'

/**
 * Maps technical audit issues into business impact categories.
 */
function mapIssueToImpactCategory(issueCategory: string, technicalSeverity: string): ImpactCategory[] {
  const categories: ImpactCategory[] = []
  const cat = issueCategory.toLowerCase()

  if (cat.includes('lcp') || cat.includes('inp') || cat.includes('cls') || cat.includes('mobile')) {
    categories.push('conversion')
  }
  if (cat.includes('seo') || cat.includes('meta') || cat.includes('index') || cat.includes('robot')) {
    categories.push('seo_traffic')
  }
  if (cat.includes('security') || cat.includes('https') || cat.includes('mixed') || cat.includes('accessibility')) {
    categories.push('trust')
  }
  if (cat.includes('broken link') || cat.includes('form') || cat.includes('checkout')) {
    categories.push('revenue_risk')
  }

  // Fallback
  if (categories.length === 0) {
    categories.push('conversion') 
  }
  return categories
}

/**
 * Calculates the total revenue at risk for a specific issue on a specific page.
 */
export function calculateIssueImpact(
  issue: IssueImpactInput,
  profile: BusinessProfile,
  pageContext?: ImportantPage
): IssueImpactOutput {
  
  // 1. Determine base assumptions vs user-provided data
  const isEstimatedSessions = profile.monthlySessions == null
  const isEstimatedConversion = profile.conversionRate == null
  const isEstimatedAov = profile.averageOrderValue == null && profile.averageLeadValue == null
  const isEstimatedTrafficShare = !pageContext

  const monthlySessions = profile.monthlySessions ?? DEFAULT_MONTHLY_SESSIONS
  const conversionRate = profile.conversionRate ?? DEFAULT_CONVERSION_RATES[profile.businessType] ?? 0.01
  const aov = profile.averageOrderValue ?? profile.averageLeadValue ?? DEFAULT_AOV

  // 2. Determine Page Context (either explicitly defined by user or generic fallback)
  const pageTrafficShare = pageContext?.trafficShare ?? (issue.affectedUrl ? getEstimatedTrafficShare(issue.affectedUrl) : 0.05)
  const funnelStage = pageContext?.funnelStage ?? 'awareness'
  const businessCriticality = pageContext?.businessCriticality ?? 'medium'
  const pageType = pageContext?.pageType ?? 'generic'

  // 3. Formula: Affected Sessions
  // For simplicity, we assume an issue affects all traffic to that page.
  const issueExposureFactor = 1.0 
  const affectedSessions = monthlySessions * pageTrafficShare * issueExposureFactor

  // 4. Formula: Baseline Conversions & Revenue
  const baselineConversions = affectedSessions * conversionRate
  const baselineRevenue = baselineConversions * aov

  // 5. Formula: Issue Impact Factor
  const baseSeverityImpact = SEVERITY_IMPACT_FACTORS[issue.technicalSeverity] ?? 0.01
  const funnelMultiplier = FUNNEL_STAGE_MULTIPLIERS[funnelStage] ?? 1.0
  const criticalityMultiplier = CRITICALITY_MULTIPLIERS[businessCriticality] ?? 1.0

  // Combine into a single impact factor (capped at 1.0)
  let impactFactor = baseSeverityImpact * funnelMultiplier * criticalityMultiplier
  if (impactFactor > 1.0) impactFactor = 1.0

  // 6. Formula: Revenue at Risk
  const estimatedRevenueAtRisk = baselineRevenue * impactFactor

  // 7. Calculate Confidence & Priority
  const confidence = calculateConfidence(isEstimatedSessions, isEstimatedConversion, isEstimatedAov, isEstimatedTrafficShare)
  
  // Priority Math (0-100)
  // Higher severity = higher base. High revenue at risk pushes it to 100.
  let priorityScore = (baseSeverityImpact * 100) * 3 // Base 15 -> 45
  priorityScore += (impactFactor * 100) // Context adds more
  // Add weight if revenue risk is over $1k
  if (estimatedRevenueAtRisk > 1000) priorityScore += 10
  if (estimatedRevenueAtRisk > 5000) priorityScore += 20
  
  if (priorityScore > 100) priorityScore = 100
  if (priorityScore < 0) priorityScore = 0

  return {
    issueId: issue.issueId,
    issueTitle: issue.issueTitle,
    issueCategory: issue.issueCategory,
    technicalSeverity: issue.technicalSeverity,
    impactCategory: mapIssueToImpactCategory(issue.issueCategory, issue.technicalSeverity),
    affectedUrl: issue.affectedUrl ?? 'Unknown URL',
    pageType,
    funnelStage,
    businessCriticality,
    estimatedAffectedSessions: Math.round(affectedSessions),
    baselineConversions: Math.round(baselineConversions),
    baselineRevenue: Math.round(baselineRevenue),
    impactFactor,
    estimatedRevenueAtRisk: Math.round(estimatedRevenueAtRisk),
    confidence,
    priorityScore: Math.round(priorityScore),
    priorityLabel: determinePriorityLabel(priorityScore),
    fixDifficulty: estimateFixDifficulty(issue.issueCategory),
    recommendedAction: 'Review technical issue details and apply framework-specific fix.',
    assumptionsUsed: {
      monthlySessions,
      conversionRate,
      aov,
      pageTrafficShare,
      impactFactor,
      isEstimatedSessions,
      isEstimatedConversion,
      isEstimatedAov,
      isEstimatedTrafficShare
    }
  }
}
