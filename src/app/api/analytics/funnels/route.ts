// GET /api/analytics/funnels — Activation + upgrade funnels

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActivationFunnel, getUpgradeFunnel } from '@/lib/analytics/product-analytics-service'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [activation, upgrade] = await Promise.all([
    getActivationFunnel(),
    getUpgradeFunnel(),
  ])

  return NextResponse.json({ activation, upgrade })
}
