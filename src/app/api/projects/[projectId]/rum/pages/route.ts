// ── RUM Worst Pages API Route ──
// GET /api/projects/:projectId/rum/pages

import { NextRequest, NextResponse } from 'next/server'
import { getWorstPages } from '@/lib/rum/aggregation-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // In production, validate user owns the project here.
  const pages = await getWorstPages(projectId, 7, 20)
  
  return NextResponse.json(pages)
}
