import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClientReport } from '@/lib/agency/report-builder-service'

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await params
    const userRes = await getSupabaseUser(req)
    const userId = userRes?.data?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { projectId, reportType, selectedSections, title, summary } = body

    if (!projectId || !reportType || !selectedSections) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const clientReport = await createClientReport({
      userId,
      projectId,
      sourceAuditReportId: reportId,
      reportType,
      selectedSections,
      title,
      summary
    })

    return NextResponse.json(clientReport, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
