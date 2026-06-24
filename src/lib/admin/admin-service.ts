// ── Admin Operations Service (Engine 13) ──
// High-level operations for internal operators.
// All functions use the service_role key to bypass RLS.
// WARNING: NEVER expose these directly to clients without strict auth checks.

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── Check if a user is an admin ──
// In a real app, this might check a 'site_admins' table or check 'is_superadmin' on auth.users metadata.
// For now, we'll check if the user's email ends with a specific domain, or if a specific feature flag is on.
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceClient()
  if (!supabase) return false

  const { data: user } = await supabase.auth.admin.getUserById(userId)
  
  // Example: require @vitalfix.com or @oditr.com
  const email = user?.user?.email || ''
  if (email.endsWith('@vitalfix.com') || email.endsWith('@oditr.com')) {
    return true
  }

  // Fallback: check if they have a specific metadata flag
  if (user?.user?.app_metadata?.is_superadmin === true) {
    return true
  }

  return false
}

export interface AdminOverview {
  totalUsers: number
  totalWorkspaces: number
  totalProjects: number
  totalReports: number
  proSubscriptions: number
  unhandledFeedback: number
}

// ── Get High-Level Overview ──
export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = getServiceClient()
  if (!supabase) throw new Error('DB config missing')

  const overview: AdminOverview = {
    totalUsers: 0,
    totalWorkspaces: 0,
    totalProjects: 0,
    totalReports: 0,
    proSubscriptions: 0,
    unhandledFeedback: 0,
  }

  try {
    const [users, workspaces, projects, reports, subs, feedback] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('workspaces').select('id', { count: 'exact', head: true }),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).in('plan', ['pro', 'enterprise']),
      supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ])

    overview.totalUsers = users.count || 0
    overview.totalWorkspaces = workspaces.count || 0
    overview.totalProjects = projects.count || 0
    overview.totalReports = reports.count || 0
    overview.proSubscriptions = subs.count || 0
    overview.unhandledFeedback = feedback.count || 0
  } catch (err) {
    console.error('[admin-service] Failed to fetch overview:', err)
  }

  return overview
}
