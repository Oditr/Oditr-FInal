'use client'

// ── PostHog Client Provider ──
// Wraps the app with PostHog context for client-side analytics and feature flags.
// Automatically identifies Supabase users and syncs plan properties.
// Gracefully degrades when PostHog is not configured.

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

// Track whether we've already initialized to prevent double-init
let _initialized = false

function PostHogInit() {
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current || _initialized || !posthogKey || typeof window === 'undefined') return
    didInit.current = true
    _initialized = true

    posthog.init(posthogKey, {
      api_host: posthogHost,
      // Capture page views manually via Next.js router events
      capture_pageview: false,
      // Capture page leaves for session analytics
      capture_pageleave: true,
      // Load feature flags on init
      advanced_disable_feature_flags: false,
      // Respect Do Not Track browser setting
      respect_dnt: true,
      // Disable session recording by default (can enable in PostHog dashboard)
      disable_session_recording: true,
      // Persist across sessions
      persistence: 'localStorage+cookie',
    })
  }, [])

  return null
}

/**
 * Syncs the current Supabase auth user with PostHog identity.
 * When a user signs in, we identify them in PostHog with their plan tier.
 * When they sign out, we reset PostHog to an anonymous state.
 */
function PostHogAuthSync() {
  const { user, plan } = useAuth()
  const ph = usePostHog()
  const lastIdentifiedId = useRef<string | null>(null)

  useEffect(() => {
    if (!ph || !posthogKey) return

    if (user && user.id !== lastIdentifiedId.current) {
      // Identify the user in PostHog with plan metadata
      ph.identify(user.id, {
        email: user.email,
        plan: plan,
      })
      lastIdentifiedId.current = user.id
    } else if (!user && lastIdentifiedId.current) {
      // User signed out — reset to anonymous
      ph.reset()
      lastIdentifiedId.current = null
    }
  }, [user, plan, ph])

  // Update plan property when it changes (e.g., after upgrade)
  useEffect(() => {
    if (!ph || !user || !posthogKey) return
    ph.people.set({ plan })
  }, [plan, ph, user])

  return null
}

/**
 * PostHog page view tracker for Next.js App Router.
 * Captures page views on URL changes since we disabled auto-capture.
 */
function PostHogPageView() {
  const ph = usePostHog()

  useEffect(() => {
    if (!ph || !posthogKey) return

    // Capture initial page view
    ph.capture('$pageview', {
      $current_url: window.location.href,
    })
  }, [ph])

  return null
}

export function PostHogClientProvider({ children }: { children: React.ReactNode }) {
  // If PostHog isn't configured, render children without the provider
  if (!posthogKey) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <PostHogAuthSync />
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}

// Re-export the hook for convenience
export { usePostHog }
