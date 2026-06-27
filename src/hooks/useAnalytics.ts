'use client'

// ── Client-Side Analytics Hook ──
// Lightweight event tracking — batches events and flushes every 5s.
// Fire-and-forget. Never blocks UI. Uses sendBeacon on unload.

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'

interface ClientEvent {
  event_type: string
  user_id?: string | null
  metadata?: Record<string, any>
}

const FLUSH_INTERVAL = 5000  // 5 seconds
const MAX_BATCH = 15

// Session ID — persists for the browser tab lifetime
const sessionId = typeof window !== 'undefined'
  ? (sessionStorage.getItem('vf_sid') || (() => {
      const sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('vf_sid', sid)
      return sid
    })())
  : 'ssr'

export function useAnalytics() {
  const { user } = useAuth()
  const queue = useRef<ClientEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const flush = useCallback(() => {
    if (queue.current.length === 0) return

    const events = queue.current.splice(0, MAX_BATCH)
    const payload = JSON.stringify({ events })

    // Use sendBeacon if available (works during page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', payload)
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  }, [])

  // Start flush timer
  useEffect(() => {
    timerRef.current = setInterval(flush, FLUSH_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      flush() // Flush remaining on unmount
    }
  }, [flush])

  // Flush on page unload
  useEffect(() => {
    const handleUnload = () => flush()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [flush])

  const track = useCallback((type: string, metadata?: Record<string, any>) => {
    queue.current.push({
      event_type: type,
      user_id: user?.id || null,
      metadata: { ...metadata, session_id: sessionId },
    })
  }, [user?.id])

  const trackPageView = useCallback((page: string) => {
    track('page_view', { page, referrer: document.referrer || null })
  }, [track])

  const trackClick = useCallback((buttonId: string) => {
    track('button_click', { button_id: buttonId })
  }, [track])

  const trackFeature = useCallback((feature: string) => {
    track('feature_use', { feature })
  }, [track])

  return { track, trackPageView, trackClick, trackFeature, sessionId }
}
