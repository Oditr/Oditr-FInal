// ── Next.js Middleware ──
// Protects routes and handles auth-gated redirects.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard']

// Routes that should never be intercepted
const EXCLUDED_PATHS = [
  '/monitoring',          // Sentry tunnel
  '/api/stripe/webhook',  // Stripe webhook (has own auth via signature)
  '/_next',               // Static assets
  '/favicon',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip excluded paths
  if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Skip static files
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)) {
    return NextResponse.next()
  }

  // Only check auth for protected routes
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  if (!isProtected) {
    return NextResponse.next()
  }

  // Check Supabase auth session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured — allow through (dev mode)
    return NextResponse.next()
  }

  // Create server-side Supabase client with cookie handling
  let response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not authenticated — redirect to home with a login prompt
    const loginUrl = new URL('/', req.url)
    loginUrl.searchParams.set('login', 'required')
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes we want to exclude
    '/((?!_next/static|_next/image|favicon.ico|monitoring|api/stripe/webhook).*)',
  ],
}
