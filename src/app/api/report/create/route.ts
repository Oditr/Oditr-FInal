// ── Create Shareable Report API ──
// POST /api/report/create — generates a public, shareable audit report URL.

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/analytics'

// ── Generate short ID (nanoid-style, no dependency) ──
function generateId(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => chars[b % chars.length]).join('')
}

// ── Rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 3600_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { url, strategy, healthScore, scores, cwvSummary, topIssues, customAudit, categoryScores, issues } = body

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const id = generateId()
  const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vitalfix.dev'}/report/${id}`

  if (supabase) {
    try {
      await supabase.from('public_reports').insert({
        id,
        url,
        strategy: strategy || 'mobile',
        health_score: healthScore ?? null,
        scores: scores || null,
        cwv_summary: cwvSummary || null,
        top_issues: topIssues || [],
        custom_audit: customAudit ? {
          overallScore: customAudit.overallScore,
          totalFindings: customAudit.totalFindings,
          critical: customAudit.critical,
          medium: customAudit.medium,
          low: customAudit.low,
        } : null,
        categoryScores: categoryScores || null,
        issues: issues || null,
      })
    } catch (e) {
      console.error('[report] Create failed:', (e as Error).message)
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }
  }

  // Track analytics
  trackEvent({
    event_type: 'feature_use',
    metadata: { action: 'report_created', url, report_id: id },
  }).catch(() => {})

  return NextResponse.json({ id, reportUrl })
}
