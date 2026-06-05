// ── VitalFix RUM — Script Serving Route ──
// GET /api/rum/script?siteId=xxx
//
// Serves the vf.js monitoring script customized with the user's siteId.
// Returns application/javascript with aggressive caching.
//
// Installation snippet for users:
//   <script src="https://your-domain.com/api/rum/script?siteId=YOUR_SITE_ID" defer></script>

import { NextRequest, NextResponse } from 'next/server'
import { getVfScriptSource } from '@/lib/rum/vf-script-source'

const SITE_ID_RE = /^[a-zA-Z0-9_-]{3,64}$/

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId')

  if (!siteId || !SITE_ID_RE.test(siteId)) {
    return NextResponse.json(
      { error: 'Missing or invalid siteId parameter. Must be 3-64 alphanumeric characters.' },
      { status: 400 }
    )
  }

  // Build the collect endpoint URL from the current request origin
  const origin = req.nextUrl.origin
  const collectEndpoint = `${origin}/api/rum/collect`

  const script = getVfScriptSource(siteId, collectEndpoint)

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Cache for 1 hour at CDN, 5 minutes in browser
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      // Allow cross-origin script loading
      'Access-Control-Allow-Origin': '*',
      // Security: prevent MIME sniffing
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
