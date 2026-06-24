// ── Shared types for the custom audit engine ──

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

// We keep the internal custom categories mostly the same, but map them to UnifiedCategory later,
// OR we can just migrate them right now. The prompt specifies:
// "performance | seo | accessibility | security | broken_links | images | mobile | ai_readiness"
export type UnifiedCategory = 'performance' | 'seo' | 'accessibility' | 'security' | 'broken_links' | 'images' | 'mobile' | 'ai_readiness'

// Keep the old type for backward compatibility in internal modules, but we'll map them during normalization.
export type AuditCategory =
  | 'broken-links'
  | 'images'
  | 'assets'
  | 'meta-tags'
  | 'headings'
  | 'security'
  | 'mobile'
  | 'accessibility'
  | 'ai-readiness'

export interface Recommendation {
  fix: string             // human-readable fix instruction
  codeSnippet?: string    // concrete code/config example
  docsUrl?: string        // link to relevant documentation
  estimatedImpact: 'high' | 'medium' | 'low'
  fixDifficulty?: 'easy' | 'medium' | 'hard' | 'unknown'
}

// Old format (used internally by custom modules before normalization)
export interface AuditFinding {
  id: string
  title: string
  description: string
  severity: Severity
  category: AuditCategory
  value?: string           // e.g. "403", "250 KB", "missing"
  element?: string         // e.g. "<img src=...>"
  recommendation?: Recommendation
  estimatedUplift?: number // estimated score points gained if fixed (0–100)
}

// ── Unified Issue Schema (as requested) ──
export interface AuditIssue {
  id: string
  title: string
  description: string
  category: UnifiedCategory
  severity: Severity
  affectedUrl: string
  evidence: Record<string, any>
  impact: string
  recommendation: string
  fixSnippet?: string
  fixDifficulty: 'easy' | 'medium' | 'hard' | 'unknown'
  revenueRelevant: boolean
  createdAt: string
}

export interface CategoryResult {
  category: AuditCategory
  label: string
  score: number         // 0–100
  passed: number
  failed: number
  findings: AuditFinding[]
}

export interface CustomAuditResult {
  url: string
  fetchedAt: string
  duration: number      // ms
  overallScore: number  // 0–100
  categories: CategoryResult[]
  totalFindings: number
  critical: number
  high: number
  medium: number
  low: number
}

export interface FetchResult {
  html: string
  headers: Record<string, string>
  statusCode: number
  url: string           // final URL after redirects
  timing: number        // ms
}

// Combined response from /api/audit/full
export interface UnifiedAuditResult {
  lighthouse: any       // existing PSI result shape
  customAudit: CustomAuditResult
  healthScore: number   // combined 0-100
  categoryScores?: Record<UnifiedCategory, CategoryScore> // The new unified scores
  issues?: AuditIssue[] // The normalized list of all issues
  fromCache: boolean
  partial?: boolean
  partialReason?: string
  auditContext?: any
  regionalInsights?: any
  cwvRatings?: any
}

// ── New Scoring System Schema ──
export interface CategoryScore {
  category: UnifiedCategory
  score: number
  issueCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  summary: string
}
