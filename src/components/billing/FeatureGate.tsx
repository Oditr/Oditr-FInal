'use client'

import React, { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { UpgradeModal } from './UpgradeModal'

interface FeatureGateProps {
  featureKey: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showTeaser?: boolean
}

export function FeatureGate({ featureKey, children, fallback, showTeaser = true }: FeatureGateProps) {
  const [access, setAccess] = useState<{ allowed: boolean, reason?: string, currentPlan?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    // In a real app, you might use SWR or React Query and fetch from a `/api/access/check` endpoint.
    // We'll simulate fetching the user's plan and feature keys.
    // For now, let's fetch current plan to make a simple local check, 
    // or call a dedicated `/api/access/check?feature=X` endpoint.
    
    const checkAccess = async () => {
      try {
        const res = await fetch(`/api/access/check?feature=${featureKey}`)
        if (res.ok) {
          const data = await res.json()
          setAccess(data)
        } else {
          setAccess({ allowed: false, reason: 'error' })
        }
      } catch (err) {
        setAccess({ allowed: false, reason: 'error' })
      } finally {
        setLoading(false)
      }
    }
    checkAccess()
  }, [featureKey])

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-32 w-full"></div>
  }

  if (access?.allowed) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showTeaser) {
    return null
  }

  return (
    <>
      <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
        <div className="absolute inset-0 bg-gray-50 opacity-90 backdrop-blur-[2px] z-10 transition-opacity"></div>
        <div className="relative z-20 flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature Locked</h3>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            This feature is not available on your current {access?.currentPlan || 'Free'} plan. Upgrade to unlock this capability and scale your workflow.
          </p>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} featureKey={featureKey} currentPlan={access?.currentPlan} />
      )}
    </>
  )
}
