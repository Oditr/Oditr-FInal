// ── Smart Scoring System ──
// Combines per-category scores and merges with Lighthouse
// Enriches findings with actionable recommendations

import { CategoryResult, CustomAuditResult } from './types'
import { enrichWithRecommendations } from './recommendations'

// Severity weights for score calculation
const SEVERITY_WEIGHT = { critical: 3, moderate: 2, minor: 1, info: 0 }

// Category weights for overall custom audit score
const CATEGORY_WEIGHT: Record<string, number> = {
  'broken-links': 1.0,
  'images': 1.0,
  'assets': 1.0,
  'meta-tags': 0.8,
  'headings': 0.6,
  'security': 1.2,
  'mobile': 1.0,
  'accessibility': 1.1,
}

/**
 * Calculate the overall custom audit score from category results.
 */
export function calculateOverallScore(categories: CategoryResult[]): number {
  if (categories.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  for (const cat of categories) {
    const w = CATEGORY_WEIGHT[cat.category] ?? 1.0
    weightedSum += cat.score * w
    totalWeight += w
  }

  return Math.round(weightedSum / totalWeight)
}



/**
 * Count findings by severity.
 */
export function countBySeverity(categories: CategoryResult[]) {
  let critical = 0, moderate = 0, minor = 0

  for (const cat of categories) {
    for (const f of cat.findings) {
      if (f.severity === 'critical') critical++
      else if (f.severity === 'moderate') moderate++
      else if (f.severity === 'minor') minor++
    }
  }

  return { critical, moderate, minor }
}

/**
 * Build the full CustomAuditResult from category results.
 * Enriches all findings with actionable recommendations and uplift estimates.
 */
export function buildCustomAuditResult(
  url: string,
  categories: CategoryResult[],
  duration: number
): CustomAuditResult {
  // Enrich findings with recommendations + estimated uplift
  const enrichedCategories = enrichWithRecommendations(categories)

  const overallScore = calculateOverallScore(enrichedCategories)
  const { critical, moderate, minor } = countBySeverity(enrichedCategories)
  const totalFindings = critical + moderate + minor

  return {
    url,
    fetchedAt: new Date().toISOString(),
    duration,
    overallScore,
    categories: enrichedCategories,
    totalFindings,
    critical,
    moderate,
    minor,
  }
}

