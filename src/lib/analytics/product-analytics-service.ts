// ── Product Analytics Service ──
// Server-side event tracking for Øditr's own product analytics.
// Uses the Supabase service client so it bypasses RLS.
// All methods are fire-and-forget — errors are silently logged.

import { createClient } from '@supabase/supabase-js'
import { sanitizeProperties, type ProductEventPayload } from './events'

// ── Analytics guard ──
const ENABLED = process.env.PRODUCT_ANALYTICS_ENABLED !== 'false'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── Track a single product event ──
export async function trackProductEvent(payload: ProductEventPayload): Promise<void> {
  if (!ENABLED) return

  const supabase = getServiceClient()
  if (!supabase) {
    console.warn('[product-analytics] Supabase service client unavailable')
    return
  }

  try {
    await supabase.from('product_events').insert({
      event_name:   payload.eventName,
      user_id:      payload.userId   || null,
      workspace_id: payload.workspaceId || null,
      project_id:   payload.projectId  || null,
      session_id:   payload.sessionId  || null,
      properties:   sanitizeProperties(payload.properties || {}),
    })
  } catch (e) {
    console.warn('[product-analytics] trackEvent failed:', (e as Error).message)
  }
}

// ── Batch track events ──
export async function trackProductEventBatch(payloads: ProductEventPayload[]): Promise<void> {
  if (!ENABLED || payloads.length === 0) return

  const supabase = getServiceClient()
  if (!supabase) return

  try {
    const rows = payloads.slice(0, 50).map(p => ({
      event_name:   p.eventName,
      user_id:      p.userId   || null,
      workspace_id: p.workspaceId || null,
      project_id:   p.projectId  || null,
      session_id:   p.sessionId  || null,
      properties:   sanitizeProperties(p.properties || {}),
    }))
    await supabase.from('product_events').insert(rows)
  } catch (e) {
    console.warn('[product-analytics] batchTrack failed:', (e as Error).message)
  }
}

// ── Activation Funnel ──
// Returns step-by-step conversion counts for the primary activation funnel
export async function getActivationFunnel(): Promise<{
  steps: { step: string; label: string; count: number; conversionRate: number }[]
} | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const funnelSteps = [
    { step: 'user.signed_up',                label: 'Signed Up' },
    { step: 'workspace.created',             label: 'Workspace Created' },
    { step: 'project.created',               label: 'First Project Created' },
    { step: 'audit.started',                 label: 'First Audit Started' },
    { step: 'audit.completed',               label: 'First Audit Completed' },
    { step: 'audit.report_viewed',           label: 'Report Viewed' },
    { step: 'audit.issue_opened',            label: 'Issue Opened' },
    { step: 'revenue.impact_calculated',     label: 'Revenue Impact Viewed' },
  ]

  try {
    const results = await Promise.all(
      funnelSteps.map(async ({ step }) => {
        const { count } = await supabase
          .from('product_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', step)
        return count ?? 0
      })
    )

    const topCount = results[0] || 1
    const steps = funnelSteps.map((s, i) => ({
      ...s,
      count: results[i],
      conversionRate: topCount > 0 ? Math.round((results[i] / topCount) * 100) : 0,
    }))

    return { steps }
  } catch (e) {
    console.warn('[product-analytics] getActivationFunnel failed:', (e as Error).message)
    return null
  }
}

// ── Upgrade Funnel ──
export async function getUpgradeFunnel(): Promise<{
  steps: { step: string; label: string; count: number; conversionRate: number }[]
} | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const upgradeFunnel = [
    { step: 'billing.pricing_viewed',        label: 'Pricing Viewed' },
    { step: 'billing.feature_locked_viewed', label: 'Feature Lock Seen' },
    { step: 'billing.upgrade_clicked',       label: 'Upgrade Clicked' },
    { step: 'billing.checkout_started',      label: 'Checkout Started' },
    { step: 'billing.checkout_completed',    label: 'Checkout Completed' },
    { step: 'billing.plan_changed',          label: 'Plan Activated' },
  ]

  try {
    const results = await Promise.all(
      upgradeFunnel.map(async ({ step }) => {
        const { count } = await supabase
          .from('product_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', step)
        return count ?? 0
      })
    )

    const topCount = results[0] || 1
    const steps = upgradeFunnel.map((s, i) => ({
      ...s,
      count: results[i],
      conversionRate: topCount > 0 ? Math.round((results[i] / topCount) * 100) : 0,
    }))

    return { steps }
  } catch (e) {
    console.warn('[product-analytics] getUpgradeFunnel failed:', (e as Error).message)
    return null
  }
}

