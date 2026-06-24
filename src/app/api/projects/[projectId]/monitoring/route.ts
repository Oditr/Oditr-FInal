// ── Monitoring Settings API Route ──
// PATCH /api/projects/:projectId/monitoring — Toggle monitoring + set frequency

import { NextRequest, NextResponse } from 'next/server'
import { updateMonitoring } from '@/lib/monitoring/project-service'
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { enabled, frequency } = body
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 })
  }

  const validFrequencies = ['manual', 'daily', 'weekly', 'monthly']
  const freq = frequency || 'manual'
  if (!validFrequencies.includes(freq)) {
    return NextResponse.json({ error: `frequency must be one of: ${validFrequencies.join(', ')}` }, { status: 400 })
  }

  const userId = await getUserId(req)
  const updated = await updateMonitoring(projectId, enabled, freq, userId)

  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
