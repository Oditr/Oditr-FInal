import { createClient } from '@supabase/supabase-js'
import type { ClientReport, ReportType } from './types'
import { getAgencyBranding } from './branding-service'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateShareId(): string {
  // Generate a random, unguessable string
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createClientReport({
  userId,
  projectId,
  sourceAuditReportId,
  reportType,
  selectedSections,
  title,
  summary
}: {
  userId: string
  projectId: string
  sourceAuditReportId: string
  reportType: ReportType
  selectedSections: string[]
  title?: string
  summary?: string
}): Promise<ClientReport> {
  const db = getDb()

  // 1. Fetch source audit report
  const { data: audit, error: auditErr } = await db
    .from('audit_reports')
    .select('*')
    .eq('id', sourceAuditReportId)
    .eq('user_id', userId)
    .single()

  if (auditErr || !audit) {
    throw new Error('Audit report not found or access denied')
  }

  // 2. Fetch project details
  const { data: project, error: projErr } = await db
    .from('projects')
    .select('name, url, business_type, currency, clients(client_name, company_name)')
    .eq('id', projectId)
    .single()

  if (projErr || !project) {
    throw new Error('Project not found')
  }

  // 3. Fetch agency branding (snapshot it)
  const branding = await getAgencyBranding(userId)

  // 4. Construct the flattened report data object
  // We extract exactly what we need so the shareable link payload isn't gigantic,
  // but since we rely on the sections, we'll store the relevant chunks.
  const reportData = {
    projectInfo: {
      name: project.name,
      url: project.url,
      businessType: project.business_type,
      currency: project.currency,
      clientName: Array.isArray(project.clients) ? project.clients[0]?.client_name : (project.clients as any)?.client_name,
      companyName: Array.isArray(project.clients) ? project.clients[0]?.company_name : (project.clients as any)?.company_name
    },
    auditInfo: {
      id: audit.id,
      createdAt: audit.created_at,
      overallScore: audit.overall_score,
      categoryScores: audit.category_scores,
      revenueImpactSummary: audit.revenue_impact_summary,
      aiReadinessSummary: audit.ai_readiness_summary,
      cwv: audit.cwv
    },
    issues: audit.issues // All issues are included, but frontend handles filtering based on reportType/sections
  }

  const shareId = generateShareId()
  const id = `crep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const { data: report, error } = await db
    .from('client_reports')
    .insert({
      id,
      project_id: projectId,
      user_id: userId,
      source_audit_report_id: sourceAuditReportId,
      report_type: reportType,
      selected_sections: selectedSections,
      title: title || 'Website Audit Report',
      summary: summary || null,
      branding: branding || null,
      report_data: reportData,
      share_id: shareId,
      is_public: true,
      password_protected: false
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create client report: ${error.message}`)

  return {
    id: report.id,
    projectId: report.project_id,
    userId: report.user_id,
    sourceAuditReportId: report.source_audit_report_id,
    reportType: report.report_type as ReportType,
    selectedSections: report.selected_sections,
    title: report.title,
    summary: report.summary,
    branding: report.branding,
    reportData: report.report_data,
    shareId: report.share_id,
    isPublic: report.is_public,
    passwordProtected: report.password_protected,
    expiresAt: report.expires_at,
    createdAt: report.created_at,
    updatedAt: report.updated_at
  }
}

export async function getClientReportByShareId(shareId: string): Promise<ClientReport | null> {
  const db = getDb()
  const { data: row, error } = await db
    .from('client_reports')
    .select('*')
    .eq('share_id', shareId)
    .single()

  if (error || !row) return null

  // Ensure it's public and not expired
  if (!row.is_public) return null
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null

  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    sourceAuditReportId: row.source_audit_report_id,
    reportType: row.report_type as ReportType,
    selectedSections: row.selected_sections,
    title: row.title,
    summary: row.summary,
    branding: row.branding,
    reportData: row.report_data,
    shareId: row.share_id,
    isPublic: row.is_public,
    passwordProtected: row.password_protected,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listClientReports(projectId: string, userId: string): Promise<ClientReport[]> {
  const db = getDb()
  const { data, error } = await db
    .from('client_reports')
    .select('id, project_id, user_id, source_audit_report_id, report_type, title, share_id, is_public, created_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list client reports: ${error.message}`)

  return (data || []).map(row => ({
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    sourceAuditReportId: row.source_audit_report_id,
    reportType: row.report_type as ReportType,
    selectedSections: [], // Excluded from minimal list
    title: row.title,
    summary: null,
    branding: null,
    reportData: {},
    shareId: row.share_id,
    isPublic: row.is_public,
    passwordProtected: false,
    expiresAt: null,
    createdAt: row.created_at,
    updatedAt: row.created_at
  }))
}
