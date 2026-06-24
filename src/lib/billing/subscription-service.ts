import { supabase } from '@/lib/supabase'
import { PlanId, Subscription } from './types'

export async function getSubscription(userId: string): Promise<Subscription | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    planId: data.plan_id as PlanId,
    status: data.status,
    provider: data.provider,
    providerCustomerId: data.provider_customer_id,
    providerSubscriptionId: data.provider_subscription_id,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function upsertSubscription(userId: string, subscriptionData: Partial<Subscription>): Promise<void> {
  if (!supabase) return

  // Map to DB snake_case fields
  const payload: Record<string, any> = {
    user_id: userId,
    updated_at: new Date().toISOString()
  }

  if (subscriptionData.id) payload.id = subscriptionData.id
  if (subscriptionData.planId) payload.plan_id = subscriptionData.planId
  if (subscriptionData.status) payload.status = subscriptionData.status
  if (subscriptionData.provider) payload.provider = subscriptionData.provider
  if (subscriptionData.providerCustomerId !== undefined) payload.provider_customer_id = subscriptionData.providerCustomerId
  if (subscriptionData.providerSubscriptionId !== undefined) payload.provider_subscription_id = subscriptionData.providerSubscriptionId
  if (subscriptionData.currentPeriodStart) payload.current_period_start = subscriptionData.currentPeriodStart
  if (subscriptionData.currentPeriodEnd) payload.current_period_end = subscriptionData.currentPeriodEnd
  if (subscriptionData.cancelAtPeriodEnd !== undefined) payload.cancel_at_period_end = subscriptionData.cancelAtPeriodEnd

  const { error } = await supabase
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    console.error('[SubscriptionService] Failed to upsert subscription:', error.message)
    throw error
  }
}

/**
 * Returns the effective plan for a user.
 * Falls back to 'free' if no subscription exists or if it's expired/canceled and past end date.
 */
export async function getEffectivePlan(userId: string): Promise<PlanId> {
  const sub = await getSubscription(userId)
  
  if (!sub) return 'free'
  
  // If active or trialing, respect the plan
  if (sub.status === 'active' || sub.status === 'trialing') {
    return sub.planId
  }

  // If canceled or past_due, check if we are still within the grace period / billing period
  if ((sub.status === 'canceled' || sub.status === 'past_due') && new Date(sub.currentPeriodEnd) > new Date()) {
    return sub.planId
  }

  // Otherwise fallback
  return 'free'
}
