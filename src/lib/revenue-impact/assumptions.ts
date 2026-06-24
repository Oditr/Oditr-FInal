import type { BusinessType, FunnelStage, BusinessCriticality } from './types'

// ═══════════════════════════════════════════════
// ASSUMPTIONS ENGINE: DEFAULTS AND FALLBACKS
// ═══════════════════════════════════════════════
// We never present these as facts; they are clearly labeled as estimates
// in the UI if the user does not provide their own real analytics data.

export const DEFAULT_CONVERSION_RATES: Record<BusinessType, number> = {
  ecommerce: 0.02, // 2%
  saas: 0.03, // 3%
  lead_generation: 0.05, // 5%
  agency: 0.02, // 2%
  marketplace: 0.02, // 2%
  blog: 0.005, // 0.5%
  portfolio: 0.01, // 1%
  other: 0.01, // 1%
}

export const DEFAULT_MONTHLY_SESSIONS = 5000 // A conservative default for a small/medium site
export const DEFAULT_AOV = 50 // Default $50 AOV or lead value

// Standard traffic share assumptions if page-level analytics aren't provided
export function getEstimatedTrafficShare(pageType: string): number {
  const type = pageType.toLowerCase()
  if (type.includes('home')) return 0.25 // 25% traffic usually hits home
  if (type.includes('product') || type.includes('article')) return 0.20 // Deep pages
  if (type.includes('pricing') || type.includes('category')) return 0.10
  if (type.includes('checkout') || type.includes('contact') || type.includes('demo')) return 0.05 // Bottlenecks
  return 0.02 // Generic fallback
}

// ═══════════════════════════════════════════════
// IMPACT FACTORS
// ═══════════════════════════════════════════════
// How much does an issue actually hurt conversion based on severity?

export const SEVERITY_IMPACT_FACTORS = {
  critical: 0.15, // 15% drop in conversions
  high: 0.07,     // 7% drop
  medium: 0.02,   // 2% drop
  low: 0.005,     // 0.5% drop
}

export const FUNNEL_STAGE_MULTIPLIERS: Record<FunnelStage, number> = {
  awareness: 0.5,     // Low direct impact on immediate revenue
  consideration: 0.8, // Medium impact
  conversion: 1.2,    // High impact
  checkout: 1.5,      // Critical impact
  retention: 1.0,     // Standard impact
}

export const CRITICALITY_MULTIPLIERS: Record<BusinessCriticality, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  critical: 2.0,
}

// ═══════════════════════════════════════════════
// CONFIDENCE & PRIORITY SCORING
// ═══════════════════════════════════════════════

export function calculateConfidence(
  isEstimatedSessions: boolean,
  isEstimatedConversion: boolean,
  isEstimatedAov: boolean,
  isEstimatedTrafficShare: boolean
): 'high' | 'medium' | 'low' {
  let estimatedCount = 0
  if (isEstimatedSessions) estimatedCount++
  if (isEstimatedConversion) estimatedCount++
  if (isEstimatedAov) estimatedCount++
  if (isEstimatedTrafficShare) estimatedCount++

  if (estimatedCount === 0) return 'high'
  if (estimatedCount <= 2) return 'medium'
  return 'low'
}

export function determinePriorityLabel(score: number): any {
  if (score >= 90) return 'Critical Revenue Risk'
  if (score >= 70) return 'High Revenue Risk'
  if (score >= 40) return 'Moderate Revenue Risk'
  if (score >= 20) return 'Low Revenue Risk'
  return 'Informational'
}

export function estimateFixDifficulty(issueCategory: string): 'easy' | 'medium' | 'hard' | 'unknown' {
  const category = issueCategory.toLowerCase()
  if (category.includes('meta') || category.includes('broken link') || category.includes('header')) {
    return 'easy'
  }
  if (category.includes('image') || category.includes('aria') || category.includes('contrast') || category.includes('cls')) {
    return 'medium'
  }
  if (category.includes('js') || category.includes('inp') || category.includes('main thread') || category.includes('tbt')) {
    return 'hard'
  }
  return 'unknown'
}
