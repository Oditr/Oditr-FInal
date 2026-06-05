// ── VitalFix Intelligence Engine — Core Types ──
// All type contracts for the intelligence layer that sits above Lighthouse + Custom Audit

// ═══════════════════════════════════════════════
// PRIORITIZATION TYPES
// ═══════════════════════════════════════════════

/** The three tiers every issue is bucketed into */
export type PriorityTier = 'fix-first' | 'fix-next' | 'optional'

/** A single prioritized issue — the atomic unit of the intelligence output */
export interface PrioritizedIssue {
  /** Unique identifier (from original finding or opportunity) */
  id: string
  /** Human-readable title */
  title: string
  /** Which tier this issue was assigned to */
  priorityTier: PriorityTier
  /** Composite priority score (0–100) — higher = more urgent */
  priorityScore: number
  /** Performance / UX impact estimate (0–100) */
  impactScore: number
  /** Implementation effort — inverted scale: 100 = trivial, 0 = massive effort */
  effortScore: number
  /** Confidence in this recommendation (0–100) */
  confidenceScore: number
  /** Business-oriented explanation: "Users may leave before the page loads" */
  businessNarrative: string
  /** Technical explanation (original description or enriched) */
  technicalDetail: string
  /** Framework-specific hint: "In Next.js, use next/image with priority prop" */
  frameworkHint?: string
  /** Why this matters — expandable reasoning */
  whyItMatters: string
  /** Expected benefit if fixed */
  expectedBenefit: string
  /** Estimated improvement range (qualitative) */
  estimatedImprovement: 'significant' | 'moderate' | 'minor'
  /** Source: was this from Lighthouse or the custom audit engine? */
  source: 'lighthouse' | 'custom-audit' | 'combined'
  /** Original severity from audit engine (if from custom audit) */
  originalSeverity?: 'critical' | 'moderate' | 'minor' | 'info'
  /** Fix instructions */
  fix?: {
    instruction: string
    codeSnippet?: string
    docsUrl?: string
  }
}

// ═══════════════════════════════════════════════
// BUSINESS IMPACT TYPES
// ═══════════════════════════════════════════════

/** Narrative for a single CWV metric */
export interface MetricNarrative {
  metric: string
  rawValue: number
  displayValue: string
  rating: 'good' | 'needs-improvement' | 'poor'
  narrative: string
  /** Category-specific context (ecommerce → conversion; blog → engagement) */
  contextualNote?: string
}

/** Overall business summary for the audited page */
export interface BusinessSummary {
  /** One-liner: "Your page loads slowly and may be losing 20-30% of visitors" */
  headline: string
  /** 2-3 sentence executive summary */
  summary: string
  /** Individual metric narratives */
  metricNarratives: MetricNarrative[]
  /** Overall UX rating */
  overallUxRating: 'excellent' | 'good' | 'needs-work' | 'poor' | 'critical'
}

// ═══════════════════════════════════════════════
// FRAMEWORK DETECTION TYPES
// ═══════════════════════════════════════════════

export type Framework =
  | 'nextjs'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'angular'
  | 'svelte'
  | 'wordpress'
  | 'shopify'
  | 'wix'
  | 'squarespace'
  | 'gatsby'
  | 'astro'
  | 'static'
  | 'unknown'

export interface FrameworkDetection {
  /** Most likely framework */
  framework: Framework
  /** Human-readable name */
  label: string
  /** Confidence 0–100 */
  confidence: number
  /** What signals led to this detection */
  signals: string[]
  /** Whether the detection is strong enough to show framework-specific advice */
  reliable: boolean
}

// ═══════════════════════════════════════════════
// SITE CONTEXT TYPES
// ═══════════════════════════════════════════════

export type SiteCategory =
  | 'ecommerce'
  | 'saas'
  | 'blog'
  | 'portfolio'
  | 'agency'
  | 'landing-page'
  | 'documentation'
  | 'news'
  | 'community'
  | 'general'

export interface SiteContext {
  /** Detected category */
  category: SiteCategory
  /** Human-readable label */
  label: string
  /** Confidence 0–100 */
  confidence: number
  /** Signals that led to this classification */
  signals: string[]
  /** Which metrics matter most for this category (ordered) */
  priorityMetrics: string[]
}

// ═══════════════════════════════════════════════
// TRUST / CONFIDENCE TYPES
// ═══════════════════════════════════════════════

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface TrustAssessment {
  /** Overall confidence in the intelligence report */
  confidenceLevel: ConfidenceLevel
  /** Numeric confidence (0–100) */
  confidenceScore: number
  /** What data sources informed this report */
  evidenceSources: string[]
  /** Any caveats the user should know */
  caveats: string[]
  /** Whether real-user data (RUM) is available */
  hasFieldData: boolean
  /** Suggestion to improve confidence */
  improvementHint?: string
}

// ═══════════════════════════════════════════════
// INTELLIGENCE REPORT — TOP-LEVEL OUTPUT
// ═══════════════════════════════════════════════

/** The complete intelligence report appended to every audit response */
export interface IntelligenceReport {
  /** Version — for backward compatibility */
  version: '1.0'
  /** Timestamp of generation */
  generatedAt: string

  // ── Prioritized Issues ──
  fixFirst: PrioritizedIssue[]
  fixNext: PrioritizedIssue[]
  optional: PrioritizedIssue[]
  totalIssues: number

  // ── Business Context ──
  businessSummary: BusinessSummary

  // ── Detection Results ──
  detectedFramework: FrameworkDetection
  siteContext: SiteContext

  // ── Trust ──
  trust: TrustAssessment
}

// ═══════════════════════════════════════════════
// INPUT TYPES — what the intelligence engine receives
// ═══════════════════════════════════════════════

/** Raw data fed into the intelligence engine from the audit pipeline */
export interface IntelligenceInput {
  /** URL being audited */
  url: string
  /** PSI / Lighthouse result (may be null if PSI failed) */
  psiData: any | null
  /** Custom audit result (may be null if custom audit failed) */
  customAudit: any | null
  /** Raw HTML (if available from custom audit's fetcher) */
  html?: string
  /** HTTP headers from the audited page */
  headers?: Record<string, string>
  /** Whether CrUX field data is available */
  hasFieldData: boolean
}
