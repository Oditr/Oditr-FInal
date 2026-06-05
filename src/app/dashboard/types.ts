// ── Dashboard shared types ──

import type { IntelligenceReport } from '@/lib/intelligence'

export type CwvMetric = { value: string; score: number; numericValue?: number }
export type FieldDataMetric = { p75: number; category: string } | null
export type Severity = 'critical' | 'moderate' | 'minor' | 'info'

export type Recommendation = {
  fix: string
  codeSnippet?: string
  docsUrl?: string
  estimatedImpact: 'high' | 'medium' | 'low'
}

export type AuditFinding = {
  id: string
  title: string
  description: string
  severity: Severity
  value?: string
  element?: string
  recommendation?: Recommendation
  estimatedUplift?: number
}

export type CategoryResult = {
  category: string
  label: string
  score: number
  passed: number
  failed: number
  findings: AuditFinding[]
}

export type CustomAudit = {
  url: string
  fetchedAt: string
  duration: number
  overallScore: number
  categories: CategoryResult[]
  totalFindings: number
  critical: number
  moderate: number
  minor: number
}

export type OpportunityFix = {
  fix: string
  codeSnippet?: string
  docsUrl?: string
}

export type AuditResult = {
  url: string
  strategy: string
  fetchedAt: string
  lighthouseVersion?: string
  scores: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
  } | null
  cwv: {
    lcp: CwvMetric; inp: CwvMetric; cls: CwvMetric
    fcp: CwvMetric; ttfb: CwvMetric; si: CwvMetric; tbt: CwvMetric
  } | null
  fieldData: {
    lcp: FieldDataMetric; inp: FieldDataMetric; cls: FieldDataMetric; fid: FieldDataMetric
    overallCategory: string
  } | null
  opportunities: {
    id: string; title: string; description: string
    score: number; displayValue: string; impact: string
  }[]
  diagnostics: {
    id: string; title: string; displayValue: string; score: number | null
  }[]
  customAudit?: CustomAudit | null
  healthScore?: number
  fromCache?: boolean
  partial?: boolean
  partialReason?: string
  liteMode?: boolean
  /** VitalFix Intelligence Report — prioritized issues, business impact, framework detection */
  intelligence?: IntelligenceReport | null
}

// Re-export intelligence types for convenience in dashboard components
export type { IntelligenceReport, PrioritizedIssue, PriorityTier, BusinessSummary, MetricNarrative, FrameworkDetection, SiteContext, TrustAssessment } from '@/lib/intelligence'
