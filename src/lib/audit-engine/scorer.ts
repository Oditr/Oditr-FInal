import { CategoryResult, CustomAuditResult, AuditIssue, UnifiedCategory, CategoryScore } from './types'
import { enrichWithRecommendations } from './recommendations'

export function countBySeverity(categories: CategoryResult[]) {
  let critical = 0, high = 0, medium = 0, low = 0

  for (const cat of categories) {
    for (const f of cat.findings) {
      if (f.severity === 'critical') critical++
      else if (f.severity === 'high') high++
      else if (f.severity === 'medium') medium++
      else if (f.severity === 'low') low++
    }
  }

  return { critical, high, medium, low }
}

export function buildCustomAuditResult(
  url: string,
  categories: CategoryResult[],
  duration: number
): CustomAuditResult {
  const enrichedCategories = enrichWithRecommendations(categories)

  const { critical, high, medium, low } = countBySeverity(enrichedCategories)
  const totalFindings = critical + high + medium + low

  // Calculate an internal "custom audit score" just for backward compatibility if needed,
  // but the real score will be the Unified one.
  const overallScore = Math.max(0, 100 - (critical * 10) - (high * 5) - (medium * 2) - (low * 1))

  return {
    url,
    fetchedAt: new Date().toISOString(),
    duration,
    overallScore,
    categories: enrichedCategories,
    totalFindings,
    critical,
    high,
    medium,
    low,
  }
}

/**
 * Calculate the new unified scores based on the 6 weighted categories:
 * Performance 25%, SEO 20%, Accessibility 15%, Security 15%, AI-Agent Readiness 10%, Mobile/UX/Image/Broken Links 15%.
 */
export function calculateUnifiedScores(
  issues: AuditIssue[],
  lighthouseResult: any
): { healthScore: number; categoryScores: Record<UnifiedCategory, CategoryScore> } {
  
  // Base scores (starting at 100, deducting based on issues)
  const scores: Record<UnifiedCategory, number> = {
    performance: lighthouseResult?.scores?.performance ?? 100,
    seo: lighthouseResult?.scores?.seo ?? 100,
    accessibility: lighthouseResult?.scores?.accessibility ?? 100,
    security: 100,
    ai_readiness: 100,
    mobile: 100,
    images: 100,
    broken_links: 100
  }

  // Group issues by category
  const categoryIssues: Record<UnifiedCategory, AuditIssue[]> = {
    performance: [], seo: [], accessibility: [], security: [], 
    ai_readiness: [], mobile: [], images: [], broken_links: []
  }

  for (const issue of issues) {
    if (categoryIssues[issue.category]) {
      categoryIssues[issue.category].push(issue)
    }
  }

  // Deduct points for custom categories (where LH doesn't already provide a strict score)
  const deduct = (cat: UnifiedCategory) => {
    let penalty = 0
    for (const issue of categoryIssues[cat]) {
      if (issue.severity === 'critical') penalty += 25
      else if (issue.severity === 'high') penalty += 15
      else if (issue.severity === 'medium') penalty += 5
      else if (issue.severity === 'low') penalty += 2
    }
    scores[cat] = Math.max(0, scores[cat] - penalty)
  }

  deduct('security')
  deduct('ai_readiness')
  deduct('mobile')
  deduct('images')
  deduct('broken_links')

  // If LH didn't run or missed categories, fall back to deductions
  if (!lighthouseResult || !lighthouseResult.scores) {
    deduct('performance')
    deduct('seo')
    deduct('accessibility')
  }

  // Combine Mobile/Images/BrokenLinks into a single "UX/Media/Links" composite for the 15% bucket
  // Or just average them
  const combinedUXScore = Math.round((scores.mobile + scores.images + scores.broken_links) / 3)

  // Calculate Overall Health Score
  const healthScore = Math.round(
    (scores.performance * 0.25) +
    (scores.seo * 0.20) +
    (scores.accessibility * 0.15) +
    (scores.security * 0.15) +
    (scores.ai_readiness * 0.10) +
    (combinedUXScore * 0.15)
  )

  const buildCatScore = (cat: UnifiedCategory, scoreOverride?: number): CategoryScore => {
    const isList = categoryIssues[cat]
    const c = isList.filter(i => i.severity === 'critical').length
    const h = isList.filter(i => i.severity === 'high').length
    const m = isList.filter(i => i.severity === 'medium').length
    const l = isList.filter(i => i.severity === 'low').length
    return {
      category: cat,
      score: scoreOverride !== undefined ? scoreOverride : scores[cat],
      issueCount: isList.length,
      criticalCount: c,
      highCount: h,
      mediumCount: m,
      lowCount: l,
      summary: c > 0 ? 'Critical issues found' : h > 0 ? 'High impact issues found' : isList.length > 0 ? 'Minor improvements available' : 'Looking good'
    }
  }

  const categoryScores: Record<UnifiedCategory, CategoryScore> = {
    performance: buildCatScore('performance'),
    seo: buildCatScore('seo'),
    accessibility: buildCatScore('accessibility'),
    security: buildCatScore('security'),
    ai_readiness: buildCatScore('ai_readiness'),
    mobile: buildCatScore('mobile'),
    images: buildCatScore('images'),
    broken_links: buildCatScore('broken_links')
  }

  return { healthScore, categoryScores }
}

// Backward compat
export function calculateHealthScore(p: number, c: number) {
  return Math.round(p * 0.6 + c * 0.4)
}
