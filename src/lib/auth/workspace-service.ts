import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export interface Workspace {
  id: string
  name: string
  slug: string
  type: string
  owner_id: string
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'client_viewer'
  status: 'active' | 'invited' | 'removed'
}

/**
 * Get the currently active workspace for the user.
 * It checks cookies first, then falls back to the user's default_workspace_id.
 */
export async function getActiveWorkspace(): Promise<{ workspace: Workspace | null, role: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { workspace: null, role: null }

  const cookieStore = cookies()
  let activeWorkspaceId = cookieStore.get('active_workspace_id')?.value

  if (!activeWorkspaceId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single()
    activeWorkspaceId = profile?.default_workspace_id
  }

  if (!activeWorkspaceId) return { workspace: null, role: null }

  // Ensure user is actually a member
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, workspaces(*)')
    .eq('workspace_id', activeWorkspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    // Fallback: try finding any workspace they belong to
    const { data: anyMember } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(*)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (anyMember && anyMember.workspaces) {
      // Auto-switch to valid workspace
      return { 
        workspace: Array.isArray(anyMember.workspaces) ? anyMember.workspaces[0] : anyMember.workspaces as unknown as Workspace, 
        role: anyMember.role 
      }
    }
    return { workspace: null, role: null }
  }

  return { 
    workspace: Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces as unknown as Workspace, 
    role: member.role 
  }
}

/**
 * List all workspaces a user belongs to
 */
export async function getUserWorkspaces(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspaces(*)')
    .eq('user_id', userId)

  if (error) throw error
  return data.map(d => ({
    role: d.role,
    workspace: Array.isArray(d.workspaces) ? d.workspaces[0] : d.workspaces as unknown as Workspace
  }))
}

/**
 * Create a new workspace and make the user the owner
 */
export async function createWorkspace(userId: string, name: string, type: string = 'startup') {
  const supabase = await createClient()
  const workspaceId = `ws_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)

  // Requires service role to bypass RLS for insert if not using a secure RPC
  // Alternatively, if the policy allows inserting workspace, we can do it via standard client.
  // We'll use standard client but might need service key depending on final RLS.
  
  const { error: wsError } = await supabase.from('workspaces').insert({
    id: workspaceId,
    name,
    slug,
    type,
    owner_id: userId
  })
  
  if (wsError) throw wsError

  const { error: memError } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: 'owner'
  })

  if (memError) throw memError

  return { id: workspaceId, name, slug }
}
