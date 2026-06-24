// POST /api/feedback/feature-request

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { submitFeatureRequest } from '@/lib/analytics/feedback-service'
import { trackProductEvent } from '@/lib/analytics/product-analytics-service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await submitFeatureRequest({
      userId:      user.id,
      workspaceId: body.workspaceId,
      title:       body.title,
      description: body.description,
      useCase:     body.useCase,
      importance:  body.importance,
    })

    trackProductEvent({
      eventName: 'feature_request.submitted',
      userId:    user.id,
      properties: { title: body.title?.slice(0, 100) },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
