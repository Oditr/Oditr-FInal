// ── RUM Ingestion API Route ──
// POST /api/rum/collect

import { NextRequest, NextResponse } from 'next/server'
import { ingestEvent } from '@/lib/rum/ingestion-service'

// Use Edge runtime if possible for ingestion speed
// export const runtime = 'edge'

export async function POST(req: NextRequest) {
  // 1. CORS Headers
  // In a strict setup, we read req.headers.get('origin') and echo it if allowed.
  // We'll return wildcard CORS here and validate origin in the service for simplicity, 
  // but a preflight OPTION handler would be needed if not using sendBeacon or simple POSTs.
  // navigator.sendBeacon is a simple POST, so CORS preflight is usually bypassed.

  let payload: any
  try {
    const text = await req.text()
    payload = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  const origin = req.headers.get('origin') || req.headers.get('referer')

  const result = await ingestEvent(payload, origin)

  if (!result.success) {
    // Return 202 even on some failures to avoid polluting client console with errors
    const statusCode = result.status >= 500 ? 500 : result.status
    return NextResponse.json({ error: result.error }, { 
      status: statusCode,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }

  return NextResponse.json({ success: true }, { 
    status: 202,
    headers: { 'Access-Control-Allow-Origin': '*' } 
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
