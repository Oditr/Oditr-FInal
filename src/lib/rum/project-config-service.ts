// ── RUM Project Config Service ──
// Retrieves configurations for RUM ingestion and validates origins.

import { supabase } from '@/lib/supabase'
import type { RumProjectConfig } from './types'

// Cache configs in memory for high-volume edge ingestion.
// Realistically, for serverless, this cache is per-instance and short-lived.
const configCache = new Map<string, { config: RumProjectConfig, expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get the RUM configuration for a specific project.
 */
export async function getRumConfig(projectId: string): Promise<RumProjectConfig | null> {
  const now = Date.now()
  const cached = configCache.get(projectId)
  
  if (cached && cached.expiresAt > now) {
    return cached.config
  }

  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('rum_configs')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error || !data) {
      // If config doesn't exist, we might want to lazy-create it or just reject.
      // For now, if no config is explicitly created, we reject RUM data.
      return null
    }

    const config: RumProjectConfig = {
      projectId: data.project_id,
      enabled: data.enabled,
      allowedDomains: data.allowed_domains || [],
      sampleRate: data.sample_rate || 100,
      retentionDays: data.retention_days || 30
    }

    configCache.set(projectId, { config, expiresAt: now + CACHE_TTL })
    return config
  } catch (err) {
    console.error('[RUM Config] Failed to fetch:', err)
    return null
  }
}

/**
 * Check if the provided origin is allowed for this project.
 */
export function isOriginAllowed(origin: string | null, config: RumProjectConfig): boolean {
  if (!config.enabled) return false
  
  // If no allowed domains are set, default to allow-all for ease of setup.
  // In production, we'd enforce it or auto-populate it from the project URL.
  if (config.allowedDomains.length === 0) return true
  
  if (!origin) return false // some browsers hide origin for privacy, fallback to referrer check in ingestion

  try {
    const originHostname = new URL(origin).hostname
    return config.allowedDomains.some(domain => 
      originHostname === domain || originHostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Determine if this event should be sampled based on the configured rate.
 */
export function shouldSample(pageviewId: string, sampleRate: number): boolean {
  if (sampleRate >= 100) return true
  if (sampleRate <= 0) return false
  
  // Deterministic sampling based on pageviewId (so all events for a pageview are either kept or dropped)
  // Simple hash function for the string
  let hash = 0
  for (let i = 0; i < pageviewId.length; i++) {
    hash = Math.imul(31, hash) + pageviewId.charCodeAt(i) | 0
  }
  
  // Map hash to 0-99
  const bucket = Math.abs(hash) % 100
  return bucket < sampleRate
}
