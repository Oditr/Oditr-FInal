// ── Webhook Service (Engine 15) ──
// Delivers signed webhook payloads to external endpoints.
// Supports Slack webhooks, Discord webhooks, and generic HTTP webhooks.

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type WebhookEvent =
  | 'audit.completed'
  | 'monitoring.regression_detected'
  | 'deployment_guard.failed'
  | 'deployment_guard.passed'
  | 'billing.limit_reached'
  | 'client_report.shared'
  | 'rum.vitals_worsened'

export interface WebhookPayload {
  event: WebhookEvent
  workspaceId: string
  timestamp: string
  data: Record<string, any>
}

// ── Sign a payload with HMAC-SHA256 ──
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

// ── Deliver to a single endpoint ──
async function deliverToEndpoint(
  endpointId: string,
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; status?: number }> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Oditr-Webhooks/1.0',
    'X-Oditr-Event': payload.event,
    'X-Oditr-Timestamp': payload.timestamp,
  }

  if (secret) {
    headers['X-Oditr-Signature'] = `sha256=${signPayload(body, secret)}`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    return { success: res.ok, status: res.status }
  } catch {
    return { success: false }
  }
}

// ── Record delivery attempt ──
async function recordDelivery(
  webhookId: string,
  payload: WebhookPayload,
  result: { success: boolean; status?: number }
) {
  const supabase = getServiceClient()
  if (!supabase) return

  try {
    await supabase.from('webhook_deliveries').insert({
      webhook_id:      webhookId,
      event_type:      payload.event,
      payload:         payload,
      status:          result.success ? 'success' : 'failed',
      response_code:   result.status || null,
      attempt_count:   1,
      last_attempt_at: new Date().toISOString(),
    })
  } catch (err) {
    // ignore
  }
}

// ── Fire webhooks for an event to all subscribed endpoints in a workspace ──
export async function fireWebhooks(
  workspaceId: string,
  event: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  try {
    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('id, url, events, secret_hash')
      .eq('workspace_id', workspaceId)
      .eq('enabled', true)

    if (!endpoints || endpoints.length === 0) return

    // Filter to endpoints subscribed to this event
    const subscribed = endpoints.filter(
      ep => ep.events.length === 0 || ep.events.includes(event)
    )

    const payload: WebhookPayload = {
      event,
      workspaceId,
      timestamp: new Date().toISOString(),
      data,
    }

    // Deliver in parallel, fire-and-forget per endpoint
    await Promise.allSettled(
      subscribed.map(async ep => {
        const result = await deliverToEndpoint(ep.id, ep.url, payload, ep.secret_hash || undefined)
        await recordDelivery(ep.id, payload, result)
      })
    )
  } catch (e) {
    console.warn('[webhooks] fireWebhooks failed:', (e as Error).message)
  }
}

// ── Send Slack message ──
export async function sendSlackMessage(webhookUrl: string, text: string, blocks?: any[]): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Test a webhook endpoint ──
export async function testWebhook(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
  const testPayload: WebhookPayload = {
    event: 'audit.completed',
    workspaceId: 'test',
    timestamp: new Date().toISOString(),
    data: { test: true, message: 'This is a test webhook from Øditr' }
  }

  try {
    const result = await deliverToEndpoint('test', url, testPayload)
    return result
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── SSRF Protection — reject private/internal URLs ──
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local
  /^::1$/,       // IPv6 loopback
  /^0\.0\.0\.0$/,
  /^metadata\.google\.internal$/i,
  /^169\.254\.169\.254$/, // AWS metadata
]

export function isWebhookUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const hostname = parsed.hostname
    return !BLOCKED_PATTERNS.some(p => p.test(hostname))
  } catch {
    return false
  }
}
