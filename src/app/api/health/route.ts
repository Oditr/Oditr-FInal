import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Quick DB check - fetch 1 record from profiles just to see if DB is responsive
    const start = Date.now()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    const dbLatency = Date.now() - start

    const status = error ? 'degraded' : 'healthy'

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        database: error ? 'disconnected' : 'connected',
        latency_ms: dbLatency,
        environment: process.env.NODE_ENV,
        version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev'
      },
      { status: error ? 503 : 200 }
    )
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (err as Error).message
      },
      { status: 500 }
    )
  }
}
