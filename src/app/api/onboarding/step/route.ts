import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { markStepCompleted, markStepSkipped } from '@/lib/onboarding/state-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { step, action } = body // action: 'complete' | 'skip'

    let state
    if (action === 'skip') {
      state = await markStepSkipped(user.id, step)
    } else {
      state = await markStepCompleted(user.id, step)
    }

    return NextResponse.json({ state })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
