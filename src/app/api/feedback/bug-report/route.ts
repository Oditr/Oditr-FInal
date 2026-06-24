// POST /api/feedback/bug-report

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { submitBugReport } from '@/lib/analytics/feedback-service'
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
    await submitBugReport({
      userId:           user.id,
      workspaceId:      body.workspaceId,
      whatHappened:     body.whatHappened,
      expectedBehavior: body.expectedBehavior,
      page:             body.page,
      // Safe browser info — only user agent, no fingerprinting
      browserInfo:      body.browserInfo ? body.browserInfo.slice(0, 200) : undefined,
      errorId:          body.errorId,
    })

    trackProductEvent({
      eventName: 'bug_report.submitted',
      userId:    user.id,
      properties: { page: body.page?.slice(0, 200) },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
