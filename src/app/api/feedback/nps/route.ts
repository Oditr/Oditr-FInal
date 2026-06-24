// POST /api/feedback/nps — NPS survey submission

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { submitNps } from '@/lib/analytics/feedback-service'
import { trackProductEvent } from '@/lib/analytics/product-analytics-service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const score = Number(body.score)
  if (isNaN(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: 'Score must be 0–10' }, { status: 400 })
  }

  try {
    await submitNps({
      userId:      user.id,
      workspaceId: body.workspaceId,
      score,
      reason:      body.reason,
    })

    const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor'
    trackProductEvent({
      eventName: 'nps.submitted',
      userId:    user.id,
      properties: { score, category },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
