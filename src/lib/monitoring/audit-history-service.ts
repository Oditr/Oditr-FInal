// ── Audit History Service ──
// Saves and retrieves full audit snapshots for comparison.
// Uses Supabase when available, localStorage fallback.

import { supabase } from '@/lib/supabase'
import type { AuditSnapshot, IssueSnapshot, CwvSnapshot, AiReadinessSnapshot, RevenueImpactSnapshot, LighthouseScoresSnapshot, CategoryScoreSnapshot } from './types'

const LOCAL_KEY = 'oditr-audit-reports'
const MAX_LOCAL_REPORTS = 30

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ── Convert audit API response to AuditSnapshot ──

export function auditResultToSnapshot(
  projectId: string,
  apiResponse: any
): AuditSnapshot {
  const now = new Date().toISOString()

  // Extract CWV as numeric values
  const cwv: CwvSnapshot | null = apiResponse.cwv ? {
    lcp: apiResponse.cwv.lcp?.numericValue ?? null,
    cls: apiResponse.cwv.cls?.numericValue ?? null,
    inp: apiResponse.cwv.inp?.numericValue ?? null,
    fcp: apiResponse.cwv.fcp?.numericValue ?? null,
    tbt: apiResponse.cwv.tbt?.numericValue ?? null,
    si: apiResponse.cwv.si?.numericValue ?? null,
    ttfb: apiResponse.cwv.ttfb?.numericValue ?? null,
  } : null

  // Extract issues
  const issues: IssueSnapshot[] = (apiResponse.issues || []).map((i: any) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    severity: i.severity,
    affectedUrl: i.affectedUrl || apiResponse.url,
    recommendation: i.recommendation,
    fixSnippet: i.fixSnippet,
    revenueRelevant: i.revenueRelevant,
    experimental: i.experimental,
  }))

  // Category scores
  const categoryScores: Record<string, CategoryScoreSnapshot> | null =
    apiResponse.categoryScores
      ? Object.fromEntries(
          Object.entries(apiResponse.categoryScores).map(([k, v]: [string, any]) => [
            k,
            {
              category: k,
              score: v.score ?? 0,
              issueCount: v.issueCount ?? 0,
              criticalCount: v.criticalCount ?? 0,
              highCount: v.highCount ?? 0,
              mediumCount: v.mediumCount ?? 0,
              lowCount: v.lowCount ?? 0,
            },
          ])
        )
      : null

  // AI Readiness summary
  const aiReadinessSummary: AiReadinessSnapshot | null = apiResponse.aiReadiness ? {
    score: apiResponse.aiReadiness.score ?? 0,
    status: apiResponse.aiReadiness.status ?? 'Unknown',
    llmsTxtExists: apiResponse.aiReadiness.llmsTxt?.exists ?? false,
    crawlerAccessSummary: summarizeCrawlerAccess(apiResponse.aiReadiness.crawlerAccess),
    structuredDataFound: apiResponse.aiReadiness.structuredData?.found ?? false,
    sitemapExists: apiResponse.aiReadiness.discoverability?.sitemapExists ?? false,
  } : null

  // Lighthouse scores
  const lighthouseScores: LighthouseScoresSnapshot | null = apiResponse.scores ? {
    performance: apiResponse.scores.performance ?? null,
    accessibility: apiResponse.scores.accessibility ?? null,
    bestPractices: apiResponse.scores.bestPractices ?? null,
    seo: apiResponse.scores.seo ?? null,
  } : null

  return {
    id: generateId(),
    projectId,
    url: apiResponse.url,
    overallScore: apiResponse.healthScore ?? 0,
    categoryScores,
    cwv,
    issues,
    revenueImpactSummary: null, // Populated if revenue impact engine runs
    aiReadinessSummary,
    lighthouseScores,
    scanStatus: apiResponse.partial ? 'partial' : 'complete',
    scanDuration: apiResponse.customAudit?.duration ?? 0,
    errorInfo: apiResponse.partialReason,
    createdAt: now,
  }
}

function summarizeCrawlerAccess(crawlerAccess: any[] | undefined): string {
  if (!crawlerAccess || crawlerAccess.length === 0) return 'Unknown'
  const allowed = crawlerAccess.filter((c: any) => c.status === 'allowed').length
  return `${allowed}/${crawlerAccess.length} allowed`
}

// ── Save audit snapshot ──

export async function saveAuditSnapshot(
  snapshot: AuditSnapshot,
  userId?: string | null
): Promise<AuditSnapshot> {
  if (userId && supabase) {
    try {
      const { error } = await supabase.from('audit_reports').insert({
        id: snapshot.id,
        project_id: snapshot.projectId,
        user_id: userId,
        url: snapshot.url,
        overall_score: snapshot.overallScore,
        category_scores: snapshot.categoryScores,
        cwv: snapshot.cwv,
        issues: snapshot.issues,
        revenue_impact_summary: snapshot.revenueImpactSummary,
        ai_readiness_summary: snapshot.aiReadinessSummary,
        lighthouse_scores: snapshot.lighthouseScores,
        scan_status: snapshot.scanStatus,
        scan_duration: snapshot.scanDuration,
        error_info: snapshot.errorInfo,
        created_at: snapshot.createdAt,
      })
      if (error) console.error('[audit-history] Cloud save failed:', error.message)
    } catch (e) {
      console.error('[audit-history] Cloud save exception:', e)
    }
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    try {
      const reports = readLocalReports()
      reports.push(snapshot)
      while (reports.length > MAX_LOCAL_REPORTS) reports.shift()
      writeLocalReports(reports)
    } catch {}
  }

  return snapshot
}

// ── Get history for a project ──

export async function getProjectHistory(
  projectId: string,
  userId?: string | null,
  limit = 20
): Promise<AuditSnapshot[]> {
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (!error && data) return data.map(fromDbRow)
    } catch {}
  }

  return readLocalReports()
    .filter(r => r.projectId === projectId)
    .reverse()
    .slice(0, limit)
}

// ── Get latest two snapshots for comparison ──

export async function getLatestTwoSnapshots(
  projectId: string,
  userId?: string | null
): Promise<{ previous: AuditSnapshot | null; current: AuditSnapshot | null }> {
  const history = await getProjectHistory(projectId, userId, 2)
  return {
    current: history[0] || null,
    previous: history[1] || null,
  }
}

// ── Get a single snapshot by ID ──

export async function getSnapshot(
  reportId: string,
  userId?: string | null
): Promise<AuditSnapshot | null> {
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('id', reportId)
        .single()
      if (!error && data) return fromDbRow(data)
    } catch {}
  }

  return readLocalReports().find(r => r.id === reportId) || null
}

// ── localStorage helpers ──

function readLocalReports(): AuditSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeLocalReports(reports: AuditSnapshot[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(reports)) } catch {}
}

function fromDbRow(row: any): AuditSnapshot {
  return {
    id: row.id,
    projectId: row.project_id,
    url: row.url,
    overallScore: row.overall_score,
    categoryScores: row.category_scores,
    cwv: row.cwv,
    issues: row.issues || [],
    revenueImpactSummary: row.revenue_impact_summary,
    aiReadinessSummary: row.ai_readiness_summary,
    lighthouseScores: row.lighthouse_scores,
    scanStatus: row.scan_status,
    scanDuration: row.scan_duration,
    errorInfo: row.error_info,
    createdAt: row.created_at,
  }
}
