import { createClient } from '@/utils/supabase/server'

export type UserProfile = {
  user_id: string
  role_type: 'founder' | 'developer' | 'agency' | 'ecommerce' | 'seo' | 'other' | null
  primary_goal: string | null
  experience_level: string | null
  company_type: string | null
  team_size: string | null
  preferred_usecase: string | null
  created_at: string
  updated_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user profile: ${error.message}`)
  }

  return data as UserProfile | null
}

export async function upsertUserProfile(
  userId: string,
  profileData: Partial<Omit<UserProfile, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserProfile> {
  const supabase = await createClient()

  // Try to update first
  const { data: updateData, error: updateError } = await supabase
    .from('user_profiles')
    .update({ ...profileData, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (!updateError && updateData) {
    return updateData as UserProfile
  }

  // If it fails because row doesn't exist, insert
  const { data: insertData, error: insertError } = await supabase
    .from('user_profiles')
    .insert({ user_id: userId, ...profileData })
    .select('*')
    .single()

  if (insertError) {
    throw new Error(`Failed to upsert user profile: ${insertError.message}`)
  }

  return insertData as UserProfile
}
