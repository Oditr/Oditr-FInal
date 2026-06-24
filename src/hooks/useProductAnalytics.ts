'use client'

// ── useProductAnalytics ──
// Drop-in replacement for the old useAnalytics hook.
// Sends structured product events to /api/analytics/track.
// Fire-and-forget. Never blocks the UI.

import { useCallback, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { ProductEvents, type ProductEventName } from '@/lib/analytics/events'

export type { ProductEventName }
export { ProductEvents }

// Session ID — persists for the tab lifetime
const sessionId =
  typeof window !== 'undefined'
    ? sessionStorage.getItem('oditr_sid') ||
      (() => {
        const sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        sessionStorage.setItem('oditr_sid', sid)
        return sid
      })()
    : 'ssr'

interface TrackOptions {
  workspaceId?: string
  projectId?: string
  properties?: Record<string, string | number | boolean | null>
}

export function useProductAnalytics() {
  const { user } = useAuth()
  const pendingRef = useRef<any[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (pendingRef.current.length === 0) return
    const events = pendingRef.current.splice(0)
    const payload = JSON.stringify({ events })

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', payload)
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  }, [])

  const track = useCallback(
    (eventName: ProductEventName | string, opts: TrackOptions = {}) => {
      pendingRef.current.push({
        eventName,
        userId:      user?.id || null,
        workspaceId: opts.workspaceId || null,
        projectId:   opts.projectId  || null,
        sessionId,
        properties:  opts.properties || {},
      })

      // Debounce flush: send after 2s idle or when batch hits 10
      if (pendingRef.current.length >= 10) {
        if (flushTimer.current) clearTimeout(flushTimer.current)
        flush()
      } else {
        if (flushTimer.current) clearTimeout(flushTimer.current)
        flushTimer.current = setTimeout(flush, 2000)
      }
    },
    [user?.id, flush]
  )

  // Convenience wrappers
  const trackAuditStarted    = useCallback((p?: TrackOptions) => track(ProductEvents.AUDIT_STARTED,    p), [track])
  const trackAuditCompleted  = useCallback((p?: TrackOptions) => track(ProductEvents.AUDIT_COMPLETED,  p), [track])
  const trackReportViewed    = useCallback((p?: TrackOptions) => track(ProductEvents.AUDIT_REPORT_VIEWED, p), [track])
  const trackUpgradeClicked  = useCallback((p?: TrackOptions) => track(ProductEvents.BILLING_UPGRADE_CLICKED, p), [track])
  const trackLimitReached    = useCallback((feature: string, p?: Omit<TrackOptions, 'properties'>) =>
    track(ProductEvents.BILLING_LIMIT_REACHED, { ...p, properties: { feature } }), [track])
  const trackFeatureLocked   = useCallback((feature: string, p?: Omit<TrackOptions, 'properties'>) =>
    track(ProductEvents.BILLING_FEATURE_LOCKED, { ...p, properties: { feature } }), [track])

  return {
    track,
    sessionId,
    trackAuditStarted,
    trackAuditCompleted,
    trackReportViewed,
    trackUpgradeClicked,
    trackLimitReached,
    trackFeatureLocked,
  }
}
