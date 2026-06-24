export type BusinessType =
  | 'saas'
  | 'ecommerce'
  | 'agency'
  | 'lead_generation'
  | 'marketplace'
  | 'blog'
  | 'portfolio'
  | 'other'

export type ConversionGoal =
  | 'purchase'
  | 'lead_submission'
  | 'signup'
  | 'demo_booking'
  | 'contact_request'
  | 'newsletter'
  | 'trial_start'
  | 'custom'

export type FunnelStage =
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'checkout'
  | 'retention'

export type BusinessCriticality = 'low' | 'medium' | 'high' | 'critical'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type ImpactCategory =
  | 'conversion'
  | 'seo_traffic'
  | 'trust'
  | 'lead_quality'
  | 'revenue_risk'

export type PriorityLabel =
  | 'Critical Revenue Risk'
  | 'High Revenue Risk'
  | 'Moderate Revenue Risk'
  | 'Low Revenue Risk'
  | 'Informational'

export type FixDifficulty = 'easy' | 'medium' | 'hard' | 'unknown'

export interface ImportantPage {
  url: string
  pageType: string
  trafficShare: number // 0 to 1
  funnelStage: FunnelStage
  businessCriticality: BusinessCriticality
  conversionImportance: 'low' | 'medium' | 'high'
}

export interface BusinessProfile {
  id?: string
  projectId: string
  userId?: string
  businessType: BusinessType
  currency: string
  monthlyVisitors: number | null
  monthlySessions: number | null
  conversionRate: number | null // 0 to 1
  averageOrderValue: number | null
  averageLeadValue: number | null
  averageCustomerValue: number | null
  trialToPaidRate: number | null // 0 to 1
  primaryConversionGoal: ConversionGoal
  importantPages: ImportantPage[]
  createdAt?: string
  updatedAt?: string
}

export interface IssueImpactInput {
  issueId: string
  issueTitle: string
  issueCategory: string
  technicalSeverity: 'low' | 'medium' | 'high' | 'critical'
  affectedUrl?: string
}

export interface IssueImpactOutput {
  issueId: string
  issueTitle: string
  issueCategory: string
  technicalSeverity: 'low' | 'medium' | 'high' | 'critical'
  impactCategory: ImpactCategory[]
  affectedUrl: string
  pageType: string
  funnelStage: FunnelStage
  businessCriticality: BusinessCriticality
  estimatedAffectedSessions: number
  baselineConversions: number
  baselineRevenue: number
  impactFactor: number
  estimatedRevenueAtRisk: number
  confidence: ConfidenceLevel
  priorityScore: number
  priorityLabel: PriorityLabel
  fixDifficulty: FixDifficulty
  recommendedAction: string
  assumptionsUsed: {
    monthlySessions: number
    conversionRate: number
    aov: number
    pageTrafficShare: number
    impactFactor: number
    isEstimatedSessions: boolean
    isEstimatedConversion: boolean
    isEstimatedAov: boolean
    isEstimatedTrafficShare: boolean
  }
}

export interface RevenueImpactResult {
  reportId: string
  projectId: string
  totalEstimatedRevenueAtRisk: number
  totalEstimatedLeadValueAtRisk: number
  currency: string
  overallConfidence: ConfidenceLevel
  issueImpacts: IssueImpactOutput[]
  createdAt: string
}
