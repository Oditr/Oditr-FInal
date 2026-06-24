// ── Project Detail API Route ──
// GET   /api/projects/:projectId — Get project detail
// PATCH /api/projects/:projectId — Update project

import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/monitoring/project-service'
import { createServerClient } from '@supabase/ssr'

function getUserId(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return Promise.resolve(null)

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
      setAll: () => {},
    },
  })
  return supabase.auth.getUser().then(r => r?.data?.user?.id || null).catch(() => null)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const userId = await getUserId(req)
  const project = await getProject(projectId, userId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const userId = await getUserId(req)
  const updated = await updateProject(projectId, body, userId)

  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
