'use client'

import React from 'react'
import type { RumPageSummary } from '@/lib/rum/types'
import { formatVitalValue } from '@/lib/monitoring/vitals-diff-service'
import { THRESHOLDS } from '@/lib/rum/types'

export function RumPageTable({ pages }: { pages: RumPageSummary[] }) {
  if (pages.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
        No page-level performance data available yet.
      </div>
    )
  }

  const getMetricColor = (val: number | null, threshold: { good: number, poor: number }) => {
    if (val === null) return 'text-gray-400'
    if (val <= threshold.good) return 'text-green-600'
    if (val > threshold.poor) return 'text-red-600 font-medium'
    return 'text-orange-500'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Slowest Pages (Field Data)</h3>
        <p className="text-sm text-gray-500">Ranked by 75th percentile LCP. Use this to prioritize technical SEO fixes.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Path</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Samples</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LCP (p75)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CLS (p75)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">INP (p75)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={page.path} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono truncate max-w-[250px]">
                  {page.path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {page.samples.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getMetricColor(page.lcpP75, THRESHOLDS.LCP)}`}>
                  {formatVitalValue(page.lcpP75, 'lcp')}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getMetricColor(page.clsP75, THRESHOLDS.CLS)}`}>
                  {formatVitalValue(page.clsP75, 'cls')}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getMetricColor(page.inpP75, THRESHOLDS.INP)}`}>
                  {formatVitalValue(page.inpP75, 'inp')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
