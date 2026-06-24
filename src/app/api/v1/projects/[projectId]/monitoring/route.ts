import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await authenticateApiRequest(req)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
    }

    const { projectId } = await params

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify access to project
    const { data: workspaces } = await adminSupabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', auth.user.id)

    const workspaceIds = workspaces?.map(w => w.workspace_id) || []

    const { data: project, error } = await adminSupabase
      .from('projects')
      .select('id, name, is_monitoring_enabled, monitoring_interval, last_scan_at, last_scan_status')
      .eq('id', projectId)
      .in('workspace_id', workspaceIds)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: regressions } = await adminSupabase
      .from('regression_events')
      .select('id, severity, score_delta, created_at, report_id, url')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ 
      project: {
        id: project.id,
        name: project.name,
        monitoringEnabled: project.is_monitoring_enabled,
        intervalMinutes: project.monitoring_interval,
        lastScanAt: project.last_scan_at,
        lastScanStatus: project.last_scan_status,
      },
      recentRegressions: regressions || []
    })
  } catch (err: unknown) {
    console.error('[API] GET /api/v1/projects/monitoring error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
