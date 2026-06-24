'use client'

import React, { useState } from 'react'
import { X, CheckCircle2, Loader2 } from 'lucide-react'

interface UpgradeModalProps {
  onClose: () => void
  featureKey?: string
  currentPlan?: string
}

export function UpgradeModal({ onClose, featureKey, currentPlan }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly')

  const handleUpgrade = async (planId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: cycle })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to start checkout process')
      }
    } catch (err) {
      alert('Error connecting to billing provider')
    } finally {
      setLoading(false)
    }
  }

  // Simplified recommendations based on feature
  let recommendedPlan = 'pro'
  if (featureKey === 'agency.white_label') recommendedPlan = 'agency'
  if (currentPlan === 'free') recommendedPlan = 'starter'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Upgrade Your Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 bg-gray-50 flex justify-center border-b border-gray-100">
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${cycle === 'monthly' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${cycle === 'yearly' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly billing <span className="ml-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Starter Plan */}
          <div className={`relative border rounded-xl p-6 ${recommendedPlan === 'starter' ? 'border-blue-500 shadow-md bg-blue-50/10' : 'border-gray-200'}`}>
            {recommendedPlan === 'starter' && <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">Recommended</div>}
            <h3 className="text-lg font-bold text-gray-900 mb-2">Starter</h3>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">
              ${cycle === 'yearly' ? '89' : '9'}<span className="text-sm font-medium text-gray-500">/{cycle === 'yearly' ? 'yr' : 'mo'}</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Great for indie developers and freelancers.</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-blue-500 mr-2 shrink-0" /><span className="text-sm text-gray-700">50 audits / month</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-blue-500 mr-2 shrink-0" /><span className="text-sm text-gray-700">3 Monitored Projects</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-blue-500 mr-2 shrink-0" /><span className="text-sm text-gray-700">PDF Report Export</span></li>
            </ul>
            <button
              onClick={() => handleUpgrade('starter')}
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center ${recommendedPlan === 'starter' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Choose Starter'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className={`relative border rounded-xl p-6 ${recommendedPlan === 'pro' ? 'border-blue-500 shadow-md bg-blue-50/10' : 'border-gray-200'}`}>
            {recommendedPlan === 'pro' && <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">Recommended</div>}
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pro</h3>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">
              ${cycle === 'yearly' ? '499' : '49'}<span className="text-sm font-medium text-gray-500">/{cycle === 'yearly' ? 'yr' : 'mo'}</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">For startups and small teams.</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-indigo-500 mr-2 shrink-0" /><span className="text-sm text-gray-700">300 audits / month</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-indigo-500 mr-2 shrink-0" /><span className="text-sm text-gray-700">10 Monitored Projects</span></li>
              <li className="flex items-start"><CheckCircle2 className="w-5 h-5 text-indigo-500 mr-2 shrink-0" /><span className="text-sm text-gray-700">Real User Monitoring</span></li>
            </ul>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center ${recommendedPlan === 'pro' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Choose Pro'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
