// ── Monitoring Alert Config API ──
// GET: Fetch current alert config for a project
// POST: Save/update alert config for a project

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const query = supabase
      .from('monitoring_alert_configs')
      .select('*')
      .eq('user_id', userId)

    if (projectId) query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ configs: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      projectId,
      emailEnabled,
      emailTo,
      slackEnabled,
      slackWebhookUrl,
      discordEnabled,
      discordWebhookUrl,
      scoreDropThreshold,
      dashboardUrl,
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Upsert the config
    const { data, error } = await supabase
      .from('monitoring_alert_configs')
      .upsert(
        {
          user_id: userId,
          project_id: projectId || null,
          email_enabled: emailEnabled ?? false,
          email_to: emailTo || null,
          slack_enabled: slackEnabled ?? false,
          slack_webhook_url: slackWebhookUrl || null,
          discord_enabled: discordEnabled ?? false,
          discord_webhook_url: discordWebhookUrl || null,
          score_drop_threshold: scoreDropThreshold ?? 5,
          dashboard_url: dashboardUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,project_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, config: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
