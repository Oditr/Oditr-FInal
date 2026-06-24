import { AccessCheckResult, PlanId } from './types'
import { getEffectivePlan } from './subscription-service'
import { getUsageCount } from './usage-service'
import { PLANS } from './config'

export async function checkFeatureAccess(userId: string, featureKey: string): Promise<AccessCheckResult> {
  const planId = await getEffectivePlan(userId)
  const plan = PLANS[planId]
  
  if (!plan) {
    return { allowed: false, currentPlan: 'free', reason: 'feature_locked' }
  }

  const feature = plan.features[featureKey]
  
  // If the feature is completely disabled for this plan
  if (!feature || feature.available === false) {
    return {
      allowed: false,
      currentPlan: planId,
      reason: 'feature_locked',
      upgradeMessage: `The ${featureKey} feature is not available on the ${plan.name} plan.`
    }
  }

  // If it's preview or true, we generally allow it from a feature gate perspective.
  // Limits check must be done separately if it's a metered feature (like audits, projects)
  return {
    allowed: true,
    currentPlan: planId,
  }
}

/**
 * Checks if a user can consume a metered limit (e.g. audits, projects, rum_events).
 */
export async function checkLimitAccess(userId: string, limitKey: 'monthlyAudits' | 'maxProjects' | 'monthlyRumEvents'): Promise<AccessCheckResult> {
  const planId = await getEffectivePlan(userId)
  const plan = PLANS[planId]
  
  if (!plan) {
    return { allowed: false, currentPlan: 'free', reason: 'limit_reached' }
  }

  const limit = plan.limits[limitKey]
  
  // Unlimited
  if (limit === -1) {
    return { allowed: true, currentPlan: planId, usage: { used: 0, limit: -1 } }
  }

  // For projects, we might want to check the actual current count in the DB rather than usage_records over a month.
  // But usage_records can track "projects.created". To be robust, let's assume we use usage_records for audits and rum_events.
  // We map limitKeys to featureKeys for usage.
  let featureKey = ''
  if (limitKey === 'monthlyAudits') featureKey = 'audit.runs'
  else if (limitKey === 'monthlyRumEvents') featureKey = 'rum.events'
  else if (limitKey === 'maxProjects') featureKey = 'projects.count' // This is tricky, projects.count might be better queried from the projects table directly.

  let used = 0
  if (featureKey === 'projects.count') {
    // Ideally query projects table: select count(*) where user_id = userId
    // To avoid circular dependencies, we'll fetch it via supabase here:
    const { supabase } = await import('@/lib/supabase')
    if (supabase) {
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      used = count || 0
    }
  } else {
    used = await getUsageCount(userId, featureKey)
  }

  if (used >= limit) {
    return {
      allowed: false,
      currentPlan: planId,
      reason: 'limit_reached',
      usage: { used, limit },
      upgradeMessage: `You have reached your ${limitKey} limit (${used}/${limit}) on the ${plan.name} plan.`
    }
  }

  return {
    allowed: true,
    currentPlan: planId,
    usage: { used, limit }
  }
}
