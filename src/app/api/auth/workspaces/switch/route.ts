import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceId } = await req.json()

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  // Verify the user is a member of this workspace
  const { data: member, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (error || !member) {
    return NextResponse.json({ error: 'Unauthorized or invalid workspace' }, { status: 403 })
  }

  // Set the active workspace cookie
  cookies().set('active_workspace_id', workspaceId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  // Optionally update default workspace in profile
  await supabase
    .from('profiles')
    .update({ default_workspace_id: workspaceId })
    .eq('id', user.id)

  return NextResponse.json({ success: true, workspaceId })
}
