import { NextResponse } from 'next/server'
import { getActiveWorkspace, getUserWorkspaces } from '@/lib/auth/workspace-service'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspace: activeWorkspace } = await getActiveWorkspace()
  const userWorkspacesData = await getUserWorkspaces(user.id)
  
  const workspaces = userWorkspacesData.map(ws => ws.workspace)

  return NextResponse.json({ workspaces, activeWorkspace })
}
