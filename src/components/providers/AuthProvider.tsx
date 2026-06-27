'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getProfile, checkQuota, type PlanTier, type QuotaResult } from '@/lib/plans'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  plan: PlanTier
  quotaRemaining: number  // -1 = unlimited
  quotaLimit: number      // -1 = unlimited
  quotaUsed: number
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  plan: 'free',
  quotaRemaining: 5,
  quotaLimit: 5,
  quotaUsed: 0,
  signIn: async () => ({ error: 'Not configured' }),
  signUp: async () => ({ error: 'Not configured' }),
  signOut: async () => {},
  refreshProfile: async () => {},
  isConfigured: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<PlanTier>('free')
  const [quota, setQuota] = useState<QuotaResult>({ allowed: true, used: 0, limit: 5, remaining: 5, plan: 'free' })
  const configured = isSupabaseConfigured()

  // Keep a ref to the current user ID so the stable callback can read it
  const userIdRef = useRef<string | undefined>(undefined)
  useEffect(() => { userIdRef.current = user?.id }, [user?.id])

  // Internal fetcher — takes an explicit userId, has zero reactive deps, safe in effects
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    try {
      const [profile, quotaResult] = await Promise.all([
        getProfile(userId),
        checkQuota(userId),
      ])
      if (profile) setPlan(profile.plan)
      if (quotaResult) setQuota(quotaResult)
    } catch {
      // Profile table may not exist yet — gracefully degrade
    }
  }, [])

  // Public refreshProfile — reads current user from the ref so it stays stable
  const refreshProfile = useCallback(async () => {
    const uid = userIdRef.current
    if (uid) await fetchProfile(uid)
  }, [fetchProfile])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) fetchProfile(session.user.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else { setPlan('free'); setQuota({ allowed: true, used: 0, limit: 5, remaining: 5, plan: 'free' }) }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{
      user, session, loading, plan,
      quotaRemaining: quota.remaining, quotaLimit: quota.limit, quotaUsed: quota.used,
      signIn, signUp, signOut, refreshProfile, isConfigured: configured,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
