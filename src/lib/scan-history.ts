// ── Scan History — localStorage persistence layer ──
// Stores up to MAX_SCANS audit snapshots, auto-prunes oldest (FIFO)

import type { AuditResult } from '@/app/dashboard/types'

const STORAGE_KEY = 'vitalfix-scan-history'
const MAX_SCANS = 50

// ── Stored scan shape (slimmed from full AuditResult) ──
export interface StoredScan {
  id: string               // unique ID (timestamp-based)
  url: string
  strategy: string
  fetchedAt: string
  healthScore: number
  scores: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
  } | null
  cwvSummary: {
    lcp: string; inp: string; cls: string
    fcp: string; ttfb: string; tbt: string; si: string
  } | null
  customAuditScore: number | null
  totalFindings: number
  critical: number
  moderate: number
  minor: number
  fieldOverallCategory: string | null
  partial: boolean
  intelligenceSnapshot?: any | null
}

// ── Helpers ──

function generateId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function readStore(): StoredScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(scans: StoredScan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))
  } catch {
    // localStorage full — prune aggressively and retry
    const pruned = scans.slice(-Math.floor(MAX_SCANS / 2))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    } catch { /* truly full — give up silently */ }
  }
}

// ── Slim down AuditResult → StoredScan ──
function toStoredScan(result: AuditResult): StoredScan {
  return {
    id: generateId(),
    url: result.url,
    strategy: result.strategy,
    fetchedAt: result.fetchedAt,
    healthScore: result.healthScore ?? (result.scores?.performance ?? 0),
    scores: result.scores ? { ...result.scores } : null,
    cwvSummary: result.cwv ? {
      lcp: result.cwv.lcp.value,
      inp: result.cwv.inp.value,
      cls: result.cwv.cls.value,
      fcp: result.cwv.fcp.value,
      ttfb: result.cwv.ttfb.value,
      tbt: result.cwv.tbt.value,
      si: result.cwv.si.value,
    } : null,
    customAuditScore: result.customAudit?.overallScore ?? null,
    totalFindings: result.customAudit?.totalFindings ?? 0,
    critical: result.customAudit?.critical ?? 0,
    moderate: result.customAudit?.moderate ?? 0,
    minor: result.customAudit?.minor ?? 0,
    fieldOverallCategory: result.fieldData?.overallCategory ?? null,
    partial: result.partial ?? false,
    intelligenceSnapshot: result.intelligence ? {
      fixFirst: result.intelligence.fixFirst.slice(0, 5),
      fixNext: result.intelligence.fixNext.slice(0, 5)
    } : null,
  }
}

// ── Public API ──

/** Save a new audit result to history */
export function saveScan(result: AuditResult): StoredScan {
  const scans = readStore()
  const stored = toStoredScan(result)
  scans.push(stored)

  // Auto-prune to MAX_SCANS (keep newest)
  while (scans.length > MAX_SCANS) {
    scans.shift()
  }

  writeStore(scans)
  return stored
}

/** Get all scans, newest first */
export function getHistory(): StoredScan[] {
  return readStore().reverse()
}

/** Get scans for a specific URL (normalized), chronological order (oldest first) */
export function getUrlHistory(url: string): StoredScan[] {
  const normalized = normalizeUrl(url)
  return readStore().filter(s => normalizeUrl(s.url) === normalized)
}

/** Delete a single scan by ID */
export function deleteScan(id: string): void {
  const scans = readStore().filter(s => s.id !== id)
  writeStore(scans)
}

/** Clear all scan history */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

/** Export all history as a JSON blob URL (for download) */
export function exportHistoryAsJson(): string {
  const scans = readStore()
  const blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' })
  return URL.createObjectURL(blob)
}

/** Get the number of stored scans */
export function getScanCount(): number {
  return readStore().length
}

// ── URL normalization (strip trailing slash, www, protocol) ──
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search
  } catch {
    return url.toLowerCase().replace(/\/$/, '')
  }
}

// ── Relative time formatting ──
export function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 2 * day) return 'Yesterday'
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`

  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    ...(diff > 365 * day ? { year: 'numeric' } : {}),
  })
}

// ── Date grouping for timeline ──
export function groupByDate(scans: StoredScan[]): { label: string; scans: StoredScan[] }[] {
  const groups = new Map<string, StoredScan[]>()

  for (const scan of scans) {
    const date = new Date(scan.fetchedAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))

    let label: string
    if (diffDays === 0) label = 'Today'
    else if (diffDays === 1) label = 'Yesterday'
    else if (diffDays < 7) label = 'This Week'
    else if (diffDays < 30) label = 'This Month'
    else label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(scan)
  }

  return Array.from(groups.entries()).map(([label, scans]) => ({ label, scans }))
}
