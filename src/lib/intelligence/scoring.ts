import type { IntelligenceInput } from './types'

export interface HealthScoreResult {
  overallScore: number
  breakdown: {
    speed: { score: number; weight: number }
    stability: { score: number; weight: number }
    interactivity: { score: number; weight: number }
    reliability: { score: number; weight: number }
    readiness: { score: number; weight: number }
  }
}

/**
 * Computes the proprietary Oditr Health Score.
 * 
 * Weights:
 * - Speed (40%): Lighthouse Performance Score
 * - Stability (15%): Cumulative Layout Shift (CLS)
 * - Interactivity (15%): INP or TBT
 * - Reliability (10%): A11y Score + TTFB / Security
 * - Optimization Readiness (20%): Inverse of Critical/Moderate issues
 */
export function computeOditrHealthScore(input: IntelligenceInput): HealthScoreResult {
  const { psiData, customAudit } = input

  // Safely extract values, fallback to 0 if missing
  const perfScore = psiData?.scores?.performance ?? 0
  const a11yScore = psiData?.scores?.accessibility ?? 0
  const clsVal = psiData?.cwv?.cls?.numericValue ?? 0
  const inpVal = psiData?.cwv?.inp?.numericValue ?? psiData?.cwv?.tbt?.numericValue ?? 0
  
  // 1. Speed (40%)
  // Directly use the Lighthouse performance score
  const speedScore = perfScore

  // 2. Stability (15%)
  // CLS <= 0.1 is 100, CLS >= 0.25 is 0
  let stabilityScore = 100
  if (clsVal > 0.1) {
    stabilityScore = Math.max(0, 100 - ((clsVal - 0.1) / 0.15) * 100)
  }

  // 3. Interactivity (15%)
  // INP/TBT <= 200ms is 100, >= 500ms is 0
  let interactivityScore = 100
  if (inpVal > 200) {
    interactivityScore = Math.max(0, 100 - ((inpVal - 200) / 300) * 100)
  }

  // 4. Reliability (10%)
  // Use A11y + TTFB penalty. TTFB > 600ms starts penalizing.
  const ttfbVal = psiData?.cwv?.ttfb?.numericValue ?? 0
  let reliabilityScore = a11yScore || 50 // assume 50 if no a11y data
  if (ttfbVal > 600) {
    reliabilityScore = Math.max(0, reliabilityScore - ((ttfbVal - 600) / 1000) * 20)
  }

  // 5. Optimization Readiness (20%)
  // Starts at 100. Critical issues = -10, Moderate = -5, Minor = -1
  let readinessScore = 100
  if (customAudit) {
    readinessScore -= customAudit.critical * 10
    readinessScore -= customAudit.moderate * 5
    readinessScore -= customAudit.minor * 1
  }
  // Penalize for lighthouse opportunities with high impact
  const topOpps = psiData?.opportunities ?? []
  const highImpactOpps = topOpps.filter((o: any) => o.impact === 'high').length
  const medImpactOpps = topOpps.filter((o: any) => o.impact === 'medium').length
  readinessScore -= highImpactOpps * 8
  readinessScore -= medImpactOpps * 3

  readinessScore = Math.max(0, Math.min(100, readinessScore))

  // Weights
  const weights = {
    speed: 0.40,
    stability: 0.15,
    interactivity: 0.15,
    reliability: 0.10,
    readiness: 0.20,
  }

  // Compute weighted average
  const overallScore = Math.round(
    speedScore * weights.speed +
    stabilityScore * weights.stability +
    interactivityScore * weights.interactivity +
    reliabilityScore * weights.reliability +
    readinessScore * weights.readiness
  )

  return {
    overallScore,
    breakdown: {
      speed: { score: Math.round(speedScore), weight: weights.speed },
      stability: { score: Math.round(stabilityScore), weight: weights.stability },
      interactivity: { score: Math.round(interactivityScore), weight: weights.interactivity },
      reliability: { score: Math.round(reliabilityScore), weight: weights.reliability },
      readiness: { score: Math.round(readinessScore), weight: weights.readiness },
    }
  }
}
