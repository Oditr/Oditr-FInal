import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { upsertUserProfile } from '@/lib/onboarding/profile-service'
import { markStepCompleted } from '@/lib/onboarding/state-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { role_type, primary_goal, experience_level, company_type, team_size, preferred_usecase } = body

    // Update the user profile
    const profile = await upsertUserProfile(user.id, {
      role_type,
      primary_goal,
      experience_level,
      company_type,
      team_size,
      preferred_usecase,
    })

    // Mark the step as completed
    const state = await markStepCompleted(user.id, 'user_type')

    return NextResponse.json({ profile, state })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
