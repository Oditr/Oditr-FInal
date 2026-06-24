import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { getActiveWorkspace } from './workspace-service'
import { hasPermission, Role } from './permission-service'

export async function createApiToken(name: string, projectId?: string, scopes: string[] = ['audits.run']) {
  const { workspace, role } = await getActiveWorkspace()
  if (!workspace || !role) throw new Error('Not attached to a workspace')

  if (!hasPermission(role as Role, 'cicd_tokens.manage') && !hasPermission(role as Role, 'api_tokens.manage')) {
    throw new Error('Unauthorized to manage API tokens')
  }

  const tokenBytes = crypto.randomBytes(32)
  const token = `odi_${tokenBytes.toString('base64url')}`
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase.from('api_tokens').insert({
    id: crypto.randomUUID(),
    workspace_id: workspace.id,
    project_id: projectId || null,
    name,
    token_hash: tokenHash,
    scopes,
    created_by: user.id
  })

  if (error) throw error

  return { token, name, scopes } // Only return raw token once!
}

export async function revokeApiToken(tokenId: string) {
  const { workspace, role } = await getActiveWorkspace()
  if (!workspace || !role) throw new Error('Not attached to a workspace')

  if (!hasPermission(role as Role, 'cicd_tokens.manage') && !hasPermission(role as Role, 'api_tokens.manage')) {
    throw new Error('Unauthorized to manage API tokens')
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('workspace_id', workspace.id)

  if (error) throw error
  return true
}

export async function validateToken(rawToken: string, requiredScope?: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const supabase = createClient() // Might need service key to bypass RLS if caller is unauthenticated

  const { data: tokenDoc, error } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !tokenDoc) return false

  if (tokenDoc.revoked_at) return false
  if (tokenDoc.expires_at && new Date(tokenDoc.expires_at) < new Date()) return false
  if (requiredScope && !tokenDoc.scopes.includes(requiredScope)) return false

  // Update last used asynchronously
  supabase.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenDoc.id).then()

  return {
    workspaceId: tokenDoc.workspace_id,
    projectId: tokenDoc.project_id,
    scopes: tokenDoc.scopes
  }
}