// ── Feature Adoption ──
export async function getFeatureAdoption(): Promise<{
  features: { feature: string; label: string; totalEvents: number; uniqueUsers: number }[]
} | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const featureEvents: { feature: string; label: string; event: string }[] = [
    { feature: 'core_audit',        label: 'Core Audit',           event: 'audit.completed' },
    { feature: 'revenue_impact',    label: 'Revenue Impact',       event: 'revenue.impact_calculated' },
    { feature: 'ai_readiness',      label: 'AI Readiness',         event: 'ai_readiness.viewed' },
    { feature: 'monitoring',        label: 'Monitoring',           event: 'monitoring.enabled' },
    { feature: 'deployment_guard',  label: 'Deployment Guard',     event: 'deployment_guard.configured' },
    { feature: 'rum',               label: 'RUM',                  event: 'rum.snippet_copied' },
    { feature: 'agency_reports',    label: 'Agency Reports',       event: 'client_report.generated' },
    { feature: 'white_label',       label: 'White-Label',          event: 'white_label.branding_updated' },
  ]

  try {
    const results = await Promise.all(
      featureEvents.map(async ({ feature, label, event: ev }) => {
        const { data, count } = await supabase
          .from('product_events')
          .select('user_id', { count: 'exact' })
          .eq('event_name', ev)

        const uniqueUsers = new Set((data || []).map(r => r.user_id).filter(Boolean)).size
        return { feature, label, totalEvents: count ?? 0, uniqueUsers }
      })
    )
    return { features: results }
  } catch (e) {
    console.warn('[product-analytics] getFeatureAdoption failed:', (e as Error).message)
    return null
  }
}

// ── Top Upgrade Trigger Features ──
// Which feature-lock events most precede an upgrade click
export async function getUpgradeTriggers(): Promise<{
  triggers: { feature: string; count: number }[]
} | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  try {
    const { data } = await supabase
      .from('product_events')
      .select('properties')
      .eq('event_name', 'billing.limit_reached')
      .order('created_at', { ascending: false })
      .limit(500)

    const featureCounts: Record<string, number> = {}
    for (const row of data || []) {
      const feat = row.properties?.feature || 'unknown'
      featureCounts[feat] = (featureCounts[feat] || 0) + 1
    }

    const triggers = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { triggers }
  } catch (e) {
    console.warn('[product-analytics] getUpgradeTriggers failed:', (e as Error).message)
    return null
  }
}

// ── Churn Risk Signals ──
// Returns user IDs with churn risk signals (used internally)
export async function getChurnRiskSignals(): Promise<{
  signals: { userId: string; signal: string; detail: string }[]
} | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const signals: { userId: string; signal: string; detail: string }[] = []
  const cutoff14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Users who signed up but never ran an audit
    const { data: signedUp } = await supabase
      .from('product_events')
      .select('user_id')
      .eq('event_name', 'user.signed_up')

    const { data: auditDone } = await supabase
      .from('product_events')
      .select('user_id')
      .eq('event_name', 'audit.completed')

    const auditUsers = new Set((auditDone || []).map(r => r.user_id))
    for (const row of signedUp || []) {
      if (row.user_id && !auditUsers.has(row.user_id)) {
        signals.push({ userId: row.user_id, signal: 'no_first_audit', detail: 'Signed up but never completed an audit' })
      }
    }

    // Users with no activity in 14 days
    const { data: recentActive } = await supabase
      .from('product_events')
      .select('user_id')
      .gte('created_at', cutoff14)

    const activeUsers = new Set((recentActive || []).map(r => r.user_id))

    const { data: allUsers } = await supabase
      .from('product_events')
      .select('user_id')
      .lt('created_at', cutoff14)

    const historicUsers = new Set((allUsers || []).map(r => r.user_id))
    Array.from(historicUsers).forEach(uid => {
      if (uid && !activeUsers.has(uid)) {
        signals.push({ userId: uid, signal: 'inactive_14d', detail: 'No activity in 14+ days' })
      }
    })

    return { signals: signals.slice(0, 100) }
  } catch (e) {
    console.warn('[product-analytics] getChurnRiskSignals failed:', (e as Error).message)
    return null
  }
}
