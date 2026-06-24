// ── Growth Insights Service ──
// Generates simple, rule-based product growth insights.

import { createClient } from '@supabase/supabase-js'
import {
  getActivationFunnel,
  getUpgradeFunnel,
  getFeatureAdoption,
  getUpgradeTriggers,
  getChurnRiskSignals,
} from './product-analytics-service'
import { getAverageNps } from './feedback-service'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export interface GrowthInsight {
  insightType: 'activation' | 'conversion' | 'churn_risk' | 'feature_adoption' | 'upgrade_intent' | 'nps'
  title: string
  description: string
  metric?: Record<string, any>
  recommendation?: string
  severity: 'info' | 'warning' | 'critical'
}

// ── Generate growth insights from existing analytics data ──
export async function generateGrowthInsights(): Promise<GrowthInsight[]> {
  const insights: GrowthInsight[] = []

  try {
    // ── Activation Funnel insights ──
    const activation = await getActivationFunnel()
    if (activation) {
      const { steps } = activation

      const signupStep    = steps.find(s => s.step === 'user.signed_up')
      const auditDoneStep = steps.find(s => s.step === 'audit.completed')
      const reportStep    = steps.find(s => s.step === 'audit.report_viewed')

      if (signupStep && auditDoneStep) {
        const auditConversion = auditDoneStep.conversionRate
        if (auditConversion < 40) {
          insights.push({
            insightType: 'activation',
            title: 'Low First-Audit Completion Rate',
            description: `Only ${auditConversion}% of users who sign up complete their first audit.`,
            metric: { signups: signupStep.count, auditsDone: auditDoneStep.count, conversionRate: auditConversion },
            recommendation: 'Consider simplifying the first audit flow or adding a stronger CTA in onboarding.',
            severity: auditConversion < 20 ? 'critical' : 'warning',
          })
        }
      }

      if (auditDoneStep && reportStep) {
        const viewConversion = auditDoneStep.count > 0
          ? Math.round((reportStep.count / auditDoneStep.count) * 100) : 0
        if (viewConversion < 60) {
          insights.push({
            insightType: 'activation',
            title: 'Audit Completed but Report Not Viewed',
            description: `${100 - viewConversion}% of users who finish an audit don't view the report.`,
            metric: { audits: auditDoneStep.count, reportViews: reportStep.count },
            recommendation: 'Auto-redirect to report after audit completion.',
            severity: 'warning',
          })
        }
      }
    }

    // ── Upgrade Funnel insights ──
    const upgrade = await getUpgradeFunnel()
    if (upgrade) {
      const pricingStep   = upgrade.steps.find(s => s.step === 'billing.pricing_viewed')
      const checkoutStep  = upgrade.steps.find(s => s.step === 'billing.checkout_completed')

      if (pricingStep && checkoutStep && pricingStep.count > 0) {
        const paidConv = Math.round((checkoutStep.count / pricingStep.count) * 100)
        if (paidConv < 10 && pricingStep.count > 20) {
          insights.push({
            insightType: 'conversion',
            title: 'Low Pricing-to-Paid Conversion',
            description: `Only ${paidConv}% of users who view pricing complete checkout.`,
            metric: { pricingViews: pricingStep.count, checkoutDone: checkoutStep.count },
            recommendation: 'Review pricing page copy, add social proof or a trial CTA.',
            severity: 'warning',
          })
        }
      }
    }

    // ── Feature Adoption insights ──
    const adoption = await getFeatureAdoption()
    if (adoption) {
      const lowAdoption = adoption.features.filter(f => f.totalEvents < 5)
      if (lowAdoption.length > 0) {
        insights.push({
          insightType: 'feature_adoption',
          title: 'Low Feature Adoption',
          description: `These features have very low usage: ${lowAdoption.map(f => f.label).join(', ')}.`,
          metric: { features: lowAdoption.map(f => ({ name: f.label, events: f.totalEvents })) },
          recommendation: 'Surface these features more prominently in onboarding or the dashboard.',
          severity: 'info',
        })
      }
    }

    // ── Upgrade Trigger insights ──
    const triggers = await getUpgradeTriggers()
    if (triggers && triggers.triggers.length > 0) {
      const top = triggers.triggers[0]
      insights.push({
        insightType: 'upgrade_intent',
        title: `"${top.feature}" is the Top Upgrade Trigger`,
        description: `Users hit the "${top.feature}" limit ${top.count} times, indicating strong upgrade intent.`,
        metric: { triggers: triggers.triggers.slice(0, 5) },
        recommendation: `Consider highlighting the "${top.feature}" limit on the upgrade modal.`,
        severity: 'info',
      })
    }

    // ── Churn Risk insights ──
    const churn = await getChurnRiskSignals()
    if (churn) {
      const noAudit  = churn.signals.filter(s => s.signal === 'no_first_audit').length
      const inactive = churn.signals.filter(s => s.signal === 'inactive_14d').length

      if (noAudit > 5) {
        insights.push({
          insightType: 'churn_risk',
          title: `${noAudit} Users Never Ran Their First Audit`,
          description: 'These users signed up but have not completed any audit — high churn risk.',
          metric: { count: noAudit },
          recommendation: 'Send a re-engagement email or surface an in-app prompt.',
          severity: noAudit > 20 ? 'critical' : 'warning',
        })
      }

      if (inactive > 5) {
        insights.push({
          insightType: 'churn_risk',
          title: `${inactive} Users Inactive for 14+ Days`,
          description: 'These users had activity but have gone quiet — potential churn.',
          metric: { count: inactive },
          recommendation: 'Consider a re-engagement campaign or in-app notification.',
          severity: 'warning',
        })
      }
    }

    // ── NPS insights ──
    const nps = await getAverageNps()
    if (nps) {
      const severity = nps.score < 0 ? 'critical' : nps.score < 30 ? 'warning' : 'info'
      insights.push({
        insightType: 'nps',
        title: `NPS Score: ${nps.score}`,
        description: `Based on ${nps.count} responses — ${nps.promoters} promoters, ${nps.detractors} detractors.`,
        metric: { score: nps.score, count: nps.count, promoters: nps.promoters, detractors: nps.detractors },
        recommendation: nps.score < 30 ? 'Actively collect negative feedback to understand detractor reasons.' : 'Great score — consider requesting reviews or referrals from promoters.',
        severity,
      })
    }

    // ── Persist to DB ──
    const supabase = getServiceClient()
    if (supabase && insights.length > 0) {
      // Clear old global insights and replace
      await supabase.from('growth_insights').delete().eq('scope', 'global')
      await supabase.from('growth_insights').insert(
        insights.map(i => ({
          scope:          'global',
          insight_type:   i.insightType,
          title:          i.title,
          description:    i.description,
          metric:         i.metric || {},
          recommendation: i.recommendation || null,
          severity:       i.severity,
        }))
      )
    }

    return insights
  } catch (e) {
    console.warn('[growth-insights] generation failed:', (e as Error).message)
    return []
  }
}

// ── Fetch persisted growth insights ──
export async function getGrowthInsights(): Promise<GrowthInsight[]> {
  const supabase = getServiceClient()
  if (!supabase) return []

  const { data } = await supabase
    .from('growth_insights')
    .select('insight_type, title, description, metric, recommendation, severity')
    .eq('scope', 'global')
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []).map(r => ({
    insightType: r.insight_type,
    title: r.title,
    description: r.description,
    metric: r.metric,
    recommendation: r.recommendation,
    severity: r.severity,
  })) as GrowthInsight[]
}
