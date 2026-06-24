'use client'

import React from 'react'
import Link from 'next/link'
import type { MonitoredProject } from '@/lib/monitoring/types'
import { MonitoringStatusBadge } from './MonitoringStatusBadge'

export function ProjectCard({ project }: { project: MonitoredProject }) {
  const scoreColor = project.lastOverallScore === null 
    ? 'text-gray-400' 
    : project.lastOverallScore >= 90 ? 'text-green-600'
    : project.lastOverallScore >= 50 ? 'text-orange-500'
    : 'text-red-600'

  return (
    <Link 
      href={`/monitoring/${project.id}`}
      className="block p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-gray-500 truncate max-w-[200px]" title={project.url}>
            {project.normalizedDomain}
          </p>
        </div>
        <MonitoringStatusBadge 
          status={project.status} 
          frequency={project.monitoringFrequency} 
          enabled={project.monitoringEnabled} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Health Score</p>
          <div className="flex items-baseline">
            <span className={`text-3xl font-bold ${scoreColor}`}>
              {project.lastOverallScore ?? '--'}
            </span>
            {project.lastOverallScore !== null && (
              <span className="text-sm text-gray-500 ml-1">/100</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Next Scan</p>
          <p className="text-sm text-gray-900 font-medium">
            {project.monitoringEnabled && project.nextScanAt 
              ? new Date(project.nextScanAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Manual only'}
          </p>
          {project.lastScanAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last: {new Date(project.lastScanAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
