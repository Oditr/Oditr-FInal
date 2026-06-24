import { NextRequest, NextResponse } from 'next/server'
import { getBillingProvider } from '@/lib/billing/provider'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PlanId } from '@/lib/billing/types'

export async function POST(req: NextRequest) {
  try {
    const { planId, billingCycle } = await req.json()
    
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 })
    }

    // Identify user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {}
        }
      }
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const provider = getBillingProvider()
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing?success=true`
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`

    const checkoutUrl = await provider.createCheckoutSession({
      userId: session.user.id,
      planId: planId as PlanId,
      cycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
      successUrl,
      cancelUrl
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (err: any) {
    console.error('[Stripe Checkout] Error:', err.message)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
