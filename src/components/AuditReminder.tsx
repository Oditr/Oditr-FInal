'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Clock } from 'lucide-react'
import { getHistory, type StoredScan } from '@/lib/scan-store'
import { useAuth } from '@/components/providers/AuthProvider'

interface AuditReminderProps {
  onRunAudit: (url: string) => void
}

export default function AuditReminder({ onRunAudit }: AuditReminderProps) {
  const { user } = useAuth()
  const [staleScans, setStaleScans] = useState<StoredScan[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    ;(async () => {
      try {
        const history = await getHistory(user.id)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

        // Find URLs that haven't been audited in 7+ days
        const urlMap = new Map<string, StoredScan>()
        for (const scan of history) {
          const domain = new URL(scan.url).hostname
          if (!urlMap.has(domain)) {
            urlMap.set(domain, scan)
          }
        }

        const stale = Array.from(urlMap.values())
          .filter(s => new Date(s.fetchedAt).getTime() < sevenDaysAgo)
          .slice(0, 3)

        setStaleScans(stale)
      } catch { /* ignore */ }
    })()
  }, [user?.id])

  if (dismissed || staleScans.length === 0) return null

  const daysAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000))
    return days === 1 ? '1 day ago' : `${days} days ago`
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="glass-card" style={{
        padding: '1.25rem', borderColor: 'rgba(129,140,248,0.2)',
        background: 'linear-gradient(135deg, rgba(129,140,248,0.04), rgba(52,211,153,0.02))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={15} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Time to re-audit</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
            }}
          >
            Dismiss
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {staleScans.map(scan => (
            <div key={scan.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 0.85rem', borderRadius: 10,
              background: 'var(--bg)', border: '1px solid var(--border)',
              gap: '0.5rem',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {new URL(scan.url).hostname}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <Clock size={10} />
                  Last audited {daysAgo(scan.fetchedAt)}
                  <span style={{ margin: '0 0.2rem' }}>·</span>
                  Score: <strong style={{
                    color: scan.healthScore >= 90 ? '#34d399' : scan.healthScore >= 50 ? '#fbbf24' : '#f87171',
                  }}>{scan.healthScore}</strong>
                </div>
              </div>
              <button
                onClick={() => onRunAudit(scan.url)}
                className="btn-primary"
                style={{
                  fontSize: '0.72rem', padding: '0.35rem 0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <RefreshCw size={11} /> Re-audit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
