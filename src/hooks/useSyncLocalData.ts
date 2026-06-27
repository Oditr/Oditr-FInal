'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { migrateLocalToCloud } from '@/lib/scan-store'

/**
 * useSyncLocalData — runs once on first login.
 * Migrates localStorage scan data to Supabase, then clears local.
 * Safe to call multiple times — uses a flag to avoid re-syncing.
 */
export function useSyncLocalData() {
  const { user } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!user || hasRun.current) return
    hasRun.current = true

    migrateLocalToCloud(user.id).then(({ migrated }) => {
      if (migrated > 0) {
        console.log(`[sync] Migrated ${migrated} scans from localStorage to Supabase.`)
      }
    }).catch(err => {
      console.error('[sync] Migration error:', err)
    })
  }, [user])
}
