// ── Shared types for the custom audit engine ──

export type Severity = 'critical' | 'moderate' | 'minor' | 'info'

export interface Recommendation {
  fix: string             // human-readable fix instruction
  codeSnippet?: string    // concrete code/config example
  docsUrl?: string        // link to relevant documentation
  estimatedImpact: 'high' | 'medium' | 'low'
}

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
  | 'sitemap'
  | 'structured-data'

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
  moderate: number
  minor: number
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
  fromCache: boolean
}
