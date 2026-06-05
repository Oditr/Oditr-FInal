// ── VitalFix Intelligence Engine — Orchestrator ──
// Public API that ties together all intelligence modules.
// Takes raw audit data and produces a complete IntelligenceReport.

import type { IntelligenceReport, IntelligenceInput } from './types'
import { detectFramework } from './framework-detector'
import { detectSiteContext } from './context-detector'
import { generateMetricNarratives, generateBusinessSummary } from './business-impact-engine'
import { prioritizeIssues } from './prioritization-engine'
import { assessTrust } from './trust-system'
import { createLogger } from './logger'

const log = createLogger('intelligence')

/**
 * Build a complete IntelligenceReport from raw audit data.
 *
 * This is the single entry point for the intelligence layer.
 * Called from the /api/audit/full route after PSI + custom audit complete.
 *
 * Runtime: ~1–5ms (pure in-process computation, no I/O)
 */
export function buildIntelligenceReport(input: IntelligenceInput): IntelligenceReport {
  const start = Date.now()
  const { url, psiData, customAudit, html, headers, hasFieldData } = input

  try {
    // ── Step 1: Framework Detection ──
    const detectedFramework = detectFramework(html, headers, url)

    // ── Step 2: Site Context Detection ──
    const siteContext = detectSiteContext(url, html)

    // ── Step 3: Business Impact Narratives ──
    // Extract CWV metrics from PSI data
    const cwvMetrics = psiData?.cwv ? {
      lcp: { numericValue: psiData.cwv.lcp?.numericValue },
      cls: { numericValue: psiData.cwv.cls?.numericValue },
      inp: { numericValue: psiData.cwv.inp?.numericValue },
      fcp: { numericValue: psiData.cwv.fcp?.numericValue },
      ttfb: { numericValue: psiData.cwv.ttfb?.numericValue },
      tbt: { numericValue: psiData.cwv.tbt?.numericValue },
    } : null

    const metricNarratives = generateMetricNarratives(
      cwvMetrics,
      siteContext.category,
    )

    const businessSummary = generateBusinessSummary(
      metricNarratives,
      psiData?.scores?.performance ?? null,
      customAudit?.overallScore ?? null,
      // Calculate health score if both available
      psiData?.scores?.performance != null && customAudit?.overallScore != null
        ? Math.round(psiData.scores.performance * 0.6 + customAudit.overallScore * 0.4)
        : psiData?.scores?.performance ?? customAudit?.overallScore ?? null,
    )

    // ── Step 4: Prioritize All Issues ──
    // Collect custom audit findings
    const customFindings = customAudit?.categories
      ? customAudit.categories.flatMap((cat: any) =>
          (cat.findings || []).map((f: any) => ({
            ...f,
            category: cat.category,
          }))
        )
      : []

    // Collect Lighthouse opportunities
    const lighthouseOpportunities = psiData?.opportunities || []

    const allPrioritized = prioritizeIssues({
      customFindings,
      lighthouseOpportunities,
      siteCategory: siteContext.category,
      framework: detectedFramework.framework,
    })

    // Split into tiers
    const fixFirst = allPrioritized
      .filter(i => i.priorityTier === 'fix-first')
      .slice(0, 5)  // Cap at 5 to avoid overwhelming

    const fixNext = allPrioritized
      .filter(i => i.priorityTier === 'fix-next')
      .slice(0, 8)

    const optional = allPrioritized
      .filter(i => i.priorityTier === 'optional')

    // ── Step 5: Trust Assessment ──
    const trust = assessTrust({
      hasPsiData: !!psiData,
      hasCustomAudit: !!customAudit,
      hasFieldData,
      frameworkDetection: detectedFramework,
      siteContext,
      issueCount: allPrioritized.length,
      partial: !psiData || !customAudit,
    })

    const duration = Date.now() - start

    log.info('Intelligence report built', {
      durationMs: duration,
      fixFirst: fixFirst.length,
      fixNext: fixNext.length,
      optional: optional.length,
      framework: detectedFramework.framework,
      category: siteContext.category,
      confidence: trust.confidenceLevel,
      url,
    })

    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      fixFirst,
      fixNext,
      optional,
      totalIssues: allPrioritized.length,
      businessSummary,
      detectedFramework,
      siteContext,
      trust,
    }
  } catch (err) {
    // Intelligence engine should NEVER crash the audit pipeline
    log.error('Intelligence report failed — returning empty report', {
      error: err instanceof Error ? err.message : String(err),
      url,
    })

    return buildFallbackReport(url)
  }
}

/**
 * Fallback report when the intelligence engine encounters an unexpected error.
 * Returns a valid but empty IntelligenceReport so the API response is never broken.
 */
function buildFallbackReport(url: string): IntelligenceReport {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    fixFirst: [],
    fixNext: [],
    optional: [],
    totalIssues: 0,
    businessSummary: {
      headline: 'Unable to generate intelligence report for this page.',
      summary: 'The intelligence engine encountered an issue. Raw audit data is still available below.',
      metricNarratives: [],
      overallUxRating: 'needs-work',
    },
    detectedFramework: {
      framework: 'unknown',
      label: 'Unknown',
      confidence: 0,
      signals: [],
      reliable: false,
    },
    siteContext: {
      category: 'general',
      label: 'General Website',
      confidence: 0,
      signals: [],
      priorityMetrics: ['lcp', 'fcp', 'cls', 'inp', 'tbt', 'ttfb'],
    },
    trust: {
      confidenceLevel: 'low',
      confidenceScore: 10,
      evidenceSources: [],
      caveats: ['Intelligence engine error — showing raw audit data only.'],
      hasFieldData: false,
      improvementHint: 'Rerun the audit for full analysis.',
    },
  }
}

// Re-export types for convenience
export type {
  IntelligenceReport,
  IntelligenceInput,
  PrioritizedIssue,
  PriorityTier,
  BusinessSummary,
  MetricNarrative,
  FrameworkDetection,
  Framework,
  SiteContext,
  SiteCategory,
  TrustAssessment,
  ConfidenceLevel,
} from './types'
