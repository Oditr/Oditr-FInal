import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkFeatureAccess, checkLimitAccess } from '@/lib/billing/access-service'

export async function GET(req: NextRequest) {
  const featureKey = req.nextUrl.searchParams.get('feature')
  const limitKey = req.nextUrl.searchParams.get('limit') as any

  if (!featureKey && !limitKey) {
    return NextResponse.json({ error: 'Missing feature or limit parameter' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', allowed: false }, { status: 401 })
  }

  try {
    let result
    if (featureKey) {
      result = await checkFeatureAccess(session.user.id, featureKey)
    } else if (limitKey) {
      result = await checkLimitAccess(session.user.id, limitKey)
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Access Check] Error:', err.message)
    return NextResponse.json({ error: 'Internal server error', allowed: false }, { status: 500 })
  }
}
