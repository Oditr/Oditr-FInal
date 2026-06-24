import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAdminOverview, isSystemAdmin } from '@/lib/admin/admin-service'

// GET /api/admin/overview — Get high-level system stats
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Permission denied. System Admin access required.' }, { status: 403 })
    }

    const overview = await getAdminOverview()

    return NextResponse.json({ overview })
  } catch (err: unknown) {
    console.error('[API] GET /api/admin/overview error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
