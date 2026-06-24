'use client'

import React from 'react'
import type { VitalDelta } from '@/lib/monitoring/types'
import { formatVitalValue } from '@/lib/monitoring/vitals-diff-service'

export function VitalsTrendPanel({ vitalsDeltas }: { vitalsDeltas: VitalDelta[] }) {
  if (!vitalsDeltas || vitalsDeltas.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Core Web Vitals Changes</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {vitalsDeltas.map((v) => {
          const isWorsened = v.status === 'worsened' || v.status === 'critical'
          const isImproved = v.status === 'improved'
          const isUnchanged = v.status === 'unchanged'

          return (
            <div key={v.metric} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{v.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatVitalValue(v.previousValue, v.metric)} → {formatVitalValue(v.currentValue, v.metric)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isWorsened && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${v.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                    ↑ Worsened {v.delta !== null && `(+${formatVitalValue(v.delta, v.metric)})`}
                  </span>
                )}
                {isImproved && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    ↓ Improved {v.delta !== null && `(${formatVitalValue(v.delta, v.metric)})`}
                  </span>
                )}
                {isUnchanged && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Unchanged
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
