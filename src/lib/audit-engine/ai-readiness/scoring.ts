// ── AI Readiness Scoring Service ──
import { AuditFinding, AIReadinessStatus, ConfidenceLevel } from '../types'

/**
 * AI-Agent Readiness scoring weights:
 * - AI crawler access / robots.txt: 20%
 * - llms.txt presence and quality:  15%
 * - Structured data/schema:         20%
 * - Semantic HTML/accessibility:    15%
 * - Sitemap/discoverability:        15%
 * - Renderability/content:          10%
 * - Content clarity signals:         5%
 */

interface ScoreInputs {
  robotsScore: number    // 0-100
  llmsTxtScore: number   // 0-100
  schemaScore: number    // 0-100
  semanticScore: number  // 0-100
  discoveryScore: number // 0-100
  renderScore: number    // 0-100
  clarityScore: number   // 0-100
}

export function calculateAIReadinessScore(inputs: ScoreInputs): {
  score: number
  status: AIReadinessStatus
  confidence: ConfidenceLevel
  summary: string
} {
  const score = Math.round(
    inputs.robotsScore * 0.20 +
    inputs.llmsTxtScore * 0.15 +
    inputs.schemaScore * 0.20 +
    inputs.semanticScore * 0.15 +
    inputs.discoveryScore * 0.15 +
    inputs.renderScore * 0.10 +
    inputs.clarityScore * 0.05
  )

  let status: AIReadinessStatus
  if (score >= 85) status = 'Excellent'
  else if (score >= 65) status = 'Good'
  else if (score >= 40) status = 'Needs Work'
  else status = 'Poor'

  // Confidence is Medium for all AI readiness because these are emerging standards
  const confidence: ConfidenceLevel = 'Medium'

  let summary: string
  if (status === 'Excellent') {
    summary = 'This site has strong AI-agent readiness signals. Structured data, semantic HTML, and crawler access are well configured.'
  } else if (status === 'Good') {
    summary = 'This site has good baseline AI-agent readiness, but structured data, llms.txt, or semantic structure can be improved.'
  } else if (status === 'Needs Work') {
    summary = 'This site has significant gaps in AI-agent readiness. Important improvements are needed in structured data, crawler access, or content discoverability.'
  } else {
    summary = 'This site has poor AI-agent readiness. AI crawlers and agents will have difficulty understanding, navigating, or citing this content.'
  }

  return { score, status, confidence, summary }
}

/**
 * Derive sub-scores from findings for each category.
 * Starts at 100, deducts based on severity of findings in that sub-category.
 */
export function deriveSubScore(findings: AuditFinding[], subIdPrefix: string): number {
  const relevant = findings.filter(f => f.id.startsWith(subIdPrefix))
  let penalty = 0
  for (const f of relevant) {
    if (f.severity === 'critical') penalty += 40
    else if (f.severity === 'high') penalty += 20
    else if (f.severity === 'medium') penalty += 10
    else if (f.severity === 'low') penalty += 3
    // info = no penalty
  }
  return Math.max(0, 100 - penalty)
}
