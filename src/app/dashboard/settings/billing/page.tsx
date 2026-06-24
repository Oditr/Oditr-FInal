'use client'

import React, { useEffect, useState } from 'react'
import { CreditCard, CheckCircle2, Zap, Calendar, ExternalLink } from 'lucide-react'
import { UpgradeModal } from '@/components/billing/UpgradeModal'

interface UsageStats {
  audits: { used: number, limit: number }
  rum: { used: number, limit: number }
  projects: { used: number, limit: number }
}

interface BillingInfo {
  planId: string
  planName: string
  subscriptionStatus: string
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  usage: UsageStats
}

export default function BillingSettingsPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await fetch('/api/billing/current')
        if (res.ok) {
          const data = await res.json()
          setInfo(data)
        }
      } catch (err) {
        console.error('Failed to fetch billing info', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBilling()
  }, [])

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        }
      } else {
        alert('Could not launch billing portal')
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
      </div>
    )
  }

  if (!info) return <div className="p-8 text-red-500">Failed to load billing information.</div>

  const renderMeter = (label: string, used: number, limit: number) => {
    const percent = limit === -1 ? 0 : Math.min(100, (used / limit) * 100)
    const isWarning = limit !== -1 && percent > 80
    const isDanger = limit !== -1 && percent >= 100

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-500">
            {used} / {limit === -1 ? 'Unlimited' : limit}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full ${isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : 'bg-blue-600'}`} 
            style={{ width: `${limit === -1 ? 100 : percent}%` }}
          ></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-500 mt-1">Manage your subscription, view your plan limits, and upgrade to scale your workflow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <CreditCard className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Current Plan: {info.planName}</h2>
                {info.subscriptionStatus === 'active' && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">Active</span>
                )}
                {info.subscriptionStatus === 'trialing' && (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">Trial</span>
                )}
                {info.cancelAtPeriodEnd && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">Canceling</span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" /> 
                {info.periodEnd 
                  ? `Billing cycle resets on ${new Date(info.periodEnd).toLocaleDateString()}` 
                  : 'Free plan does not expire.'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            {info.planId !== 'free' && (
              <button 
                onClick={handleManageBilling}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex justify-center items-center gap-2"
              >
                Manage Billing <ExternalLink className="w-4 h-4" />
              </button>
            )}
            {info.planId !== 'enterprise' && (
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Quick Upsell Card */}
        {info.planId === 'free' && (
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white flex flex-col justify-between">
            <div>
              <h3 className="font-bold mb-2">Scale with Øditr</h3>
              <p className="text-sm text-indigo-100 mb-4 opacity-90">Unlock daily monitoring, Real User Monitoring, and White-Label reports.</p>
            </div>
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-2 bg-white text-indigo-600 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Plans
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Current Usage Cycle</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderMeter('Website Audits', info.usage.audits.used, info.usage.audits.limit)}
          {renderMeter('RUM Events', info.usage.rum.used, info.usage.rum.limit)}
          {renderMeter('Monitored Projects', info.usage.projects.used, info.usage.projects.limit)}
        </div>
      </div>

      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} currentPlan={info.planId} />}
    </div>
  )
}
