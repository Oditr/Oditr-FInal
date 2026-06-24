import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiRequest(req)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status })
    }

    // Since API requests don't have standard session JWTs, we use service_role to fetch for the user
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all workspaces this user owns/is part of
    const { data: workspaces } = await adminSupabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', auth.user.id)

    const workspaceIds = workspaces?.map(w => w.workspace_id) || []

    if (workspaceIds.length === 0) {
      return NextResponse.json({ projects: [] })
    }

    const { data: projects, error } = await adminSupabase
      .from('projects')
      .select('id, name, url, created_at')
      .in('workspace_id', workspaceIds)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ projects })
  } catch (err: unknown) {
    console.error('[API] GET /api/v1/projects error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
