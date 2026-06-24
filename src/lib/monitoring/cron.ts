import { fetchPSI } from '@/lib/psi-pool'
import { saveScan } from '@/lib/scan-store'

/**
 * Executes scheduled audits for active continuous monitoring tasks.
 * Intended to be called from an API route (e.g., /api/cron) triggered by Vercel Cron.
 */
export async function runMonitoringCron() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured')
  }

  // Need a service role key to bypass RLS for background jobs
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

  console.log('[Monitoring] Starting scheduled monitoring sweep...')

  // In a real implementation, you would have a `monitored_urls` table.
  // For this simulation, we'll fetch all unique URLs from the last 24h that belong to users.
  // We'll limit it to 10 for safety.
  const { data: recentScans, error } = await supabase
    .from('scans')
    .select('url, user_id, team_id, project_id')
    .order('fetched_at', { ascending: false })
    .limit(10)

  if (error || !recentScans) {
    console.error('[Monitoring] Failed to fetch URLs to monitor:', error)
    return { success: false, error }
  }

  // Deduplicate by URL
  const uniqueUrls = new Map<string, typeof recentScans[0]>()
  for (const scan of recentScans) {
    if (!uniqueUrls.has(scan.url)) {
      uniqueUrls.set(scan.url, scan)
    }
  }

  let successCount = 0
  let failureCount = 0

  for (const [url, context] of Array.from(uniqueUrls.entries())) {
    try {
      console.log(`[Monitoring] Auditing ${url}...`)
      // Minimal fetch, in reality we'd want to use full Intelligence Engine
      const res = await fetchPSI({
        url,
        strategy: 'mobile',
        categories: ['performance'],
        timeout: 30000
      })
      if (!res.ok) throw new Error(`PSI Fetch failed: ${res.status}`)
      const data = await res.json()
      const auditData = data.lighthouseResult
      
      const healthScore = Math.round((auditData.categories.performance?.score || 0) * 100)
      
      // Save it using service role
      await supabase.from('scans').insert({
        url,
        user_id: context.user_id,
        team_id: context.team_id,
        project_id: context.project_id,
        strategy: 'mobile',
        fetched_at: new Date().toISOString(),
        health_score: healthScore,
        scores: {
          performance: healthScore,
          accessibility: Math.round((auditData.categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((auditData.categories['best-practices']?.score || 0) * 100),
          seo: Math.round((auditData.categories.seo?.score || 0) * 100),
        },
      })
      
      successCount++
    } catch (e) {
      console.error(`[Monitoring] Failed to audit ${url}:`, e)
      failureCount++
    }
  }

  console.log(`[Monitoring] Sweep complete. ${successCount} successful, ${failureCount} failed.`)
  return { success: true, audited: successCount, failed: failureCount }
}
