// ── Stripe Checkout Session API ──
// Creates a Stripe Checkout Session and returns the URL for redirect.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { STRIPE_PRICES } from '@/lib/plans'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe | null {
  if (!stripeSecretKey) return null
  return new Stripe(stripeSecretKey, { apiVersion: '2026-05-27.dahlia' })
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { priceId, billingCycle, successUrl, cancelUrl } = body

    // Determine price ID
    let stripePriceId = priceId
    if (!stripePriceId) {
      stripePriceId = billingCycle === 'yearly'
        ? STRIPE_PRICES.pro_yearly
        : STRIPE_PRICES.pro_monthly
    }

    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'No Stripe price ID configured. Set STRIPE_PRO_MONTHLY_PRICE_ID in .env.local' },
        { status: 400 }
      )
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.nextUrl.origin}/dashboard?upgraded=true`,
      cancel_url: cancelUrl || `${req.nextUrl.origin}/pricing`,
      metadata: {
        source: 'vitalfix_pricing_page',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe Checkout] Error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
