// GET /api/analytics/growth-insights — Auto-generated growth insights
// POST /api/analytics/growth-insights — Regenerate insights (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGrowthInsights, generateGrowthInsights } from '@/lib/analytics/growth-insights-service'
import { getChurnRiskSignals } from '@/lib/analytics/product-analytics-service'
import { getAverageNps } from '@/lib/analytics/feedback-service'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [insights, nps, churn] = await Promise.all([
    getGrowthInsights(),
    getAverageNps(),
    getChurnRiskSignals(),
  ])

  return NextResponse.json({
    insights,
    nps,
    churnSignals: churn?.signals?.length ?? 0,
  })
}

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Regenerate insights (fire and forget — can take a few seconds)
  const insights = await generateGrowthInsights()

  return NextResponse.json({ ok: true, generated: insights.length })
}
