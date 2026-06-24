import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { exportIssuesAsCsv, safeFilename } from '@/lib/export/export-service'

// GET /api/export/report/[reportId]/csv — Download report issues as CSV
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const supabase = await createClient()

    // 1. Verify access to report
    const { data: report, error } = await supabase
      .from('reports')
      .select('id, url, data')
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Extract issues from report data
    const lighthouse = report.data?.lighthouse
    const custom = report.data?.customAudit
    
    const issues: any[] = []

    if (lighthouse?.opportunities) {
      lighthouse.opportunities.forEach((opp: any) => {
        issues.push({
          severity: 'high',
          category: 'performance',
          title: opp.title,
          impact: opp.displayValue,
          effort: 'medium',
          revenueRisk: ''
        })
      })
    }

    if (custom?.recommendations) {
      custom.recommendations.forEach((rec: any) => {
        issues.push({
          severity: rec.priority === 'P1' ? 'critical' : rec.priority === 'P2' ? 'high' : 'medium',
          category: rec.category,
          title: rec.title,
          impact: rec.impact,
          effort: rec.effort,
          revenueRisk: rec.revenueImpact ? `Risk of dropping ${rec.revenueImpact}` : ''
        })
      })
    }

    const csvData = exportIssuesAsCsv(issues)
    const filename = `oditr_report_${safeFilename(report.url)}.csv`

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (err: unknown) {
    console.error('[API] GET export csv error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
