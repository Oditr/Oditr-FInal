import { inngest } from './client'
import { fetchPSI } from '@/lib/psi-pool'
import { createClient } from '@supabase/supabase-js'
import { buildRevenueImpactReport, auditResultToIssues, type BusinessProfile } from '@/lib/revenue-impact'
import { dispatchRegressionAlerts, type MonitoringAlertConfig, type ScoreSnapshot } from '@/lib/alerting'

// @ts-ignore
export const runAsyncAudit = inngest.createFunction(
  { id: 'run-async-audit' },
  { event: 'audit/run' },
  // @ts-ignore
  async ({ event, step }: any) => {
    const { url, userId, teamId, projectId, strategy } = event.data

    // 1. Run the audit
    const auditData = await step.run('run-lighthouse', async () => {
      const res = await fetchPSI({
        url,
        strategy: strategy || 'mobile',
        categories: ['performance', 'accessibility', 'best-practices', 'seo'],
        timeout: 30000
      })
      if (!res.ok) throw new Error(`PSI Fetch failed: ${res.status}`)
      const payload = await res.json()
      const data = payload.lighthouseResult
      return data
    })

    // 2. Save results to DB
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const healthScore = Math.round((auditData.categories.performance?.score || 0) * 100)

    await step.run('save-to-db', async () => {
      await supabase.from('scans').insert({
        url,
        user_id: userId,
        team_id: teamId,
        project_id: projectId,
        strategy: strategy || 'mobile',
        fetched_at: new Date().toISOString(),
        health_score: healthScore,
        scores: {
          performance: healthScore,
          accessibility: Math.round((auditData.categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((auditData.categories['best-practices']?.score || 0) * 100),
          seo: Math.round((auditData.categories.seo?.score || 0) * 100),
        },
      })
    })

    // 3. Auto-calculate revenue impact if business profile exists
    if (projectId && userId) {
      await step.run('calculate-revenue-impact', async () => {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single()

        if (profileError || !profileData) {
          // No profile found, skip revenue calculation
          return { skipped: true, reason: 'No business profile found' }
        }

        const profile: BusinessProfile = {
          projectId: profileData.project_id,
          userId: profileData.user_id,
          businessType: profileData.business_type,
          currency: profileData.currency,
          monthlyVisitors: profileData.monthly_visitors,
          monthlySessions: profileData.monthly_sessions,
          conversionRate: profileData.conversion_rate,
          averageOrderValue: profileData.average_order_value,
          averageLeadValue: profileData.average_lead_value,
          averageCustomerValue: profileData.average_customer_value,
          trialToPaidRate: profileData.trial_to_paid_rate,
          primaryConversionGoal: profileData.primary_conversion_goal,
          importantPages: profileData.important_pages || [],
        }

        // We only have Lighthouse opportunities from this async audit (no custom findings)
        const opportunities = []
        if (auditData.audits) {
          // Convert lighthouse audits into the format expected by auditResultToIssues
          // This is a simplified extraction since we don't have the full intelligence engine run here
          for (const key of Object.keys(auditData.audits)) {
            const audit = auditData.audits[key]
            if (audit.score !== null && audit.score < 1 && audit.details?.type === 'opportunity') {
              opportunities.push({
                id: audit.id,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                displayValue: audit.displayValue,
                numericValue: audit.numericValue,
              })
            }
          }
        }

        const issues = auditResultToIssues(url, [], opportunities)
        if (issues.length === 0) return { skipped: true, reason: 'No actionable issues found' }

        const runId = `rep_inngest_${Date.now()}`
        const report = buildRevenueImpactReport(profile, issues, runId)

        const { error: dbError } = await supabase
          .from('revenue_impact_results')
          .insert({
            report_id: report.reportId,
            project_id: report.projectId,
            user_id: userId,
            total_estimated_revenue_at_risk: report.totalEstimatedRevenueAtRisk,
            total_estimated_lead_value_at_risk: report.totalEstimatedLeadValueAtRisk,
            currency: report.currency,
            overall_confidence: report.overallConfidence,
            issue_impacts: report.issueImpacts,
            created_at: report.createdAt,
          })

        if (dbError) throw new Error(`Failed to persist report: ${dbError.message}`)

        return { success: true, reportId: runId }
      })
    }

    return { success: true, url }
  }
)

// ── Score Regression Alert Function ──
// Triggered after each scheduled audit completes.
// Compares old vs new scores and sends alerts to configured channels.
// @ts-ignore
export const scoreRegressionAlert = inngest.createFunction(
  { id: 'oditr/score-regression-alert' },
  { event: 'oditr/audit.completed' },
  // @ts-ignore
  async ({ event, step }: any) => {
    const { url, userId, projectId, newScores, oldScores } = event.data

    if (!newScores || !oldScores) {
      return { skipped: true, reason: 'No score snapshots provided' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch the user's alert configuration
    const alertConfig = await step.run('fetch-alert-config', async () => {
      const { data, error } = await supabase
        .from('monitoring_alert_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .single()

      if (error || !data) return null
      return data
    })

    if (!alertConfig) {
      return { skipped: true, reason: 'No alert configuration found for this project' }
    }

    // Dispatch alerts
    const result = await step.run('dispatch-alerts', async () => {
      const config: MonitoringAlertConfig = {
        emailEnabled: alertConfig.email_enabled ?? false,
        emailTo: alertConfig.email_to,
        slackEnabled: alertConfig.slack_enabled ?? false,
        slackWebhookUrl: alertConfig.slack_webhook_url,
        discordEnabled: alertConfig.discord_enabled ?? false,
        discordWebhookUrl: alertConfig.discord_webhook_url,
        scoreDropThreshold: alertConfig.score_drop_threshold ?? 5,
        dashboardUrl: alertConfig.dashboard_url,
      }

      const oldSnapshot: ScoreSnapshot[] = Object.entries(oldScores).map(([id, score]) => ({
        categoryId: id,
        label: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        score: score as number,
      }))
      const newSnapshot: ScoreSnapshot[] = Object.entries(newScores).map(([id, score]) => ({
        categoryId: id,
        label: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        score: score as number,
      }))

      return dispatchRegressionAlerts(url, oldSnapshot, newSnapshot, config)
    })

    return result
  }
)
