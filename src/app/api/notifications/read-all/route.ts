import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { markNotificationsRead } from '@/lib/notifications/notification-service'

// PATCH /api/notifications/read-all — Mark all notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await markNotificationsRead(user.id) // passing no ids marks all as read

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[API] PATCH /api/notifications/read-all error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
