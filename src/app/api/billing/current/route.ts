import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEffectivePlan, getSubscription } from '@/lib/billing/subscription-service'
import { PLANS } from '@/lib/billing/config'
import { getUsageSummary } from '@/lib/billing/usage-service'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const planId = await getEffectivePlan(userId)
  const subscription = await getSubscription(userId)
  const planConfig = PLANS[planId]

  // Track key limits
  const usageKeys = ['audit.runs', 'rum.events', 'projects.count']
  const usageCounts = await getUsageSummary(userId, usageKeys)

  // As a special case, if projects limit exists, we might also just query DB directly. 
  // Let's do it directly here for accuracy.
  const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  usageCounts['projects.count'] = projectCount || 0

  return NextResponse.json({
    planId,
    planName: planConfig.name,
    subscriptionStatus: subscription?.status || 'none',
    periodEnd: subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    usage: {
      audits: {
        used: usageCounts['audit.runs'] || 0,
        limit: planConfig.limits.monthlyAudits
      },
      rum: {
        used: usageCounts['rum.events'] || 0,
        limit: planConfig.limits.monthlyRumEvents
      },
      projects: {
        used: usageCounts['projects.count'] || 0,
        limit: planConfig.limits.maxProjects
      }
    }
  })
}
