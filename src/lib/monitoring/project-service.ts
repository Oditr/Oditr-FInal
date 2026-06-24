// ── Project Service ──
// CRUD for monitored projects. Uses Supabase when available, localStorage fallback.

import { supabase } from '@/lib/supabase'
import type { MonitoredProject, MonitoringFrequency } from './types'

const LOCAL_KEY = 'oditr-monitored-projects'

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '')
  }
}

function calcNextScan(frequency: MonitoringFrequency, from: Date = new Date()): string | null {
  if (frequency === 'manual') return null
  const next = new Date(from)
  if (frequency === 'daily') next.setDate(next.getDate() + 1)
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7)
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  return next.toISOString()
}

// ── localStorage helpers ──

function readLocalProjects(): MonitoredProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeLocalProjects(projects: MonitoredProject[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(projects)) } catch {}
}

// ── Public API ──

export async function createProject(
  input: { name: string; url: string; businessType?: string; currency?: string },
  userId?: string | null
): Promise<MonitoredProject> {
  const now = new Date().toISOString()
  const project: MonitoredProject = {
    id: generateId(),
    userId: userId || null,
    name: input.name,
    url: input.url.replace(/\/$/, ''),
    normalizedDomain: normalizeDomain(input.url),
    businessType: input.businessType,
    currency: input.currency,
    monitoringEnabled: false,
    monitoringFrequency: 'manual',
    lastScanAt: null,
    nextScanAt: null,
    lastReportId: null,
    lastOverallScore: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }

  if (userId && supabase) {
    try {
      const { error } = await supabase.from('projects').insert(toDbRow(project))
      if (error) console.error('[project-service] Cloud save failed:', error.message)
    } catch (e) {
      console.error('[project-service] Cloud save exception:', e)
    }
  }

  // Also save to local
  const local = readLocalProjects()
  local.push(project)
  writeLocalProjects(local)

  return project
}

export async function getProjects(userId?: string | null): Promise<MonitoredProject[]> {
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      if (!error && data) return data.map(fromDbRow)
    } catch (e) {
      console.error('[project-service] Cloud fetch exception:', e)
    }
  }
  return readLocalProjects()
}

export async function getProject(projectId: string, userId?: string | null): Promise<MonitoredProject | null> {
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()
      if (!error && data) return fromDbRow(data)
    } catch {}
  }
  return readLocalProjects().find(p => p.id === projectId) || null
}

export async function updateProject(
  projectId: string,
  updates: Partial<MonitoredProject>,
  userId?: string | null
): Promise<MonitoredProject | null> {
  const now = new Date().toISOString()
  const merged = { ...updates, updatedAt: now }

  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(toPartialDbRow(merged))
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single()
      if (!error && data) return fromDbRow(data)
    } catch {}
  }

  // Local fallback
  const local = readLocalProjects()
  const idx = local.findIndex(p => p.id === projectId)
  if (idx >= 0) {
    Object.assign(local[idx], merged)
    writeLocalProjects(local)
    return local[idx]
  }
  return null
}

export async function updateMonitoring(
  projectId: string,
  enabled: boolean,
  frequency: MonitoringFrequency,
  userId?: string | null
): Promise<MonitoredProject | null> {
  const nextScanAt = enabled ? calcNextScan(frequency) : null
  return updateProject(projectId, {
    monitoringEnabled: enabled,
    monitoringFrequency: frequency,
    nextScanAt,
    status: enabled ? 'active' : 'paused',
  }, userId)
}

export async function markScanComplete(
  projectId: string,
  reportId: string,
  score: number,
  frequency: MonitoringFrequency,
  userId?: string | null
): Promise<void> {
  const now = new Date()
  await updateProject(projectId, {
    lastScanAt: now.toISOString(),
    lastReportId: reportId,
    lastOverallScore: score,
    nextScanAt: calcNextScan(frequency, now),
    status: 'active',
  }, userId)
}

export async function getDueProjects(userId?: string | null): Promise<MonitoredProject[]> {
  const now = new Date().toISOString()

  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('monitoring_enabled', true)
        .lte('next_scan_at', now)
        .neq('monitoring_frequency', 'manual')
      if (!error && data) return data.map(fromDbRow)
    } catch {}
  }

  return readLocalProjects().filter(p =>
    p.monitoringEnabled &&
    p.monitoringFrequency !== 'manual' &&
    p.nextScanAt &&
    p.nextScanAt <= now
  )
}

// ── DB row conversion ──

function toDbRow(p: MonitoredProject): Record<string, any> {
  return {
    id: p.id,
    user_id: p.userId,
    name: p.name,
    url: p.url,
    normalized_domain: p.normalizedDomain,
    business_type: p.businessType || null,
    currency: p.currency || null,
    monitoring_enabled: p.monitoringEnabled,
    monitoring_frequency: p.monitoringFrequency,
    last_scan_at: p.lastScanAt,
    next_scan_at: p.nextScanAt,
    last_report_id: p.lastReportId,
    last_overall_score: p.lastOverallScore,
    status: p.status,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

function toPartialDbRow(updates: Partial<MonitoredProject>): Record<string, any> {
  const row: Record<string, any> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.url !== undefined) row.url = updates.url
  if (updates.monitoringEnabled !== undefined) row.monitoring_enabled = updates.monitoringEnabled
  if (updates.monitoringFrequency !== undefined) row.monitoring_frequency = updates.monitoringFrequency
  if (updates.lastScanAt !== undefined) row.last_scan_at = updates.lastScanAt
  if (updates.nextScanAt !== undefined) row.next_scan_at = updates.nextScanAt
  if (updates.lastReportId !== undefined) row.last_report_id = updates.lastReportId
  if (updates.lastOverallScore !== undefined) row.last_overall_score = updates.lastOverallScore
  if (updates.status !== undefined) row.status = updates.status
  if (updates.updatedAt !== undefined) row.updated_at = updates.updatedAt
  return row
}

function fromDbRow(row: any): MonitoredProject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    url: row.url,
    normalizedDomain: row.normalized_domain,
    businessType: row.business_type,
    currency: row.currency,
    monitoringEnabled: row.monitoring_enabled,
    monitoringFrequency: row.monitoring_frequency,
    lastScanAt: row.last_scan_at,
    nextScanAt: row.next_scan_at,
    lastReportId: row.last_report_id,
    lastOverallScore: row.last_overall_score,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
