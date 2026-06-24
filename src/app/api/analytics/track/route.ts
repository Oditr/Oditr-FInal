// POST /api/analytics/track
// Accepts product analytics events from the browser (auth required)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { trackProductEvent, trackProductEventBatch } from '@/lib/analytics/product-analytics-service'
import { sanitizeProperties } from '@/lib/analytics/events'

// Rate limiting
const rateMap = new Map<string, { count: number; resetAt: number }>()

export async function POST(req: NextRequest) {
  // Analytics can be globally disabled
  if (process.env.PRODUCT_ANALYTICS_ENABLED === 'false') {
    return NextResponse.json({ ok: true, tracked: 0 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Rate limit by user or IP
  const rateLimitKey = user?.id || req.headers.get('x-forwarded-for')?.split(',')[0] || 'anon'
  const now = Date.now()
  const entry = rateMap.get(rateLimitKey)
  if (entry && now < entry.resetAt && entry.count >= 100) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }
  if (!entry || now >= entry.resetAt) {
    rateMap.set(rateLimitKey, { count: 0, resetAt: now + 60_000 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Single event
  if (body.eventName) {
    const sanitized = sanitizeProperties(body.properties || {})
    await trackProductEvent({
      eventName:   body.eventName,
      userId:      user?.id || null,
      workspaceId: body.workspaceId || null,
      projectId:   body.projectId  || null,
      sessionId:   body.sessionId  || null,
      properties:  sanitized,
    })
    rateMap.get(rateLimitKey)!.count++
    return NextResponse.json({ ok: true, tracked: 1 })
  }

  // Batch events
  if (Array.isArray(body.events)) {
    const events = body.events.slice(0, 50)
    await trackProductEventBatch(
      events.map((e: any) => ({
        eventName:   e.eventName,
        userId:      user?.id || null,
        workspaceId: e.workspaceId || null,
        projectId:   e.projectId  || null,
        sessionId:   e.sessionId  || null,
        properties:  sanitizeProperties(e.properties || {}),
      }))
    )
    rateMap.get(rateLimitKey)!.count += events.length
    return NextResponse.json({ ok: true, tracked: events.length })
  }

  return NextResponse.json({ error: 'No events provided' }, { status: 400 })
}
