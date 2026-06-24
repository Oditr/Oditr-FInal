// ── Project History API Route ──
// GET /api/projects/:projectId/history — List audit snapshots for a project

import { NextRequest, NextResponse } from 'next/server'
import { getProjectHistory } from '@/lib/monitoring/audit-history-service'
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

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10)
  const history = await getProjectHistory(projectId, userId, Math.min(limit, 50))

  return NextResponse.json(history)
}
