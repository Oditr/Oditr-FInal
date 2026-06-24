import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getOnboardingState } from '@/lib/onboarding/state-service'
import { getNextBestActions } from '@/lib/onboarding/recommendation-service'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const state = await getOnboardingState(user.id)
    const recommendations = await getNextBestActions(user.id)

    return NextResponse.json({ state, recommendations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
