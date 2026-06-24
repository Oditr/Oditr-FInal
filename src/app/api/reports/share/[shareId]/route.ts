import { NextRequest, NextResponse } from 'next/server'
import { getClientReportByShareId } from '@/lib/agency/report-builder-service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params
    
    // Note: This route intentionally does NOT require authentication.
    // It relies on the unguessable shareId and the is_public flag.
    const clientReport = await getClientReportByShareId(shareId)

    if (!clientReport) {
      return NextResponse.json({ error: 'Report not found or expired' }, { status: 404 })
    }

    return NextResponse.json(clientReport)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
