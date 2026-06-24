'use client'

import React from 'react'
import type { ScoreTrendPoint } from '@/lib/monitoring/types'

export function ScoreTrendChart({ trend, direction }: { trend: ScoreTrendPoint[], direction: 'improving' | 'declining' | 'stable' }) {
  if (trend.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">Not enough data to display trends.</p>
      </div>
    )
  }

  // Simple SVG line chart
  const height = 160
  const width = 600
  const padding = 20

  const minScore = Math.max(0, Math.min(...trend.map(p => p.overallScore)) - 10)
  const maxScore = 100

  const getX = (index: number) => padding + (index * (width - 2 * padding)) / Math.max(1, trend.length - 1)
  const getY = (score: number) => height - padding - ((score - minScore) / (maxScore - minScore)) * (height - 2 * padding)

  const points = trend.map((p, i) => `${getX(i)},${getY(p.overallScore)}`).join(' ')
  
  const lineColor = direction === 'improving' ? '#10b981' : direction === 'declining' ? '#ef4444' : '#3b82f6'

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Health Score Trend</h3>
        <div className="text-sm font-medium flex items-center gap-1.5">
          {direction === 'improving' && <span className="text-green-600 flex items-center">↗ Improving</span>}
          {direction === 'declining' && <span className="text-red-600 flex items-center">↘ Declining</span>}
          {direction === 'stable' && <span className="text-blue-600 flex items-center">→ Stable</span>}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 min-w-[400px]">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f3f4f6" strokeWidth="1" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="#f3f4f6" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f3f4f6" strokeWidth="1" />
          
          {/* Y-axis labels */}
          <text x={0} y={padding + 4} fontSize="10" fill="#9ca3af">{maxScore}</text>
          <text x={0} y={height/2 + 4} fontSize="10" fill="#9ca3af">{Math.round((maxScore + minScore)/2)}</text>
          <text x={0} y={height - padding + 4} fontSize="10" fill="#9ca3af">{minScore}</text>

          {/* Line */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Points */}
          {trend.map((p, i) => (
            <g key={p.reportId}>
              <circle
                cx={getX(i)}
                cy={getY(p.overallScore)}
                r="4"
                fill="#fff"
                stroke={lineColor}
                strokeWidth="2"
              />
              <text 
                x={getX(i)} 
                y={height - 2} 
                fontSize="10" 
                fill="#6b7280" 
                textAnchor="middle"
              >
                {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
