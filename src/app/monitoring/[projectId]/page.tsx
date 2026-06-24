'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MonitoredProject, RegressionReport, ScoreTrendPoint } from '@/lib/monitoring/types'
import { MonitoringStatusBadge } from '@/components/monitoring/MonitoringStatusBadge'
import { ScoreTrendChart } from '@/components/monitoring/ScoreTrendChart'
import { RegressionSummaryCard } from '@/components/monitoring/RegressionSummaryCard'
import { VitalsTrendPanel } from '@/components/monitoring/VitalsTrendPanel'
import { IssueChangesPanel } from '@/components/monitoring/IssueChangesPanel'
import { ChevronLeftIcon, RefreshCwIcon, SettingsIcon } from 'lucide-react'

export default function ProjectMonitoringDetail() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<MonitoredProject | null>(null)
  const [trends, setTrends] = useState<{ trend: ScoreTrendPoint[], direction: 'improving'|'declining'|'stable' } | null>(null)
  const [regression, setRegression] = useState<RegressionReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      const [projRes, trendsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/trends`)
      ])
      
      if (!projRes.ok) throw new Error('Failed to load project')
      
      const pData = await projRes.json()
      setProject(pData)
      
      if (trendsRes.ok) {
        setTrends(await trendsRes.json())
      }

      if (pData.lastReportId) {
        const regRes = await fetch(`/api/reports/${pData.lastReportId}/comparison`)
        if (regRes.ok) {
          setRegression(await regRes.json())
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualScan = async () => {
    if (!project) return
    try {
      setIsScanning(true)
      const res = await fetch(`/api/projects/${project.id}/scan`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Scan failed')
      }
      // Refresh data
      await fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsScanning(false)
    }
  }

  const handleToggleMonitoring = async () => {
    if (!project) return
    try {
      const res = await fetch(`/api/projects/${project.id}/monitoring`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: !project.monitoringEnabled,
          frequency: project.monitoringFrequency === 'manual' ? 'weekly' : project.monitoringFrequency
        })
      })
      if (res.ok) {
        setProject(await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading project details...</div>
  }

  if (error || !project) {
    return <div className="p-8 text-center text-red-600">{error || 'Project not found'}</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/monitoring" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to Monitoring
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              {project.url}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <MonitoringStatusBadge status={project.status} frequency={project.monitoringFrequency} enabled={project.monitoringEnabled} />
            <button
              onClick={handleToggleMonitoring}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
            >
              <SettingsIcon className="w-4 h-4 inline mr-1.5" />
              {project.monitoringEnabled ? 'Configure' : 'Enable Monitoring'}
            </button>
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="text-sm text-white px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <RefreshCwIcon className={`w-4 h-4 mr-1.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Run Scan Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Charts & Stats) */}
        <div className="lg:col-span-2 space-y-6">
          <ScoreTrendChart trend={trends?.trend || []} direction={trends?.direction || 'stable'} />
          
          <RegressionSummaryCard regression={regression} />
          
          <IssueChangesPanel regression={regression} />
        </div>

        {/* Right Column (Vitals & Details) */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Current Score</dt>
                <dd className="font-medium text-gray-900">{project.lastOverallScore ?? '--'}/100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Last Scan</dt>
                <dd className="font-medium text-gray-900">{project.lastScanAt ? new Date(project.lastScanAt).toLocaleString() : 'Never'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Next Scan</dt>
                <dd className="font-medium text-gray-900">{project.nextScanAt ? new Date(project.nextScanAt).toLocaleString() : 'Manual only'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Added</dt>
                <dd className="font-medium text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <VitalsTrendPanel vitalsDeltas={regression?.vitalsDeltas || []} />
        </div>
      </div>
    </div>
  )
}
