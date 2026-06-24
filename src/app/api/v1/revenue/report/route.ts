// ── GET /api/v1/revenue/report — Get historical revenue impact reports ──
// Requires authentication.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId') || 'default'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('revenue_impact_results')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    // Map db rows to RevenueImpactResult interface
    const reports = data.map(row => ({
      reportId: row.report_id,
      projectId: row.project_id,
      totalEstimatedRevenueAtRisk: row.total_estimated_revenue_at_risk,
      totalEstimatedLeadValueAtRisk: row.total_estimated_lead_value_at_risk,
      currency: row.currency,
      overallConfidence: row.overall_confidence,
      issueImpacts: row.issue_impacts,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ reports })
  } catch (err) {
    console.error('Report fetch error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message, code: 'REPORT_FETCH_FAILED' },
      { status: 500 }
    )
  }
}
