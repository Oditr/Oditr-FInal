// POST /api/feedback — General feedback submission

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { submitFeedback, type FeedbackType } from '@/lib/analytics/feedback-service'
import { trackProductEvent } from '@/lib/analytics/product-analytics-service'

const VALID_TYPES = new Set<FeedbackType>([
  'general', 'bug', 'feature_request', 'pricing', 'onboarding', 'report_quality'
])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, message, rating, page, workspaceId } = body

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  try {
    await submitFeedback({ userId: user.id, workspaceId, type, message, rating, page })

    // Track the feedback event
    trackProductEvent({
      eventName:   'feedback.submitted',
      userId:      user.id,
      workspaceId: workspaceId || null,
      properties:  { type, page: page || null, hasRating: rating != null },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
