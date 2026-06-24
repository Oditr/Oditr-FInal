import React from 'react'
import type { AuditIssue } from '@/lib/audit-engine/types'

export function PriorityFixMatrix({ issues }: { issues: AuditIssue[] }) {
  if (!issues || issues.length === 0) return null

  // Categorize issues based on severity and implicit difficulty
  // For simplicity:
  // Critical -> Fix Immediately
  // High -> Plan This Sprint
  // Medium -> Quick Wins (if actionable) or Backlog
  // Low/Info -> Backlog

  const fixImmediately = issues.filter(i => i.severity === 'critical')
  const planThisSprint = issues.filter(i => i.severity === 'high')
  const quickWins = issues.filter(i => i.severity === 'medium')
  const backlog = issues.filter(i => i.severity === 'low' || i.severity === 'info')

  return (
    <div className="space-y-6">
      <MatrixSection title="Fix Immediately" description="Critical business impact. Immediate action required." issues={fixImmediately} colorClass="border-red-500 bg-red-50 text-red-900" />
      <MatrixSection title="Plan This Sprint" description="High business impact. Schedule for the upcoming cycle." issues={planThisSprint} colorClass="border-orange-500 bg-orange-50 text-orange-900" />
      <MatrixSection title="Quick Wins" description="Moderate impact but usually easy to resolve." issues={quickWins} colorClass="border-yellow-500 bg-yellow-50 text-yellow-900" />
      <MatrixSection title="Backlog" description="Low priority fixes or technical debt to monitor." issues={backlog} colorClass="border-gray-400 bg-gray-50 text-gray-800" />
    </div>
  )
}

function MatrixSection({ title, description, issues, colorClass }: { title: string, description: string, issues: AuditIssue[], colorClass: string }) {
  if (issues.length === 0) return null

  return (
    <div className={`border-l-4 p-4 rounded-r-lg ${colorClass}`}>
      <h4 className="font-bold text-lg">{title}</h4>
      <p className="text-sm opacity-80 mb-4">{description}</p>
      
      <div className="space-y-3">
        {issues.map((issue, idx) => (
          <div key={idx} className="bg-white bg-opacity-60 rounded p-3 border border-black border-opacity-10">
            <div className="flex justify-between items-start">
              <span className="font-semibold text-sm">{issue.title}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black bg-opacity-5">
                {issue.category.replace('_', ' ')}
              </span>
            </div>
            {issue.impact && <p className="text-xs mt-1 opacity-90"><span className="font-semibold">Business Risk:</span> {issue.impact}</p>}
            {issue.recommendation && <p className="text-xs mt-1 opacity-90"><span className="font-semibold">Action:</span> {issue.recommendation}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
