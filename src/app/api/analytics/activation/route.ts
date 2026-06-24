// GET /api/analytics/activation — Activation funnel data (workspace owner only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActivationFunnel } from '@/lib/analytics/product-analytics-service'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await getActivationFunnel()
  if (!data) return NextResponse.json({ error: 'No data available' }, { status: 503 })

  return NextResponse.json(data)
}
