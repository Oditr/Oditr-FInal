// GET /api/analytics/features — Feature adoption data

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getFeatureAdoption, getUpgradeTriggers } from '@/lib/analytics/product-analytics-service'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [adoption, triggers] = await Promise.all([
    getFeatureAdoption(),
    getUpgradeTriggers(),
  ])

  return NextResponse.json({ adoption, triggers })
}
