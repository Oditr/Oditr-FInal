// ── Notification Service (Engine 14) ──
// Creates and delivers in-app notifications.
// Serves as a central hub — email/Slack/Discord are stubs for now.

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type NotificationSeverity = 'info' | 'warning' | 'critical'
export type NotificationSource =
  | 'monitoring' | 'deployment_guard' | 'billing' | 'audit'
  | 'rum' | 'system' | 'invite' | 'report'

export interface CreateNotificationPayload {
  workspaceId: string
  userId: string
  type: string
  title: string
  message: string
  severity?: NotificationSeverity
  source?: NotificationSource
  sourceId?: string
  actionUrl?: string
}

// ── Create a single in-app notification ──
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  try {
    await supabase.from('notifications').insert({
      workspace_id: payload.workspaceId,
      user_id:      payload.userId,
      type:         payload.type,
      title:        payload.title.slice(0, 200),
      message:      payload.message.slice(0, 1000),
      severity:     payload.severity || 'info',
      source:       payload.source   || null,
      source_id:    payload.sourceId || null,
      action_url:   payload.actionUrl || null,
    })
  } catch (e) {
    console.warn('[notifications] Create failed:', (e as Error).message)
  }
}

// ── Notify all owners of a workspace ──
export async function notifyWorkspaceOwners(
  workspaceId: string,
  notification: Omit<CreateNotificationPayload, 'workspaceId' | 'userId'>
): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  try {
    const { data: owners } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .in('role', ['owner', 'admin'])

    if (!owners || owners.length === 0) return

    const rows = owners.map(o => ({
      workspace_id: workspaceId,
      user_id:      o.user_id,
      type:         notification.type,
      title:        notification.title.slice(0, 200),
      message:      notification.message.slice(0, 1000),
      severity:     notification.severity || 'info',
      source:       notification.source   || null,
      source_id:    notification.sourceId || null,
      action_url:   notification.actionUrl || null,
    }))

    await supabase.from('notifications').insert(rows)
  } catch (e) {
    console.warn('[notifications] notifyWorkspaceOwners failed:', (e as Error).message)
  }
}

// ── Pre-built notification helpers ──

export async function notifyRegressionDetected(
  workspaceId: string,
  userId: string,
  projectName: string,
  projectId: string,
  severity: 'critical' | 'warning'
): Promise<void> {
  return createNotification({
    workspaceId, userId,
    type: 'regression',
    title: `Regression detected: ${projectName}`,
    message: `A ${severity === 'critical' ? 'critical' : 'high'} regression was detected. Review the monitoring report to see what changed.`,
    severity,
    source: 'monitoring',
    sourceId: projectId,
    actionUrl: `/monitoring/${projectId}`,
  })
}

export async function notifyDeploymentFailed(
  workspaceId: string,
  userId: string,
  projectName: string,
  projectId: string
): Promise<void> {
  return createNotification({
    workspaceId, userId,
    type: 'deployment_failed',
    title: `Deployment Guard: ${projectName}`,
    message: 'A deployment check failed quality gates. Review the results before deploying.',
    severity: 'warning',
    source: 'deployment_guard',
    sourceId: projectId,
    actionUrl: `/monitoring/${projectId}`,
  })
}

export async function notifyAuditComplete(
  workspaceId: string,
  userId: string,
  url: string,
  reportId: string
): Promise<void> {
  return createNotification({
    workspaceId, userId,
    type: 'audit_complete',
    title: 'Audit complete',
    message: `Your audit for ${url} is ready.`,
    severity: 'info',
    source: 'audit',
    sourceId: reportId,
    actionUrl: `/report/${reportId}`,
  })
}

export async function notifyBillingFailed(
  workspaceId: string,
  userId: string
): Promise<void> {
  return createNotification({
    workspaceId, userId,
    type: 'billing_failed',
    title: 'Billing payment failed',
    message: 'Your last payment could not be processed. Please update your payment method to avoid service interruption.',
    severity: 'critical',
    source: 'billing',
    actionUrl: '/dashboard/settings/billing',
  })
}

export async function notifyLimitReached(
  workspaceId: string,
  userId: string,
  feature: string
): Promise<void> {
  return createNotification({
    workspaceId, userId,
    type: 'limit_reached',
    title: `Usage limit reached: ${feature}`,
    message: `You've reached your plan limit for ${feature}. Upgrade to continue.`,
    severity: 'warning',
    source: 'billing',
    actionUrl: '/pricing',
  })
}

// ── Get user notifications ──
export async function getUserNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {}
): Promise<any[]> {
  const supabase = getServiceClient()
  if (!supabase) return []

  let query = supabase
    .from('notifications')
    .select('id, type, title, message, severity, source, source_id, action_url, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts.limit || 50)

  if (opts.unreadOnly) query = query.is('read_at', null)

  const { data } = await query
  return data || []
}

// ── Mark notifications read ──
export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (ids && ids.length > 0) {
    query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', ids)
  }

  await query
}

// ── Get unread count (lightweight) ──
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = getServiceClient()
  if (!supabase) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  return count ?? 0
}
