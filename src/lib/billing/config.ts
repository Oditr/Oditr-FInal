import { PlanConfig, PlanId } from './types'

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for first-time users, students, and small testing.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    stripeMonthlyPriceId: '',
    stripeYearlyPriceId: '',
    color: '#34d399',
    limits: {
      id: 'free-limits',
      name: 'Free Limits',
      monthlyAudits: 3,
      maxProjects: 1,
      monthlyRumEvents: 0,
      historyRetentionDays: 7,
    },
    features: {
      'audit.basic': { id: 'audit.basic', name: 'Basic Audit Engine', available: true },
      'audit.ai_readiness': { id: 'audit.ai_readiness', name: 'AI-Agent Readiness', available: 'preview' },
      'audit.revenue_impact': { id: 'audit.revenue_impact', name: 'Revenue Impact estimates', available: 'preview' },
      'monitoring.enabled': { id: 'monitoring.enabled', name: 'Continuous Monitoring', available: false },
      'rum.enabled': { id: 'rum.enabled', name: 'Real User Monitoring', available: false },
      'agency.white_label': { id: 'agency.white_label', name: 'White-label reports', available: false },
      'reports.pdf_export': { id: 'reports.pdf_export', name: 'PDF Exports', available: false }
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Great for indie developers, freelancers, and small founders.',
    monthlyPrice: 9,
    yearlyPrice: 89,
    currency: 'USD',
    stripeMonthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || '',
    stripeYearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || '',
    color: '#38bdf8',
    limits: {
      id: 'starter-limits',
      name: 'Starter Limits',
      monthlyAudits: 50,
      maxProjects: 3,
      monthlyRumEvents: 0,
      historyRetentionDays: 90,
    },
    features: {
      'audit.basic': { id: 'audit.basic', name: 'Basic Audit Engine', available: true },
      'audit.ai_readiness': { id: 'audit.ai_readiness', name: 'AI-Agent Readiness', available: true },
      'audit.revenue_impact': { id: 'audit.revenue_impact', name: 'Revenue Impact estimates', available: true },
      'monitoring.enabled': { id: 'monitoring.enabled', name: 'Continuous Monitoring', available: false }, // Prompt suggests "No/Limited" - let's make it true for 1 daily, but we'll say false for now and update later if needed, prompt says limited.
      'rum.enabled': { id: 'rum.enabled', name: 'Real User Monitoring', available: false },
      'agency.white_label': { id: 'agency.white_label', name: 'White-label reports', available: false },
      'reports.pdf_export': { id: 'reports.pdf_export', name: 'PDF Exports', available: true }
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For startups, serious founders, and small teams.',
    monthlyPrice: 49,
    yearlyPrice: 499,
    currency: 'USD',
    stripeMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    stripeYearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
    color: '#818cf8',
    limits: {
      id: 'pro-limits',
      name: 'Pro Limits',
      monthlyAudits: 300,
      maxProjects: 10,
      monthlyRumEvents: 50000,
      historyRetentionDays: 365,
    },
    features: {
      'audit.basic': { id: 'audit.basic', name: 'Basic Audit Engine', available: true },
      'audit.ai_readiness': { id: 'audit.ai_readiness', name: 'AI-Agent Readiness', available: true },
      'audit.revenue_impact': { id: 'audit.revenue_impact', name: 'Revenue Impact Engine', available: true },
      'monitoring.enabled': { id: 'monitoring.enabled', name: 'Continuous Monitoring', available: true },
      'rum.enabled': { id: 'rum.enabled', name: 'Real User Monitoring', available: true },
      'agency.white_label': { id: 'agency.white_label', name: 'White-label reports', available: false },
      'reports.pdf_export': { id: 'reports.pdf_export', name: 'PDF Exports', available: true }
    }
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies, consultants, and web studios.',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    currency: 'USD',
    stripeMonthlyPriceId: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID || '',
    stripeYearlyPriceId: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID || '',
    color: '#a78bfa',
    limits: {
      id: 'agency-limits',
      name: 'Agency Limits',
      monthlyAudits: 1000,
      maxProjects: 50,
      monthlyRumEvents: 500000,
      historyRetentionDays: -1, // Unlimited
    },
    features: {
      'audit.basic': { id: 'audit.basic', name: 'Basic Audit Engine', available: true },
      'audit.ai_readiness': { id: 'audit.ai_readiness', name: 'AI-Agent Readiness', available: true },
      'audit.revenue_impact': { id: 'audit.revenue_impact', name: 'Revenue Impact Engine', available: true },
      'monitoring.enabled': { id: 'monitoring.enabled', name: 'Continuous Monitoring', available: true },
      'rum.enabled': { id: 'rum.enabled', name: 'Real User Monitoring', available: true },
      'agency.white_label': { id: 'agency.white_label', name: 'White-label reports', available: true },
      'reports.pdf_export': { id: 'reports.pdf_export', name: 'PDF Exports', available: true }
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For larger companies, e-commerce, and custom needs.',
    monthlyPrice: -1, // Custom
    yearlyPrice: -1,
    currency: 'USD',
    stripeMonthlyPriceId: '',
    stripeYearlyPriceId: '',
    color: '#60a5fa',
    limits: {
      id: 'enterprise-limits',
      name: 'Custom Limits',
      monthlyAudits: -1,
      maxProjects: -1,
      monthlyRumEvents: -1,
      historyRetentionDays: -1,
    },
    features: {
      'audit.basic': { id: 'audit.basic', name: 'Basic Audit Engine', available: true },
      'audit.ai_readiness': { id: 'audit.ai_readiness', name: 'AI-Agent Readiness', available: true },
      'audit.revenue_impact': { id: 'audit.revenue_impact', name: 'Revenue Impact Engine', available: true },
      'monitoring.enabled': { id: 'monitoring.enabled', name: 'Continuous Monitoring', available: true },
      'rum.enabled': { id: 'rum.enabled', name: 'Real User Monitoring', available: true },
      'agency.white_label': { id: 'agency.white_label', name: 'White-label reports', available: true },
      'reports.pdf_export': { id: 'reports.pdf_export', name: 'PDF Exports', available: true }
    }
  }
}
