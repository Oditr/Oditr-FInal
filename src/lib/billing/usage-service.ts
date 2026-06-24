import { supabase } from '@/lib/supabase'
import { getSubscription } from './subscription-service'

/**
 * Gets the current billing period string.
 * Format: YYYY-MM based on the subscription's current_period_start,
 * or the current calendar month if no subscription exists.
 */
export async function getCurrentBillingPeriod(workspaceId: string): Promise<string> {
  const sub = await getSubscription(workspaceId)
  let dateToUse = new Date()
  
  if (sub && sub.currentPeriodStart) {
    // Determine the exact month the period started in
    dateToUse = new Date(sub.currentPeriodStart)
    // If the period end is in the past, they might be off-cycle or canceled, fallback to current
    if (new Date(sub.currentPeriodEnd) < new Date()) {
      dateToUse = new Date()
    }
  }

  // YYYY-MM
  return dateToUse.toISOString().slice(0, 7)
}

/**
 * Get current usage for a specific feature key in the current billing period.
 */
export async function getUsageCount(workspaceId: string, featureKey: string): Promise<number> {
  if (!supabase) return 0
  
  const period = await getCurrentBillingPeriod(workspaceId)
  
  const { data, error } = await supabase
    .from('usage_records')
    .select('quantity')
    .eq('workspace_id', workspaceId)
    .eq('feature_key', featureKey)
    .eq('billing_period', period)

  if (error || !data) return 0

  return data.reduce((acc, record) => acc + record.quantity, 0)
}

/**
 * Get multiple usage counts at once.
 */
export async function getUsageSummary(workspaceId: string, featureKeys: string[]): Promise<Record<string, number>> {
  if (!supabase) return Object.fromEntries(featureKeys.map(k => [k, 0]))
  
  const period = await getCurrentBillingPeriod(workspaceId)
  
  const { data, error } = await supabase
    .from('usage_records')
    .select('feature_key, quantity')
    .eq('workspace_id', workspaceId)
    .eq('billing_period', period)
    .in('feature_key', featureKeys)

  const result: Record<string, number> = Object.fromEntries(featureKeys.map(k => [k, 0]))
  
  if (error || !data) return result

  for (const row of data) {
    if (result[row.feature_key] !== undefined) {
      result[row.feature_key] += row.quantity
    }
  }

  return result
}

/**
 * Increment usage for a specific feature key.
 */
export async function incrementUsage(workspaceId: string, userId: string | null, featureKey: string, quantity: number = 1, metadata?: any): Promise<void> {
  if (!supabase) return

  const period = await getCurrentBillingPeriod(workspaceId)

  const { error } = await supabase
    .from('usage_records')
    .insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      user_id: userId,
      feature_key: featureKey,
      quantity,
      billing_period: period,
      metadata: metadata || null
    })

  if (error) {
    console.error(`[UsageService] Failed to increment usage for ${featureKey}:`, error.message)
    throw error
  }
}
