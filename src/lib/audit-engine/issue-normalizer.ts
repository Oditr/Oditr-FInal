import { AuditIssue, CustomAuditResult, AuditFinding, UnifiedCategory, Severity } from './types'

// Map custom audit categories to UnifiedCategory
const CATEGORY_MAP: Record<string, UnifiedCategory> = {
  'broken-links': 'broken_links',
  'images': 'images',
  'assets': 'performance',
  'meta-tags': 'seo',
  'headings': 'seo',
  'security': 'security',
  'mobile': 'mobile',
  'accessibility': 'accessibility',
  'ai-readiness': 'ai_readiness'
}

/**
 * Normalizes custom audit findings and Lighthouse opportunities/diagnostics into a single, unified list of AuditIssue.
 */
export function normalizeIssues(
  url: string,
  lighthouseResult: any,
  customAuditResult: CustomAuditResult | null
): AuditIssue[] {
  const issues: AuditIssue[] = []

  // 1. Process Custom Audit Findings
  if (customAuditResult && customAuditResult.categories) {
    for (const cat of customAuditResult.categories) {
      for (const finding of cat.findings) {
        issues.push(convertCustomFindingToIssue(url, finding))
      }
    }
  }

  // 2. Process Lighthouse Opportunities (usually performance)
  if (lighthouseResult && lighthouseResult.opportunities) {
    for (const opp of lighthouseResult.opportunities) {
      issues.push(convertLighthouseOpportunityToIssue(url, opp))
    }
  }

  // 3. Process Lighthouse Diagnostics (if we want to include them)
  // For now, we mainly rely on opportunities, but we could add diagnostics here if needed.
  
  // 4. Process Lighthouse Accessibility (from full PSI, not lite)
  if (lighthouseResult && lighthouseResult.scores && lighthouseResult.scores.accessibility > 0 && !lighthouseResult.liteMode) {
    // Note: The /api/audit/full/route.ts doesn't expose the raw accessibility findings in `opportunities`
    // It only exposes top opportunities from performance.
    // To keep it simple, we use the custom accessibility audit for detailed a11y issues.
  }

  // Sort issues by severity: critical -> high -> medium -> low -> info
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  issues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])

  return issues
}

function convertCustomFindingToIssue(url: string, finding: AuditFinding): AuditIssue {
  const mappedCategory = CATEGORY_MAP[finding.category] || 'performance'
  
  // Ensure severity is mapped to the new unified types
  let severity: Severity = finding.severity as Severity
  if ((severity as string) === 'moderate') severity = 'medium'
  if ((severity as string) === 'minor') severity = 'low'

  const impactMapping: Record<string, string> = {
    performance: 'Affects load speed, bounce rates, and Core Web Vitals.',
    seo: 'Affects search engine rankings and organic discoverability.',
    accessibility: 'Affects user experience for disabled users and compliance with WCAG.',
    security: 'Leaves the site vulnerable to common web attacks or degrades user trust.',
    broken_links: 'Creates frustrating user experiences and harms SEO crawlability.',
    images: 'Increases page weight and hurts load times or LCP.',
    mobile: 'Creates rendering or usability issues on smaller screens.',
    ai_readiness: 'Limits how AI agents and LLMs can consume and understand your content.'
  }

  // Map difficulty from recommendation if available
  let diff = finding.recommendation?.fixDifficulty || 'unknown'
  if (finding.recommendation?.estimatedImpact === 'high') diff = 'medium' // fallback mapping

  // Determine revenue relevance and business impact
  const isAiReadiness = mappedCategory === 'ai_readiness'
  const revenueRelevant = ['performance', 'seo', 'broken_links', 'mobile', 'ai_readiness'].includes(mappedCategory)

  // Map AI readiness issues to discoverability impact
  let businessImpactCategory: 'seo' | 'trust' | 'conversion' | 'discoverability' | undefined
  if (isAiReadiness) businessImpactCategory = 'discoverability'
  else if (mappedCategory === 'seo') businessImpactCategory = 'seo'
  else if (mappedCategory === 'security') businessImpactCategory = 'trust'
  else if (mappedCategory === 'performance' || mappedCategory === 'mobile') businessImpactCategory = 'conversion'

  return {
    id: `custom-${finding.id}-${Date.now().toString(36)}`,
    title: finding.title,
    description: finding.description,
    category: mappedCategory,
    severity: severity,
    affectedUrl: url,
    evidence: {
      value: finding.value,
      element: finding.element
    },
    impact: impactMapping[mappedCategory] || 'Affects overall site health and user experience.',
    recommendation: finding.recommendation?.fix || 'Review and optimize this aspect.',
    fixSnippet: finding.recommendation?.codeSnippet,
    fixDifficulty: diff as 'easy'|'medium'|'hard'|'unknown',
    revenueRelevant,
    businessImpactCategory,
    experimental: isAiReadiness ? true : undefined,
    createdAt: new Date().toISOString()
  }
}

function convertLighthouseOpportunityToIssue(url: string, opp: any): AuditIssue {
  let severity: Severity = 'low'
  if (opp.impact === 'high') severity = 'high'
  else if (opp.impact === 'medium') severity = 'medium'

  let fixDiff: 'easy'|'medium'|'hard'|'unknown' = 'unknown'
  if (opp.id === 'uses-optimized-images' || opp.id === 'uses-webp-images') fixDiff = 'easy'
  if (opp.id === 'render-blocking-resources' || opp.id === 'unused-javascript') fixDiff = 'hard'

  return {
    id: `lh-${opp.id}-${Date.now().toString(36)}`,
    title: opp.title,
    description: opp.description.replace(/\[Learn more\]\(.*\)/g, '').trim(), // clean markdown links
    category: 'performance',
    severity: severity,
    affectedUrl: url,
    evidence: {
      displayValue: opp.displayValue
    },
    impact: 'Affects load speed, bounce rates, and Core Web Vitals (LCP/TBT).',
    recommendation: `Follow Lighthouse best practices to address ${opp.title.toLowerCase()}.`,
    fixDifficulty: fixDiff,
    revenueRelevant: true, // Performance is generally revenue-relevant
    createdAt: new Date().toISOString()
  }
}
