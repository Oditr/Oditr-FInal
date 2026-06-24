import { createClient } from '@supabase/supabase-js'
import type { AgencyBranding } from './types'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAgencyBranding(userId: string): Promise<AgencyBranding | null> {
  const db = getDb()
  const { data: row, error } = await db
    .from('agency_branding')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !row) return null

  return {
    id: row.id,
    userId: row.user_id,
    agencyName: row.agency_name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    contactEmail: row.contact_email,
    websiteUrl: row.website_url,
    footerText: row.footer_text,
    hideOditrBranding: row.hide_oditr_branding,
    customIntroText: row.custom_intro_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function upsertAgencyBranding(userId: string, data: Partial<AgencyBranding>): Promise<AgencyBranding> {
  const db = getDb()
  const id = data.id || `brand_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  const payload: any = {
    user_id: userId,
    updated_at: new Date().toISOString()
  }

  if (data.agencyName !== undefined) payload.agency_name = data.agencyName
  if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl
  if (data.primaryColor !== undefined) payload.primary_color = data.primaryColor
  if (data.secondaryColor !== undefined) payload.secondary_color = data.secondaryColor
  if (data.contactEmail !== undefined) payload.contact_email = data.contactEmail
  if (data.websiteUrl !== undefined) payload.website_url = data.websiteUrl
  if (data.footerText !== undefined) payload.footer_text = data.footerText
  if (data.hideOditrBranding !== undefined) payload.hide_oditr_branding = data.hideOditrBranding
  if (data.customIntroText !== undefined) payload.custom_intro_text = data.customIntroText

  // Ensure required fields if inserting
  if (!data.id && !payload.agency_name) payload.agency_name = 'My Agency'

  const { data: brand, error } = await db
    .from('agency_branding')
    .upsert({ id, ...payload }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert branding: ${error.message}`)

  return {
    id: brand.id,
    userId: brand.user_id,
    agencyName: brand.agency_name,
    logoUrl: brand.logo_url,
    primaryColor: brand.primary_color,
    secondaryColor: brand.secondary_color,
    contactEmail: brand.contact_email,
    websiteUrl: brand.website_url,
    footerText: brand.footer_text,
    hideOditrBranding: brand.hide_oditr_branding,
    customIntroText: brand.custom_intro_text,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at
  }
}
