// ── Audit Log Service (Engine 17) ──
// Records important workspace actions for compliance and security.
// Uses the Supabase service role key — server-side only.
// All methods are fire-and-forget.

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type AuditAction =
  | 'user.login' | 'user.login_failed' | 'user.password_changed'
  | 'workspace.created' | 'workspace.updated' | 'workspace.deleted'
  | 'workspace.member_invited' | 'workspace.member_removed' | 'workspace.role_changed'
  | 'billing.plan_changed' | 'billing.subscription_cancelled' | 'billing.checkout_started'
  | 'api_token.created' | 'api_token.revoked'
  | 'ci_token.created' | 'ci_token.revoked'
  | 'integration.added' | 'integration.removed' | 'integration.updated'
  | 'webhook.added' | 'webhook.removed'
  | 'report.shared' | 'report.unshared' | 'report.exported'
  | 'project.created' | 'project.deleted' | 'project.updated'
  | 'client.created' | 'client.deleted'

export interface AuditLogPayload {
  workspaceId: string
  userId?: string | null
  action: AuditAction | string
  targetType?: string
  targetId?: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + '_oditr_salt').digest('hex').slice(0, 16)
}

// ── Record an audit log event ──
export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  try {
    await supabase.from('audit_logs').insert({
      workspace_id: payload.workspaceId,
      user_id:      payload.userId || null,
      action:       payload.action,
      target_type:  payload.targetType || null,
      target_id:    payload.targetId   || null,
      metadata:     payload.metadata   || {},
      ip_hash:      payload.ip ? hashIp(payload.ip) : null,
      user_agent:   payload.userAgent  ? payload.userAgent.slice(0, 500) : null,
    })
  } catch (e) {
    console.warn('[audit-log] Failed to record:', (e as Error).message)
  }
}

// ── Convenience helpers ──

export async function logLogin(userId: string, workspaceId: string, ip?: string) {
  return recordAuditLog({ workspaceId, userId, action: 'user.login', ip })
}

export async function logApiTokenCreated(userId: string, workspaceId: string, tokenName: string) {
  return recordAuditLog({
    workspaceId, userId, action: 'api_token.created',
    targetType: 'api_token', metadata: { name: tokenName }
  })
}

export async function logReportShared(userId: string, workspaceId: string, reportId: string) {
  return recordAuditLog({
    workspaceId, userId, action: 'report.shared',
    targetType: 'report', targetId: reportId
  })
}

export async function logPlanChanged(userId: string, workspaceId: string, fromPlan: string, toPlan: string) {
  return recordAuditLog({
    workspaceId, userId, action: 'billing.plan_changed',
    metadata: { fromPlan, toPlan }
  })
}

// ── Query audit logs for a workspace ──
export async function getAuditLogs(
  workspaceId: string,
  opts: { limit?: number; userId?: string; action?: string } = {}
): Promise<any[]> {
  const supabase = getServiceClient()
  if (!supabase) return []

  let query = supabase
    .from('audit_logs')
    .select('id, action, target_type, target_id, metadata, user_id, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(opts.limit || 100)

  if (opts.userId) query = query.eq('user_id', opts.userId)
  if (opts.action) query = query.eq('action', opts.action)

  const { data } = await query
  return data || []
}
