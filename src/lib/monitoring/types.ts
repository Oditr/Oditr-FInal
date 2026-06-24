// ── Monitoring & Regression Detection Engine — Types ──

// ── Regression Severity ──
export type RegressionSeverity =
  | 'critical_regression'
  | 'high_regression'
  | 'moderate_regression'
  | 'minor_regression'
  | 'no_significant_change'
  | 'improvement'

export type MonitoringFrequency = 'manual' | 'daily' | 'weekly' | 'monthly'
export type ProjectStatus = 'active' | 'paused' | 'error'

// ── Monitored Project ──
export interface MonitoredProject {
  id: string
  userId: string | null
  name: string
  url: string
  normalizedDomain: string
  businessType?: string
  currency?: string
  monitoringEnabled: boolean
  monitoringFrequency: MonitoringFrequency
  lastScanAt: string | null
  nextScanAt: string | null
  lastReportId: string | null
  lastOverallScore: number | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

// ── Audit Snapshot (full result saved for comparison) ──
export interface AuditSnapshot {
  id: string
  projectId: string
  url: string
  overallScore: number
  categoryScores: Record<string, CategoryScoreSnapshot> | null
  cwv: CwvSnapshot | null
  issues: IssueSnapshot[]
  revenueImpactSummary: RevenueImpactSnapshot | null
  aiReadinessSummary: AiReadinessSnapshot | null
  lighthouseScores: LighthouseScoresSnapshot | null
  scanStatus: 'complete' | 'partial' | 'failed'
  scanDuration: number
  errorInfo?: string
  createdAt: string
}

export interface CategoryScoreSnapshot {
  category: string
  score: number
  issueCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
}

export interface CwvSnapshot {
  lcp: number | null   // ms
  cls: number | null
  inp: number | null   // ms
  fcp: number | null   // ms
  tbt: number | null   // ms
  si: number | null    // ms
  ttfb: number | null  // ms
}

export interface IssueSnapshot {
  id: string
  title: string
  description: string
  category: string
  severity: string
  affectedUrl: string
  recommendation?: string
  fixSnippet?: string
  revenueRelevant?: boolean
  experimental?: boolean
}

export interface RevenueImpactSnapshot {
  totalEstimatedRisk: number
  currency: string
  topAffectedPage?: string
  topAffectedFunnelStage?: string
  issueCount: number
}

export interface AiReadinessSnapshot {
  score: number
  status: string
  llmsTxtExists: boolean
  crawlerAccessSummary: string // e.g. "8/11 allowed"
  structuredDataFound: boolean
  sitemapExists: boolean
}

export interface LighthouseScoresSnapshot {
  performance: number | null
  accessibility: number | null
  bestPractices: number | null
  seo: number | null
}

// ── Issue Diff ──
export type IssueDiffStatus = 'new' | 'existing' | 'resolved' | 'worsened' | 'improved'

export interface IssueDiff {
  issue: IssueSnapshot
  status: IssueDiffStatus
  previousSeverity?: string
  currentSeverity?: string
}

// ── Vitals Delta ──
export type VitalChangeStatus = 'improved' | 'unchanged' | 'worsened' | 'critical'

export interface VitalDelta {
  metric: string
  label: string
  previousValue: number | null
  currentValue: number | null
  delta: number | null
  unit: string
  status: VitalChangeStatus
}

// ── Score Delta ──
export interface ScoreDelta {
  category: string
  label: string
  previousScore: number
  currentScore: number
  delta: number
}

// ── Regression Report ──
export interface RegressionReport {
  id: string
  projectId: string
  previousReportId: string
  currentReportId: string
  overallScoreDelta: number
  previousScore: number
  currentScore: number
  categoryScoreDeltas: ScoreDelta[]
  vitalsDeltas: VitalDelta[]
  revenueRiskDelta: number | null
  aiReadinessDelta: number | null
  newIssues: IssueSnapshot[]
  resolvedIssues: IssueSnapshot[]
  worsenedIssues: IssueDiff[]
  improvedIssues: IssueDiff[]
  severity: RegressionSeverity
  summary: string
  recommendedActions: string[]
  confidence: 'high' | 'medium' | 'low'
  alertPayload: AlertPayload | null
  createdAt: string
}

// ── Alert Payload ──
export interface AlertPayload {
  projectId: string
  reportId: string
  url: string
  regressionSeverity: RegressionSeverity
  summary: string
  scoreDelta: number
  criticalIssueCount: number
  highIssueCount: number
  revenueRiskDelta: number | null
  topAffectedPage?: string
  recommendedAction: string
  createdAt: string
}

// ── Score Trend Point ──
export interface ScoreTrendPoint {
  reportId: string
  date: string
  overallScore: number
  categoryScores: Record<string, number>
  cwv: CwvSnapshot | null
}
