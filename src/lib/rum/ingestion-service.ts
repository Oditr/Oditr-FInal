// ── RUM Ingestion Service ──
// Processes and persists RUM events from the public tracking script.

import { supabase } from '@/lib/supabase'
import type { RumEventPayload, RumEventRow } from './types'
import { getRumConfig, isOriginAllowed, shouldSample } from './project-config-service'
import { rateMetricValue } from './types'

export interface IngestionResult {
  success: boolean
  error?: string
  status: number
}

function extractPathAndHostname(fullUrl: string): { path: string; hostname: string } {
  try {
    const u = new URL(fullUrl)
    return {
      path: u.pathname,
      hostname: u.hostname
    }
  } catch {
    return { path: '/', hostname: 'unknown' }
  }
}

/**
 * Ingests a single RUM event.
 * In a real high-volume production system, this would push to a Queue/Kafka/Redis.
 * For MVP, we insert directly into Supabase Postgres.
 */
export async function ingestEvent(
  payload: any,
  origin: string | null
): Promise<IngestionResult> {
  // 1. Basic validation
  if (!payload || !payload.projectId || !payload.metricName || payload.metricValue === undefined) {
    return { success: false, error: 'Invalid payload', status: 400 }
  }

  // 2. Fetch config & validate domain
  const config = await getRumConfig(payload.projectId)
  if (!config) {
    // We drop events for unknown projects silently or return 404
    return { success: false, error: 'Project not configured for RUM', status: 404 }
  }

  if (!isOriginAllowed(origin, config)) {
    return { success: false, error: 'Origin not allowed', status: 403 }
  }

  // 3. Apply Sampling
  if (!shouldSample(payload.pageviewId || 'unknown', config.sampleRate)) {
    return { success: true, status: 202 } // Accepted but dropped
  }

  // 4. Sanitize and Map Payload
  const { path, hostname } = extractPathAndHostname(payload.url || '')
  
  // Enforce reasonable metric bounds to prevent DB overflow/spam
  const value = Number(payload.metricValue)
  if (isNaN(value) || value < 0 || value > 300000) { // cap at 5 mins
    return { success: false, error: 'Invalid metric value', status: 400 }
  }

  const rating = rateMetricValue(payload.metricName, value)

  const row: RumEventRow = {
    project_id: payload.projectId,
    pageview_id: String(payload.pageviewId).slice(0, 50),
    session_id: String(payload.sessionId).slice(0, 50),
    url: String(payload.url).slice(0, 2048),
    path: path.slice(0, 1024),
    hostname: hostname.slice(0, 255),
    metric_name: String(payload.metricName).slice(0, 20),
    metric_value: value,
    metric_rating: rating,
    device_type: payload.deviceType ? String(payload.deviceType).slice(0, 50) : null,
    browser: payload.browser ? String(payload.browser).slice(0, 50) : null,
    os: payload.os ? String(payload.os).slice(0, 50) : null,
    viewport_width: typeof payload.viewportWidth === 'number' ? payload.viewportWidth : null,
    viewport_height: typeof payload.viewportHeight === 'number' ? payload.viewportHeight : null,
    connection_type: payload.connectionType ? String(payload.connectionType).slice(0, 20) : null,
    navigation_type: payload.navigationType ? String(payload.navigationType).slice(0, 50) : null,
    timestamp: new Date().toISOString(),
  }

  // 5. Insert
  if (!supabase) {
    return { success: false, error: 'Database unavailable', status: 503 }
  }

  // Use the service role key or let postgres RLS allow inserts
  // Actually, standard clients with RLS will block inserts if not authenticated.
  // We need to bypass RLS for ingestion. The service role key should be used here.
  // For MVP, we will assume `supabase` is an admin client in this context, or we rely on the route.
  
  try {
    const { error } = await supabase.from('rum_events').insert(row)
    if (error) {
      console.error('[RUM Ingestion] Insert failed:', error)
      return { success: false, error: 'Internal Server Error', status: 500 }
    }
  } catch (err) {
    console.error('[RUM Ingestion] Exception:', err)
    return { success: false, error: 'Internal Server Error', status: 500 }
  }

  return { success: true, status: 202 }
}
