// ── POST /api/v1/revenue/calculate — Run revenue impact calculation ──
// Accepts audit result issues + a business profile and returns revenue impact report.
// Persists the report to Supabase if authenticated.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  buildRevenueImpactReport,
  auditResultToIssues,
} from '@/lib/revenue-impact'
import type { BusinessProfile } from '@/lib/revenue-impact'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate profile
    if (!body.profile || typeof body.profile !== 'object') {
      return NextResponse.json(
        { error: 'Missing business profile', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const profile: BusinessProfile = body.profile

    // Convert audit findings into IssueImpactInput[]
    const issues = auditResultToIssues(
      body.url || '',
      body.customFindings || [],
      body.lighthouseOpportunities || []
    )

    if (issues.length === 0) {
      return NextResponse.json(
        { error: 'No audit issues provided for calculation', code: 'NO_ISSUES' },
        { status: 400 }
      )
    }

    // Build the report (synchronous math)
    const report = buildRevenueImpactReport(profile, issues, body.reportId)

    // Attempt to persist the report to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies()
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      })

      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        // Save to DB
        const { error: dbError } = await supabase
          .from('revenue_impact_results')
          .insert({
            report_id: report.reportId,
            project_id: report.projectId,
            user_id: authData.user.id,
            total_estimated_revenue_at_risk: report.totalEstimatedRevenueAtRisk,
            total_estimated_lead_value_at_risk: report.totalEstimatedLeadValueAtRisk,
            currency: report.currency,
            overall_confidence: report.overallConfidence,
            issue_impacts: report.issueImpacts,
            created_at: report.createdAt,
          })
        
        if (dbError) {
          console.error('[Revenue Calculate] Failed to persist report:', dbError.message)
        }
      }
    }

    return NextResponse.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[Revenue Calculate] Error:', message)
    return NextResponse.json(
      { error: message, code: 'CALCULATION_FAILED' },
      { status: 500 }
    )
  }
}
