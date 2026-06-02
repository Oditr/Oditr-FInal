// ── Stripe Webhook Handler ──
// Processes Stripe events to update user plans in Supabase.
// Handles: checkout.session.completed, customer.subscription.deleted,
//          customer.subscription.updated, invoice.payment_failed

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Use Supabase service role for webhook (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getStripe(): Stripe | null {
  if (!stripeSecretKey) return null
  return new Stripe(stripeSecretKey, { apiVersion: '2026-05-27.dahlia' })
}

function getServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Find user by Stripe customer ID
async function findUserByCustomerId(customerId: string) {
  const sb = getServiceSupabase()
  if (!sb) return null

  const { data } = await sb
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  return data?.id || null
}

// Find user by email (fallback for first checkout)
async function findUserByEmail(email: string) {
  const sb = getServiceSupabase()
  if (!sb) return null

  const { data } = await sb.auth.admin.listUsers()
  const user = data?.users?.find(u => u.email === email)
  return user?.id || null
}

// Update profile plan
async function updateProfile(userId: string, updates: Record<string, any>) {
  const sb = getServiceSupabase()
  if (!sb) return

  const { error } = await sb
    .from('profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[Webhook] Profile update error:', error.message)
  }
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

  // Process event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const email = session.customer_details?.email || session.customer_email

        // Find user by customer ID first, then by email
        let userId = await findUserByCustomerId(customerId)
        if (!userId && email) {
          userId = await findUserByEmail(email)
        }

        if (userId) {
          await updateProfile(userId, {
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          console.log(`[Webhook] User ${userId} upgraded to Pro`)
        } else {
          console.warn(`[Webhook] No user found for customer ${customerId} / email ${email}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = await findUserByCustomerId(customerId)

        if (userId) {
          const isActive = ['active', 'trialing'].includes(subscription.status)
          const periodEnd = (subscription as any).current_period_end as number | undefined
          await updateProfile(userId, {
            plan: isActive ? 'pro' : 'free',
            plan_expires_at: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const userId = await findUserByCustomerId(customerId)

        if (userId) {
          await updateProfile(userId, {
            plan: 'free',
            stripe_subscription_id: null,
            plan_expires_at: null,
          })
          console.log(`[Webhook] User ${userId} downgraded to Free`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const userId = await findUserByCustomerId(customerId)

        if (userId) {
          console.warn(`[Webhook] Payment failed for user ${userId}`)
          // Don't immediately downgrade — Stripe retries for ~3 weeks
          // Just log it. Subscription.deleted will fire if all retries fail.
        }
        break
      }

      default:
        // Unhandled event type — ignore silently
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Webhook] Processing error:', err.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
