// ── Unified Scan Store ──
// Routes persistence to Supabase (if authenticated) or localStorage (fallback).
// All public functions accept an optional userId — when provided AND Supabase is
// configured, data goes to the cloud. Otherwise, localStorage is used.

import { supabase } from '@/lib/supabase'
import type { AuditResult } from '@/app/dashboard/types'
import {
  saveScan as localSave,
  getHistory as localGetHistory,
  getUrlHistory as localGetUrlHistory,
  deleteScan as localDelete,
  clearHistory as localClear,
  exportHistoryAsJson as localExport,
  type StoredScan,
} from '@/lib/scan-history'

// ── Re-export utilities that don't depend on storage backend ──
export { relativeTime, groupByDate, type StoredScan } from '@/lib/scan-history'

// ── Helpers: convert between StoredScan and DB row ──

interface SaveOptions {
  userId?: string | null;
  teamId?: string | null;
  projectId?: string | null;
}

function toDbRow(scan: StoredScan, options: SaveOptions) {
  return {
    id: scan.id,
    user_id: options.userId,
    team_id: options.teamId,
    project_id: options.projectId,
    url: scan.url,
    strategy: scan.strategy,
    fetched_at: scan.fetchedAt,
    health_score: scan.healthScore,
    scores: scan.scores,
    cwv_summary: scan.cwvSummary,
    custom_audit_score: scan.customAuditScore,
    total_findings: scan.totalFindings,
    critical: scan.critical,
    moderate: scan.moderate,
    minor: scan.minor,
    field_overall_category: scan.fieldOverallCategory,
    partial: scan.partial,
    intelligence_snapshot: scan.intelligenceSnapshot,
  }
}

function fromDbRow(row: any): StoredScan & { teamId?: string; projectId?: string } {
  return {
    id: row.id,
    url: row.url,
    strategy: row.strategy,
    fetchedAt: row.fetched_at,
    healthScore: row.health_score,
    scores: row.scores,
    cwvSummary: row.cwv_summary,
    customAuditScore: row.custom_audit_score,
    totalFindings: row.total_findings,
    critical: row.critical,
    moderate: row.moderate,
    minor: row.minor,
    fieldOverallCategory: row.field_overall_category,
    partial: row.partial,
    intelligenceSnapshot: row.intelligence_snapshot,
    teamId: row.team_id,
    projectId: row.project_id,
  }
}

// ── Save a scan ──

export async function saveScan(result: AuditResult, options?: SaveOptions): Promise<StoredScan> {
  // Always save to localStorage as the local version of saveScan returns StoredScan
  const stored = localSave(result)

  // If authenticated + Supabase configured, also persist to cloud
  if (options?.userId && supabase) {
    try {
      const { error } = await supabase
        .from('scans')
        .upsert(toDbRow(stored, options), { onConflict: 'id' })
      if (error) console.error('[scan-store] Cloud save failed:', error.message)
    } catch (e) {
      console.error('[scan-store] Cloud save exception:', e)
    }
  }

  return stored
}

// ── Get all history ──

export async function getHistory(userId?: string | null, teamId?: string | null): Promise<StoredScan[]> {
  if ((userId || teamId) && supabase) {
    try {
      let query = supabase.from('scans').select('*')
      
      if (teamId) {
        query = query.eq('team_id', teamId)
      } else if (userId) {
        query = query.eq('user_id', userId).is('team_id', null)
      }

      const { data, error } = await query
        .order('fetched_at', { ascending: false })
        .limit(50)

      if (!error && data) return data.map(fromDbRow)
      console.error('[scan-store] Cloud fetch failed:', error?.message)
    } catch (e) {
      console.error('[scan-store] Cloud fetch exception:', e)
    }
  }

  // Fallback to localStorage
  return localGetHistory()
}

// ── Get URL-specific history ──

export async function getUrlHistory(url: string, userId?: string | null, teamId?: string | null): Promise<StoredScan[]> {
  if ((userId || teamId) && supabase) {
    try {
      let query = supabase.from('scans').select('*')
      
      if (teamId) {
        query = query.eq('team_id', teamId)
      } else if (userId) {
        query = query.eq('user_id', userId).is('team_id', null)
      }

      const { data, error } = await query
        .ilike('url', `%${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}%`)
        .order('fetched_at', { ascending: true })

      if (!error && data) return data.map(fromDbRow)
    } catch (e) {
      console.error('[scan-store] Cloud URL history exception:', e)
    }
  }

  return localGetUrlHistory(url)
}

// ── Delete a scan ──

export async function deleteScan(id: string, userId?: string | null): Promise<void> {
  // Always remove from localStorage
  localDelete(id)

  if (userId && supabase) {
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (error) console.error('[scan-store] Cloud delete failed:', error.message)
    } catch (e) {
      console.error('[scan-store] Cloud delete exception:', e)
    }
  }
}

// ── Clear all history ──

export async function clearHistory(userId?: string | null): Promise<void> {
  localClear()

  if (userId && supabase) {
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('user_id', userId)
      if (error) console.error('[scan-store] Cloud clear failed:', error.message)
    } catch (e) {
      console.error('[scan-store] Cloud clear exception:', e)
    }
  }
}

// ── Export (always reads from current source) ──

export async function exportHistory(userId?: string | null, format: 'json' | 'csv' = 'json'): Promise<string> {
  let scans: StoredScan[]
  if (userId && supabase) {
    scans = await getHistory(userId)
  } else {
    scans = localGetHistory()
  }

  if (format === 'csv') {
    const headers = ['URL', 'Strategy', 'Date', 'Health Score', 'Performance', 'Accessibility', 'Best Practices', 'SEO', 'Site Audit', 'Critical', 'Moderate', 'Minor', 'Total Findings']
    const rows = scans.map(s => [
      s.url,
      s.strategy,
      new Date(s.fetchedAt).toISOString(),
      s.healthScore,
      s.scores?.performance ?? '',
      s.scores?.accessibility ?? '',
      s.scores?.bestPractices ?? '',
      s.scores?.seo ?? '',
      s.customAuditScore ?? '',
      s.critical,
      s.moderate,
      s.minor,
      s.totalFindings,
    ].map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    return URL.createObjectURL(blob)
  }

  // JSON (default)
  const blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' })
  return URL.createObjectURL(blob)
}

// ── Migrate localStorage → Supabase (one-time on first login) ──

const SYNC_FLAG = 'vitalfix-synced'

export async function migrateLocalToCloud(userId: string): Promise<{ migrated: number }> {
  if (!supabase) return { migrated: 0 }

  // Check if already synced
  try {
    if (localStorage.getItem(SYNC_FLAG) === userId) return { migrated: 0 }
  } catch { return { migrated: 0 } }

  // Read all local scans
  const localScans = localGetHistory()
  if (localScans.length === 0) {
    try { localStorage.setItem(SYNC_FLAG, userId) } catch {}
    return { migrated: 0 }
  }

  console.log(`[scan-store] Migrating ${localScans.length} local scans to Supabase…`)

  // Upsert all scans to cloud
  const rows = localScans.map(scan => toDbRow(scan, { userId }))
  const { error } = await supabase
    .from('scans')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    console.error('[scan-store] Migration failed:', error.message)
    return { migrated: 0 }
  }

  // Success — clear localStorage and set sync flag
  localClear()
  try {
    localStorage.setItem(SYNC_FLAG, userId)
    // Also clear the legacy full result
    localStorage.removeItem('vitalfix-last-audit')
  } catch {}

  console.log(`[scan-store] ✅ Migrated ${localScans.length} scans to cloud.`)
  return { migrated: localScans.length }
}
