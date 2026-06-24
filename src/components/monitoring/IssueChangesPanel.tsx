'use client'

import React from 'react'
import type { RegressionReport, IssueSnapshot, IssueDiff } from '@/lib/monitoring/types'

export function IssueChangesPanel({ regression }: { regression: RegressionReport | null }) {
  if (!regression) return null

  const hasChanges = 
    regression.newIssues.length > 0 || 
    regression.worsenedIssues.length > 0 || 
    regression.resolvedIssues.length > 0 || 
    regression.improvedIssues.length > 0

  if (!hasChanges) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500">
        No significant issue changes detected since the last scan.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Issue Changes</h3>
      </div>
      
      <div className="p-0">
        {regression.newIssues.length > 0 && (
          <div className="border-b border-gray-100 last:border-0">
            <div className="px-5 py-2 bg-red-50 text-red-800 text-xs font-semibold uppercase tracking-wider">
              {regression.newIssues.length} New Issues
            </div>
            <ul className="divide-y divide-gray-100">
              {regression.newIssues.map((issue, i) => (
                <IssueRow key={i} issue={issue} status="new" />
              ))}
            </ul>
          </div>
        )}

        {regression.worsenedIssues.length > 0 && (
          <div className="border-b border-gray-100 last:border-0">
            <div className="px-5 py-2 bg-orange-50 text-orange-800 text-xs font-semibold uppercase tracking-wider">
              {regression.worsenedIssues.length} Worsened Issues
            </div>
            <ul className="divide-y divide-gray-100">
              {regression.worsenedIssues.map((diff, i) => (
                <IssueRow key={i} issue={diff.issue} status="worsened" previousSeverity={diff.previousSeverity} />
              ))}
            </ul>
          </div>
        )}

        {regression.resolvedIssues.length > 0 && (
          <div className="border-b border-gray-100 last:border-0">
            <div className="px-5 py-2 bg-green-50 text-green-800 text-xs font-semibold uppercase tracking-wider">
              {regression.resolvedIssues.length} Resolved Issues
            </div>
            <ul className="divide-y divide-gray-100">
              {regression.resolvedIssues.map((issue, i) => (
                <IssueRow key={i} issue={issue} status="resolved" />
              ))}
            </ul>
          </div>
        )}

        {regression.improvedIssues.length > 0 && (
          <div className="border-b border-gray-100 last:border-0">
            <div className="px-5 py-2 bg-teal-50 text-teal-800 text-xs font-semibold uppercase tracking-wider">
              {regression.improvedIssues.length} Improved Issues
            </div>
            <ul className="divide-y divide-gray-100">
              {regression.improvedIssues.map((diff, i) => (
                <IssueRow key={i} issue={diff.issue} status="improved" previousSeverity={diff.previousSeverity} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function IssueRow({ issue, status, previousSeverity }: { issue: IssueSnapshot, status: string, previousSeverity?: string }) {
  const isCritical = issue.severity === 'critical'
  const isHigh = issue.severity === 'high'
  const isMedium = issue.severity === 'medium'

  const severityColor = isCritical ? 'bg-red-100 text-red-800' 
    : isHigh ? 'bg-orange-100 text-orange-800' 
    : isMedium ? 'bg-yellow-100 text-yellow-800' 
    : 'bg-blue-100 text-blue-800'

  return (
    <li className="px-5 py-3 hover:bg-gray-50 flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityColor}`}>
        {issue.severity}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate" title={issue.title}>
          {issue.title}
        </p>
        <p className="text-xs text-gray-500 mt-1 truncate">
          {issue.category} • {issue.affectedUrl}
        </p>
        {previousSeverity && (
          <p className="text-xs text-gray-400 mt-1">
            Severity changed from {previousSeverity} to {issue.severity}
          </p>
        )}
      </div>
    </li>
  )
}
