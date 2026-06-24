// ── SaaS Plan & Billing Types ──

export type PlanId = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise'

export interface PlanLimit {
  id: string
  name: string
  monthlyAudits: number     // -1 = unlimited
  maxProjects: number       // -1 = unlimited
  monthlyRumEvents: number  // -1 = unlimited
  historyRetentionDays: number // -1 = unlimited
}

export interface PlanFeature {
  id: string
  name: string
  available: boolean | 'preview'
}

export interface PlanConfig {
  id: PlanId
  name: string
  description: string
  monthlyPrice: number      // -1 = custom
  yearlyPrice: number       // -1 = custom
  currency: string
  stripeMonthlyPriceId: string
  stripeYearlyPriceId: string
  limits: PlanLimit
  features: Record<string, PlanFeature>
  color: string
}

export interface Subscription {
  id: string
  workspaceId: string
  userId?: string // optional backward compatibility if needed, but primarily workspaceId
  planId: PlanId
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  provider: 'stripe' | 'manual'
  providerCustomerId: string | null
  providerSubscriptionId: string | null
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

export interface UsageRecord {
  id: string
  userId: string
  featureKey: string
  quantity: number
  billingPeriod: string
  metadata?: any
  createdAt: string
}

export interface AccessCheckResult {
  allowed: boolean
  reason?: 'limit_reached' | 'feature_locked'
  currentPlan: PlanId
  requiredPlan?: PlanId
  usage?: {
    used: number
    limit: number
  }
  upgradeMessage?: string
}
