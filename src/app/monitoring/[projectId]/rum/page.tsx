'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeftIcon, RefreshCwIcon } from 'lucide-react'
import { RumSetupGuide } from '@/components/rum/RumSetupGuide'
import { RumVitalsSummary } from '@/components/rum/RumVitalsSummary'
import { RumPageTable } from '@/components/rum/RumPageTable'
import type { RumMetricSummary, RumPageSummary } from '@/lib/rum/types'

export default function ProjectRumDashboard() {
  const params = useParams()
  const projectId = params.projectId as string

  const [summaries, setSummaries] = useState<RumMetricSummary[]>([])
  const [worstPages, setWorstPages] = useState<RumPageSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setIsRefreshing(true)
      const [sumRes, pagesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/rum/summary`),
        fetch(`/api/projects/${projectId}/rum/pages`)
      ])
      
      if (sumRes.ok) setSummaries(await sumRes.json())
      if (pagesRes.ok) setWorstPages(await pagesRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const totalSamples = summaries.length > 0 ? summaries[0].totalSamples : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/monitoring/${projectId}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to Overview
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Real User Monitoring</h1>
            <p className="mt-1 text-sm text-gray-500">
              Measure actual Core Web Vitals from real visitors to inform the Revenue Impact Engine.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="text-sm text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center shadow-sm"
          >
            <RefreshCwIcon className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse">Loading RUM data...</div>
      ) : (
        <div className="space-y-8">
          {totalSamples === 0 ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-blue-900 mb-8">
              <h3 className="font-semibold text-lg mb-2">Waiting for data</h3>
              <p className="text-blue-800 opacity-90 max-w-2xl mb-4">
                We haven&apos;t received any RUM events for this project in the last 7 days. Install the snippet below and visit your website to trigger the first events.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">7-Day Field Data Summary</h2>
                <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Receiving Data
                </div>
              </div>
              
              <RumVitalsSummary summaries={summaries} />
              
              <RumPageTable pages={worstPages} />
            </>
          )}

          <div className="pt-8 border-t border-gray-200">
            <RumSetupGuide projectId={projectId} />
          </div>
        </div>
      )}
    </div>
  )
}
