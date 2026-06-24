// ── Manual Scan Trigger Route ──
// POST /api/projects/:projectId/scan — Run a monitoring scan for a project

import { NextRequest, NextResponse } from 'next/server'
import { getProject } from '@/lib/monitoring/project-service'
import { runSingleProjectScan } from '@/lib/monitoring/scheduler-service'
import { runCustomAudit } from '@/lib/audit-engine'
import { createServerClient } from '@supabase/ssr'

export const maxDuration = 180

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

/**
 * Simple audit function that runs the custom audit engine only (for manual scans).
 * The full PSI + custom pipeline could also be used, but this is faster.
 */
async function runAudit(url: string): Promise<any> {
  const customResult = await runCustomAudit(url)

  return {
    url,
    healthScore: customResult.overallScore,
    scores: null, // PSI not run for monitoring scans (speed + rate limits)
    cwv: null,
    customAudit: customResult,
    issues: [], // Issues come from custom audit categories
    categoryScores: null,
    aiReadiness: null,
    partial: true,
    partialReason: 'Monitoring scan (custom engine only)',
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const userId = await getUserId(req)

  const project = await getProject(projectId, userId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const result = await runSingleProjectScan(project, userId || 'local', runAudit)

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Scan failed' }, { status: 502 })
  }

  return NextResponse.json(result)
}
