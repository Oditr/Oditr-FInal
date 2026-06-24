import Stripe from 'stripe'
import { PlanId } from './types'
import { PLANS } from './config'

export interface BillingProvider {
  createCheckoutSession(params: { userId: string, planId: PlanId, cycle: 'monthly' | 'yearly', successUrl: string, cancelUrl: string }): Promise<string>
  createCustomerPortalSession(params: { customerId: string, returnUrl: string }): Promise<string>
  getCustomerId(userId: string): Promise<string | null>
}

// Singleton for Stripe initialization
let stripeClient: Stripe | null = null

export function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  stripeClient = new Stripe(key, { apiVersion: '2026-05-27.dahlia' as any })
  return stripeClient
}

export const stripeBillingProvider: BillingProvider = {
  async createCheckoutSession({ userId, planId, cycle, successUrl, cancelUrl }) {
    const stripe = getStripe()
    if (!stripe) throw new Error('Stripe is not configured')

    const plan = PLANS[planId]
    if (!plan) throw new Error(`Invalid plan: ${planId}`)

    const priceId = cycle === 'monthly' ? plan.stripeMonthlyPriceId : plan.stripeYearlyPriceId
    if (!priceId) throw new Error(`No Stripe price ID configured for ${planId} ${cycle}`)

    // Create session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        planId,
      }
    })

    if (!session.url) throw new Error('Failed to create Stripe checkout session URL')
    return session.url
  },

  async createCustomerPortalSession({ customerId, returnUrl }) {
    const stripe = getStripe()
    if (!stripe) throw new Error('Stripe is not configured')

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session.url
  },

  async getCustomerId() {
    return null // Usually fetched from DB in our architecture
  }
}

// Fallback provider for local dev / testing without keys
export const manualBillingProvider: BillingProvider = {
  async createCheckoutSession({ successUrl }) {
    console.warn('[Manual Billing] Bypassing checkout')
    return successUrl
  },
  async createCustomerPortalSession({ returnUrl }) {
    console.warn('[Manual Billing] Bypassing portal')
    return returnUrl
  },
  async getCustomerId() {
    return null
  }
}

export function getBillingProvider(): BillingProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    return stripeBillingProvider
  }
  return manualBillingProvider
}
