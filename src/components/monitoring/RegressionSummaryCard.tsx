'use client'

import React from 'react'
import type { RegressionReport } from '@/lib/monitoring/types'
import { severityLabel, severityColor } from '@/lib/monitoring/alert-service'

export function RegressionSummaryCard({ regression }: { regression: RegressionReport | null }) {
  if (!regression) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-sm font-medium text-gray-900">First Scan Complete</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          We need at least two scans to detect regressions. Your next scheduled scan will establish a trend.
        </p>
      </div>
    )
  }

  const color = severityColor(regression.severity)
  const isWorse = regression.overallScoreDelta < 0
  const isBetter = regression.overallScoreDelta > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          ></span>
          {severityLabel(regression.severity)}
        </h3>
        <span className="text-xs text-gray-500">
          Compared to {new Date(regression.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-gray-700 font-medium mb-1">{regression.summary}</p>
            {regression.revenueRiskDelta !== null && regression.revenueRiskDelta > 0 && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                Estimated revenue risk increased by ${(regression.revenueRiskDelta / 100).toLocaleString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Score Delta</div>
            <div className={`text-2xl font-bold flex items-center justify-end gap-1
              ${isWorse ? 'text-red-600' : isBetter ? 'text-green-600' : 'text-gray-500'}`}
            >
              {isWorse && '↓'}
              {isBetter && '↑'}
              {isWorse || isBetter ? Math.abs(regression.overallScoreDelta) : '-'}
            </div>
          </div>
        </div>

        {regression.recommendedActions.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-blue-800 uppercase mb-2">Recommended Actions</h4>
            <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
              {regression.recommendedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
