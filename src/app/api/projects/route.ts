// ── Projects API Route ──
// POST /api/projects — Create a new monitored project
// GET  /api/projects — List user's projects

import { NextRequest, NextResponse } from 'next/server'
import { createProject, getProjects } from '@/lib/monitoring/project-service'
import { createServerClient } from '@supabase/ssr'

function getSupabaseUser(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
      setAll: () => {},
    },
  })
  return supabase.auth.getUser()
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, url, businessType, currency } = body
  if (!name || !url) {
    return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
  }

  // Validate URL
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let userId: string | null = null
  try {
    const userRes = await getSupabaseUser(req)
    userId = userRes?.data?.user?.id || null
  } catch {}

  const project = await createProject({ name, url, businessType, currency }, userId)
  return NextResponse.json(project, { status: 201 })
}

export async function GET(req: NextRequest) {
  let userId: string | null = null
  try {
    const userRes = await getSupabaseUser(req)
    userId = userRes?.data?.user?.id || null
  } catch {}

  const projects = await getProjects(userId)
  return NextResponse.json(projects)
}
