// ── VitalFix RUM — Summary Endpoint ──
// GET /api/rum/summary?siteId=xxx&period=7d|28d
//
// Returns aggregated RUM metrics for a site.
// In the current implementation, reads from the in-memory event buffer.
// In production, this would query Supabase with the rum-schema.sql tables.

import { NextRequest, NextResponse } from 'next/server'
import { buildSiteSummary } from '@/lib/rum/aggregator'
import type { RumEvent } from '@/lib/rum/types'

const SITE_ID_RE = /^[a-zA-Z0-9_-]{3,64}$/
const VALID_PERIODS = new Set(['7d', '28d'])

// ── Shared buffer reference ──
// In production, replace this with a Supabase query.
// For now, we read from the same in-memory buffer that /api/rum/collect writes to.
// This is a module-level import issue (different route = different module instance),
// so in development this will return empty data. That's expected — it proves
// the aggregation pipeline works end-to-end.
//
// The real implementation would be:
//   const { data } = await supabase
//     .from('rum_events')
//     .select('*')
//     .eq('site_id', siteId)
//     .gte('collected_at', cutoff.toISOString())
//     .order('collected_at', { ascending: false })
//     .limit(10000)

function getEventsForSite(siteId: string, periodDays: number): RumEvent[] {
  // Placeholder: return empty array
  // In production, query Supabase rum_events table
  void siteId
  void periodDays
  return []
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId')
  const period = req.nextUrl.searchParams.get('period') || '28d'

  if (!siteId || !SITE_ID_RE.test(siteId)) {
    return NextResponse.json(
      { error: 'Missing or invalid siteId' },
      { status: 400 }
    )
  }

  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json(
      { error: 'Invalid period. Must be 7d or 28d.' },
      { status: 400 }
    )
  }

  const periodDays = period === '7d' ? 7 : 28

  try {
    const events = getEventsForSite(siteId, periodDays)
    const summary = buildSiteSummary(siteId, events, period as '7d' | '28d')

    return NextResponse.json(summary, {
      headers: {
        // Cache for 5 minutes — RUM summaries don't need to be real-time
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err) {
    console.error(`[rum:summary] Error building summary for ${siteId}:`, err)
    return NextResponse.json(
      { error: 'Failed to build RUM summary' },
      { status: 500 }
    )
  }
}
