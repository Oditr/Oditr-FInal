import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClientRecord, getClients } from '@/lib/agency/client-service'

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

export async function GET(req: NextRequest) {
  try {
    const userRes = await getSupabaseUser(req)
    const userId = userRes?.data?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clients = await getClients(userId)
    return NextResponse.json(clients)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRes = await getSupabaseUser(req)
    const userId = userRes?.data?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    if (!body.clientName) {
      return NextResponse.json({ error: 'clientName is required' }, { status: 400 })
    }

    const client = await createClientRecord(body, userId)
    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
