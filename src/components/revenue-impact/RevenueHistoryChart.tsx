'use client'

import { useEffect, useState } from 'react'
import Sparkline from '@/components/Sparkline'
import type { RevenueImpactResult } from '@/lib/revenue-impact'
import { Loader2 } from 'lucide-react'

export function RevenueHistoryChart({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<RevenueImpactResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        setIsLoading(true)
        // Ensure this route matches our newly created report fetch route
        const res = await fetch(`/api/v1/revenue/report?projectId=${encodeURIComponent(projectId)}&limit=30`)
        const data = await res.json()
        
        if (data.error) throw new Error(data.error)
        
        // We sort ascending for the chart (oldest left, newest right)
        const sorted = (data.reports as RevenueImpactResult[]).sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setReports(sorted)
      } catch (err: any) {
        setError(err.message || 'Failed to load historical revenue data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchHistory()
  }, [projectId])

  if (isLoading) {
    return (
      <div className="glass-card mb-6" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <Loader2 className="animate-spin text-muted-foreground" size={32} style={{ color: 'var(--text-muted)' }} />
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card mb-6" style={{ padding: '2rem', borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <p style={{ fontSize: '0.875rem', color: '#f87171' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (reports.length < 2) {
    return null // Sparkline needs at least 2 points to be useful
  }

  // Extract revenue data points and labels
  const dataPoints = reports.map(r => r.totalEstimatedRevenueAtRisk)
  const labels = reports.map(r => new Date(r.createdAt).toLocaleDateString())

  // Calculate trend
  const first = dataPoints[0]
  const last = dataPoints[dataPoints.length - 1]
  const diff = last - first
  const percentChange = first === 0 ? 0 : (diff / first) * 100
  
  const isTrendingDown = diff < 0 // Down is good (less revenue at risk)

  return (
    <div className="glass-card mb-6" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Revenue Risk Trend</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Estimated revenue at risk over time</p>
          </div>
          {diff !== 0 && (
            <div style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: isTrendingDown ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              color: isTrendingDown ? '#34d399' : '#f87171',
            }}>
              {isTrendingDown ? '↓' : '↑'} {Math.abs(percentChange).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      <div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <Sparkline 
            data={dataPoints} 
            labels={labels}
            width={600} 
            height={100}
            color={isTrendingDown ? '#34d399' : '#f87171'} // Green if improving, Red if worsening
            showArea={true}
          />
        </div>
      </div>
    </div>
  )
}
