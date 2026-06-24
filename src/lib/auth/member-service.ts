import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

export async function inviteMember(workspaceId: string, email: string, role: string, inviterId: string) {
  const supabase = createClient()
  
  // Check if they are already a member
  const { data: user } = await supabase.from('profiles').select('id, auth.users!inner(email)').eq('auth.users.email', email).maybeSingle()
  if (user) {
    const { data: existingMember } = await supabase.from('workspace_members').select('id').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
    if (existingMember) {
      throw new Error('User is already a member of this workspace')
    }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

  const { error } = await supabase.from('invites').insert({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    email,
    role,
    token_hash: tokenHash,
    invited_by: inviterId,
    expires_at: expiresAt.toISOString()
  })

  if (error) throw error

  // In a real implementation, send an email here using the plain `token`
  console.log(`[DEV] Invite link: /invite?token=${token}&workspace=${workspaceId}`)

  return true
}

export async function removeMember(workspaceId: string, userId: string) {
  const supabase = createClient()
  
  // Cannot remove the owner if they are the only owner
  const { data: owners } = await supabase.from('workspace_members').select('id').eq('workspace_id', workspaceId).eq('role', 'owner')
  if (owners && owners.length === 1) {
    const { data: memberToRemove } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', userId).single()
    if (memberToRemove?.role === 'owner') {
      throw new Error('Cannot remove the last owner of a workspace')
    }
  }

  const { error } = await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId)
  if (error) throw error
  return true
}

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      id,
      user_id,
      role,
      status,
      joined_at,
      profiles:user_id (plan)
    `)
    .eq('workspace_id', workspaceId)

  if (error) throw error

  // We normally join with auth.users to get email/name, but supabase standard client doesn't allow joining auth schema.
  // Requires a secure view or edge function.
  // For now, returning user_id and role.
  return data
}
