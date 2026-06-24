import { NextResponse } from 'next/server'
import { getActiveWorkspace } from '@/lib/auth/workspace-service'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspace, role } = await getActiveWorkspace()

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name,
    },
    workspace,
    role,
  })
}
