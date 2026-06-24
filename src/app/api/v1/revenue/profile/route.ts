// ── POST /api/v1/revenue/profile — Save or update business profile ──
// ── GET  /api/v1/revenue/profile — Get business profile for a project ──

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { BusinessProfile } from '@/lib/revenue-impact'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch (error) {
          // Ignore
        }
      },
    },
  })

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const profile = validateProfile(body)

    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid business profile data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Force user ID to the authenticated user
    profile.userId = authData.user.id

    // Upsert into Supabase
    const { data, error } = await supabase
      .from('business_profiles')
      .upsert({
        project_id: profile.projectId,
        user_id: profile.userId,
        business_type: profile.businessType,
        currency: profile.currency,
        monthly_visitors: profile.monthlyVisitors,
        monthly_sessions: profile.monthlySessions,
        conversion_rate: profile.conversionRate,
        average_order_value: profile.averageOrderValue,
        average_lead_value: profile.averageLeadValue,
        average_customer_value: profile.averageCustomerValue,
        trial_to_paid_rate: profile.trialToPaidRate,
        primary_conversion_goal: profile.primaryConversionGoal,
        important_pages: profile.importantPages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id, user_id' })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      profile: dbToProfile(data),
    })
  } catch (err) {
    console.error('Profile save error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message, code: 'PROFILE_SAVE_FAILED' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId') || 'default'
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', authData.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No business profile found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ profile: dbToProfile(data) })
  } catch (err) {
    console.error('Profile fetch error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message, code: 'PROFILE_FETCH_FAILED' },
      { status: 500 }
    )
  }
}

function dbToProfile(dbRow: any): BusinessProfile {
  return {
    projectId: dbRow.project_id,
    userId: dbRow.user_id,
    businessType: dbRow.business_type,
    currency: dbRow.currency,
    monthlyVisitors: dbRow.monthly_visitors,
    monthlySessions: dbRow.monthly_sessions,
    conversionRate: dbRow.conversion_rate,
    averageOrderValue: dbRow.average_order_value,
    averageLeadValue: dbRow.average_lead_value,
    averageCustomerValue: dbRow.average_customer_value,
    trialToPaidRate: dbRow.trial_to_paid_rate,
    primaryConversionGoal: dbRow.primary_conversion_goal,
    importantPages: dbRow.important_pages || [],
  }
}

function validateProfile(body: any): BusinessProfile | null {
  if (!body || typeof body !== 'object') return null

  const validBusinessTypes = [
    'saas', 'ecommerce', 'agency', 'lead_generation',
    'marketplace', 'blog', 'portfolio', 'other',
  ]

  const validGoals = [
    'purchase', 'lead_submission', 'signup', 'demo_booking',
    'contact_request', 'newsletter', 'trial_start', 'custom',
  ]

  const businessType = validBusinessTypes.includes(body.businessType)
    ? body.businessType
    : 'other'

  const goal = validGoals.includes(body.primaryConversionGoal)
    ? body.primaryConversionGoal
    : 'custom'

  // Validate and clamp numeric fields
  const clampPositive = (v: any) => {
    const n = Number(v)
    if (isNaN(n) || n < 0) return null
    return n
  }

  const clampRate = (v: any) => {
    const n = Number(v)
    if (isNaN(n) || n < 0) return null
    if (n > 1) return n / 100 // Allow user to enter 5 instead of 0.05
    return n
  }

  return {
    projectId: body.projectId || 'default',
    userId: body.userId || undefined,
    businessType,
    currency: body.currency || 'USD',
    monthlyVisitors: clampPositive(body.monthlyVisitors),
    monthlySessions: clampPositive(body.monthlySessions),
    conversionRate: clampRate(body.conversionRate),
    averageOrderValue: clampPositive(body.averageOrderValue),
    averageLeadValue: clampPositive(body.averageLeadValue),
    averageCustomerValue: clampPositive(body.averageCustomerValue),
    trialToPaidRate: clampRate(body.trialToPaidRate),
    primaryConversionGoal: goal,
    importantPages: Array.isArray(body.importantPages)
      ? body.importantPages.map(validatePage).filter(Boolean)
      : [],
  }
}

function validatePage(p: any) {
  if (!p || !p.url) return null
  const validStages = ['awareness', 'consideration', 'conversion', 'checkout', 'retention']
  const validCriticalities = ['low', 'medium', 'high', 'critical']

  return {
    url: String(p.url),
    pageType: String(p.pageType || 'generic'),
    trafficShare: Math.max(0, Math.min(1, Number(p.trafficShare) || 0.05)),
    funnelStage: validStages.includes(p.funnelStage) ? p.funnelStage : 'awareness',
    businessCriticality: validCriticalities.includes(p.businessCriticality) ? p.businessCriticality : 'medium',
    conversionImportance: ['low', 'medium', 'high'].includes(p.conversionImportance)
      ? p.conversionImportance
      : 'medium',
  }
}
