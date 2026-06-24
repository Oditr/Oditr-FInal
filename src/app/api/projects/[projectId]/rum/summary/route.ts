// ── RUM Project Summary API Route ──
// GET /api/projects/:projectId/rum/summary

import { NextRequest, NextResponse } from 'next/server'
import { getProjectSummary } from '@/lib/rum/aggregation-service'
import { createServerClient } from '@supabase/ssr'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // In production, validate user owns the project here.
  const summary = await getProjectSummary(projectId, 7)
  
  return NextResponse.json(summary)
}
