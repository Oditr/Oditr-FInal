import { createClient } from '@/utils/supabase/server'

export type OnboardingState = {
  user_id: string
  workspace_id: string | null
  current_step: string
  completed_steps: string[]
  skipped_steps: string[]
  activation_score: number
  first_project_id: string | null
  first_audit_report_id: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_state')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch onboarding state: ${error.message}`)
  }

  // If not found, create an initial state
  if (!data) {
    const initialState = {
      user_id: userId,
      current_step: 'welcome',
      completed_steps: [],
      skipped_steps: [],
      activation_score: 0,
      is_completed: false,
    }
    const { data: newData, error: insertError } = await supabase
      .from('onboarding_state')
      .insert(initialState)
      .select('*')
      .single()

    if (insertError) {
      throw new Error(`Failed to create onboarding state: ${insertError.message}`)
    }
    return newData as OnboardingState
  }

  return data as OnboardingState
}

export async function updateOnboardingState(
  userId: string,
  updates: Partial<Omit<OnboardingState, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<OnboardingState> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_state')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update onboarding state: ${error.message}`)
  }

  return data as OnboardingState
}

export async function markStepCompleted(userId: string, step: string): Promise<OnboardingState> {
  const state = await getOnboardingState(userId)
  const completedSteps = new Set(state.completed_steps)
  completedSteps.add(step)

  // Calculate activation score (rough estimate based on key steps)
  const scoreMap: Record<string, number> = {
    'welcome': 10,
    'user_type': 10,
    'project_setup': 30,
    'first_audit': 40,
    'business_profile': 10,
  }

  let newScore = 0
  for (const s of Array.from(completedSteps)) {
    newScore += scoreMap[s] || 0
  }
  
  if (newScore > 100) newScore = 100

  return updateOnboardingState(userId, {
    completed_steps: Array.from(completedSteps),
    activation_score: newScore,
    current_step: getNextStep(step),
    // Auto-complete if they finished the key flow
    is_completed: completedSteps.has('first_audit') || state.is_completed,
  })
}

export async function markStepSkipped(userId: string, step: string): Promise<OnboardingState> {
  const state = await getOnboardingState(userId)
  const skippedSteps = new Set(state.skipped_steps)
  skippedSteps.add(step)

  return updateOnboardingState(userId, {
    skipped_steps: Array.from(skippedSteps),
    current_step: getNextStep(step)
  })
}

function getNextStep(current: string): string {
  const flow = ['welcome', 'user_type', 'project_setup', 'business_profile', 'first_audit', 'first_result']
  const idx = flow.indexOf(current)
  if (idx >= 0 && idx < flow.length - 1) {
    return flow[idx + 1]
  }
  return 'dashboard'
}
