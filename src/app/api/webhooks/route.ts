import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspace } from '@/lib/auth/workspace-service'
import { hasPermission, Role } from '@/lib/auth/permission-service'
import { testWebhook } from '@/lib/integrations/webhook-service'
import crypto from 'crypto'

// GET /api/webhooks — List webhooks for active workspace
export async function GET(req: NextRequest) {
  try {
    const { workspace, role } = await getActiveWorkspace()
    if (!workspace) return NextResponse.json({ error: 'No active workspace' }, { status: 403 })

    const supabase = await createClient()
    const { data: webhooks } = await supabase
      .from('webhook_endpoints')
      .select('id, url, events, enabled, description, created_at, updated_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ webhooks })
  } catch (err: unknown) {
    console.error('[API] GET /api/webhooks error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/webhooks — Create a webhook
export async function POST(req: NextRequest) {
  try {
    const { workspace, role } = await getActiveWorkspace()
    if (!workspace || !role) return NextResponse.json({ error: 'No active workspace' }, { status: 403 })

    if (!hasPermission(role as Role, 'webhooks.manage')) {
      return NextResponse.json({ error: 'Permission denied to manage webhooks' }, { status: 403 })
    }

    const { url, events, description } = await req.json()
    if (!url || !url.startsWith('https://')) {
      return NextResponse.json({ error: 'A valid HTTPS URL is required' }, { status: 400 })
    }

    // Test webhook format before saving
    const testResult = await testWebhook(url)
    if (!testResult.success) {
      return NextResponse.json({ 
        error: 'Webhook verification failed. Ensure the endpoint is reachable and returns 2xx for POST requests.',
        details: testResult.error 
      }, { status: 400 })
    }

    // Generate secret
    const rawSecret = crypto.randomBytes(32).toString('base64url')
    const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex')

    const supabase = await createClient()
    const { data: webhook, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        workspace_id: workspace.id,
        url,
        events: events || [],
        description: description || null,
        secret_hash: secretHash,
        enabled: true
      })
      .select('id, url, events, enabled, description, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ 
      webhook, 
      secret: rawSecret, // ONLY show this once!
      note: 'Save this secret. It will not be shown again. Use it to verify webhook signatures (X-Oditr-Signature).' 
    })
  } catch (err: unknown) {
    console.error('[API] POST /api/webhooks error:', (err as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
