// ── Stripe Webhook Handler ──
// Processes Stripe events to update user plans in Supabase.
// Handles: checkout.session.completed, customer.subscription.deleted,
//          customer.subscription.updated, invoice.payment_failed

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { upsertSubscription } from '@/lib/billing/subscription-service'
import { PlanId } from '@/lib/billing/types'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Use Supabase service role for webhook (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getStripe(): Stripe | null {
  if (!stripeSecretKey) return null
  return new Stripe(stripeSecretKey, { apiVersion: '2026-05-27.dahlia' as any })
}

function getServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Find user by Stripe customer ID
async function findUserByCustomerId(customerId: string) {
  const sb = getServiceSupabase()
  if (!sb) return null

  // We still check profiles for backward compatibility or we check subscriptions
  let { data } = await sb
    .from('subscriptions')
    .select('user_id')
    .eq('provider_customer_id', customerId)
    .single()

  if (!data) {
    // Check old profiles table
    const { data: profData } = await sb
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    if (profData) return profData.id
  }

  return data?.user_id || null
}

// Find user by email (fallback for first checkout)
async function findUserByEmail(email: string) {
  const sb = getServiceSupabase()
  if (!sb) return null

  const { data } = await sb.auth.admin.listUsers()
  const user = data?.users?.find(u => u.email === email)
  return user?.id || null
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured' },
      { status: 503 }
    )
  }

  // Verify webhook signature
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

  // Check idempotency
  const { data: existingEvent } = await sb.from('billing_events').select('id').eq('provider_event_id', event.id).single()
  if (existingEvent) {
    return NextResponse.json({ received: true, note: 'Already processed' })
  }

  // Process event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const email = session.customer_details?.email || session.customer_email
        let userId = session.client_reference_id

        if (!userId) {
          userId = await findUserByCustomerId(customerId)
          if (!userId && email) {
            userId = await findUserByEmail(email)
          }
        }

        const planId = session.metadata?.planId as PlanId || 'pro'

        if (userId && subscriptionId) {
          // Fetch subscription details to get period start/end
          const subDetails = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription

          await upsertSubscription(userId, {
            planId: planId,
            status: subDetails.status as any,
            provider: 'stripe',
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            currentPeriodStart: new Date(subDetails.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subDetails.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subDetails.cancel_at_period_end
          })
          console.log(`[Webhook] User ${userId} upgraded to ${planId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = await findUserByCustomerId(customerId)

        if (userId) {
          await upsertSubscription(userId, {
            status: subscription.status as any,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = await findUserByCustomerId(customerId)

        if (userId) {
          await upsertSubscription(userId, {
            status: 'canceled',
            providerSubscriptionId: null, // Depending on if we want to keep it
          })
          console.log(`[Webhook] User ${userId} subscription deleted`)
        }
        break
      }

      default:
        break
    }

    // Save event to idempotency table
    await sb.from('billing_events').insert({
      id: crypto.randomUUID(),
      provider: 'stripe',
      event_type: event.type,
      provider_event_id: event.id,
      payload: event as any
    })

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Webhook] Processing error:', err.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
