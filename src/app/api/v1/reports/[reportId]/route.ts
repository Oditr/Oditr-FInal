import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await authenticateApiRequest(req)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
    }

    const { reportId } = await params

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify access
    const { data: workspaces } = await adminSupabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', auth.user.id)

    const workspaceIds = workspaces?.map(w => w.workspace_id) || []

    if (workspaceIds.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { data: report, error } = await adminSupabase
      .from('reports')
      .select('id, url, created_at, overall_score, performance_score, seo_score, accessibility_score, data')
      .eq('id', reportId)
      .in('workspace_id', workspaceIds)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found or permission denied' }, { status: 404 })
    }

    return NextResponse.json({ report })
  } catch (err: unknown) {
    console.error('[API] GET /api/v1/reports error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
