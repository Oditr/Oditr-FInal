// ── Regression Comparison API Route ──
// GET /api/reports/:reportId/comparison — Compare a report with its predecessor

import { NextRequest, NextResponse } from 'next/server'
import { getSnapshot } from '@/lib/monitoring/audit-history-service'
import { detectRegression } from '@/lib/monitoring/regression-service'
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
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params
  const userId = await getUserId(req)

  // 1. Get the current report
  const current = await getSnapshot(reportId, userId)
  if (!current) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // 2. We need the predecessor report to compare against.
  // The simplest way is to fetch history for the project and find the one immediately before `current`.
  // Wait, I don't have a direct "get predecessor" function, so I'll import `getProjectHistory`
  const { getProjectHistory } = await import('@/lib/monitoring/audit-history-service')
  
  // Fetch a reasonable window (e.g. 50) to find the predecessor
  const history = await getProjectHistory(current.projectId, userId, 50)
  
  // `history` is sorted newest first
  const currentIndex = history.findIndex(r => r.id === current.id)
  
  if (currentIndex === -1 || currentIndex === history.length - 1) {
    return NextResponse.json({ 
      error: 'No previous report found for comparison',
      isBaseline: true
    }, { status: 404 })
  }

  const previous = history[currentIndex + 1]

  // 3. Detect regression
  const regression = detectRegression(previous, current)

  return NextResponse.json(regression)
}
