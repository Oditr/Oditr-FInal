// ── Score Trends API Route ──
// GET /api/projects/:projectId/trends — Score trend time-series

import { NextRequest, NextResponse } from 'next/server'
import { getProjectHistory } from '@/lib/monitoring/audit-history-service'
import { buildScoreTrend, getScoreDirection } from '@/lib/monitoring/score-trend-service'
import { createServerClient } from '@supabase/ssr'

function getUserId(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return Promise.resolve(null)

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
      setAll: () => {},
    },
  })
  return supabase.auth.getUser().then(r => r?.data?.user?.id || null).catch(() => null)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const userId = await getUserId(req)

  // Get history in chronological order (oldest first)
  const history = await getProjectHistory(projectId, userId, 30)
  const chronological = [...history].reverse()

  const trend = buildScoreTrend(chronological)
  const direction = getScoreDirection(trend)

  return NextResponse.json({ trend, direction })
}
