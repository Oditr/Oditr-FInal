'use client'

import React from 'react'
import type { RumMetricSummary } from '@/lib/rum/types'
import { formatVitalValue } from '@/lib/monitoring/vitals-diff-service'

export function RumVitalsSummary({ summaries }: { summaries: RumMetricSummary[] }) {
  if (summaries.length === 0) {
    return null
  }

  // Filter to just Core Web Vitals to keep the top-level cards focused
  const coreMetrics = summaries.filter(s => ['LCP', 'CLS', 'INP'].includes(s.metric))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {coreMetrics.map(summary => (
        <MetricCard key={summary.metric} summary={summary} />
      ))}
    </div>
  )
}

function MetricCard({ summary }: { summary: RumMetricSummary }) {
  const { metric, p75, goodCount, needsImprovementCount, poorCount, totalSamples } = summary
  
  if (totalSamples === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">{metric} (p75)</h4>
        <p className="text-2xl font-bold text-gray-300">No Data</p>
      </div>
    )
  }

  // Determine color based on distribution
  const goodPct = (goodCount / totalSamples) * 100
  const niPct = (needsImprovementCount / totalSamples) * 100
  const poorPct = (poorCount / totalSamples) * 100

  // Standard rating uses the 75th percentile to determine Good vs Poor
  let ratingColor = 'text-green-600'
  if (poorPct > 25) ratingColor = 'text-red-600'
  else if ((niPct + poorPct) > 25) ratingColor = 'text-orange-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider" title="75th Percentile">
          {metric} (p75)
        </h4>
        <span className="text-xs text-gray-400 font-medium">{totalSamples} samples</span>
      </div>
      
      <div className={`text-3xl font-bold mb-4 ${ratingColor}`}>
        {formatVitalValue(p75, metric.toLowerCase())}
      </div>

      <div className="space-y-1.5">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
          {goodPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${goodPct}%` }}></div>}
          {niPct > 0 && <div className="bg-orange-400 h-full" style={{ width: `${niPct}%` }}></div>}
          {poorPct > 0 && <div className="bg-red-500 h-full" style={{ width: `${poorPct}%` }}></div>}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span className="text-green-600 font-medium">{Math.round(goodPct)}% Good</span>
          <span className="text-red-600 font-medium">{Math.round(poorPct)}% Poor</span>
        </div>
      </div>
    </div>
  )
}
