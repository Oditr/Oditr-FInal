'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, Activity, Clock, Zap, Globe, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, TrendingUp, Database, Eye,
} from 'lucide-react'
import Sparkline from '@/components/ui/Sparkline'

interface AnalyticsSummary {
  daily: {
    date: string
    total_audits: number; successful: number; failed: number; partial: number
    avg_latency_ms: number; cache_hits: number; cache_misses: number
    retries: number; timeouts: number; api_failures: number; page_views: number
  }[]
  totals: {
    totalAudits: number; successful: number; failed: number; partial: number
    avgLatency: number; cacheHits: number; cacheMisses: number
    retries: number; timeouts: number; apiFailures: number
    pageViews: number; invalidUrls: number
  }
  topDomains: { domain: string; count: number }[]
  errorBreakdown: Record<string, number>
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <RefreshCw size={24} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
        <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading analytics…</p>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const t = data?.totals || {
    totalAudits: 0, successful: 0, failed: 0, partial: 0,
    avgLatency: 0, cacheHits: 0, cacheMisses: 0,
    retries: 0, timeouts: 0, apiFailures: 0,
    pageViews: 0, invalidUrls: 0,
  }

  const successRate = t.totalAudits > 0 ? Math.round((t.successful / t.totalAudits) * 100) : 0
  const cacheHitRate = (t.cacheHits + t.cacheMisses) > 0 ? Math.round((t.cacheHits / (t.cacheHits + t.cacheMisses)) * 100) : 0
  const avgLatencyS = t.avgLatency > 0 ? (t.avgLatency / 1000).toFixed(1) + 's' : '—'

  // Sparkline data from daily array
  const dailyAudits = data?.daily?.map(d => d.total_audits) || []
  const dailyLabels = data?.daily?.map(d => d.date) || []

  const totalErrors = t.timeouts + t.apiFailures + t.invalidUrls
  const errorItems = Object.entries(data?.errorBreakdown || {}).sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<Activity size={15} />} label="Total Audits" value={t.totalAudits} color="#818cf8" />
        <StatCard icon={<CheckCircle size={15} />} label="Success Rate" value={`${successRate}%`} color="#34d399" sub={`${t.successful} succeeded`} />
        <StatCard icon={<Clock size={15} />} label="Avg Latency" value={avgLatencyS} color="#fbbf24" sub={`${t.totalAudits} runs`} />
        <StatCard icon={<Database size={15} />} label="Cache Hit Rate" value={`${cacheHitRate}%`} color="#60a5fa" sub={`${t.cacheHits} hits / ${t.cacheMisses} misses`} />
      </div>

      {/* ── Row 2: More count cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <MiniCard label="Failed" value={t.failed} icon={<XCircle size={13} />} color="#f87171" />
        <MiniCard label="Partial" value={t.partial} icon={<AlertTriangle size={13} />} color="#fbbf24" />
        <MiniCard label="Timeouts" value={t.timeouts} icon={<Clock size={13} />} color="#fb923c" />
        <MiniCard label="Retries" value={t.retries} icon={<RefreshCw size={13} />} color="#a78bfa" />
        <MiniCard label="Page Views" value={t.pageViews} icon={<Eye size={13} />} color="#34d399" />
        <MiniCard label="Invalid URLs" value={t.invalidUrls} icon={<Globe size={13} />} color="#f87171" />
      </div>

      {/* ── Daily Trend Sparkline ── */}
      {dailyAudits.length > 1 && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={14} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Daily Audit Volume</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(129,140,248,0.08)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.15)', marginLeft: 'auto' }}>
              {dailyAudits.length} days
            </span>
          </div>
          <Sparkline
            data={dailyAudits}
            labels={dailyLabels}
            width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 120 : 600)}
            height={64}
            color="#818cf8"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>{dailyLabels[0]}</span>
            <span>{dailyLabels[dailyLabels.length - 1]}</span>
          </div>
        </div>
      )}

      {/* ── Row 3: Top Domains + Error Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Top Domains */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Globe size={14} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Top Audited Domains</span>
          </div>
          {(data?.topDomains || []).length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No data yet. Run some audits!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {(data?.topDomains || []).slice(0, 8).map((d, i) => (
                <div key={d.domain} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.35rem 0.5rem', borderRadius: 6, background: 'var(--bg)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 16 }}>{i + 1}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                      {d.domain}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa', fontFamily: "'JetBrains Mono', monospace" }}>
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Breakdown */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={14} color="#f87171" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Error Breakdown</span>
            {totalErrors > 0 && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(248,113,113,0.1)', color: '#f87171', marginLeft: 'auto' }}>
                {totalErrors} total
              </span>
            )}
          </div>
          {errorItems.length === 0 && totalErrors === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No errors recorded. 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {totalErrors > 0 && !errorItems.length && (
                <>
                  {t.timeouts > 0 && <ErrorRow label="Timeouts" count={t.timeouts} severity="high" />}
                  {t.apiFailures > 0 && <ErrorRow label="API Failures" count={t.apiFailures} severity="high" />}
                  {t.invalidUrls > 0 && <ErrorRow label="Invalid URLs" count={t.invalidUrls} severity="low" />}
                </>
              )}
              {errorItems.map(([type, count]) => (
                <ErrorRow key={type} label={type.replace(/_/g, ' ')} count={count}
                  severity={type.includes('timeout') || type.includes('fail') ? 'high' : type.includes('invalid') ? 'low' : 'medium'} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty State ── */}
      {t.totalAudits === 0 && t.pageViews === 0 && (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '1rem' }}>
          <BarChart3 size={32} color="var(--text-muted)" style={{ opacity: 0.3 }} />
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>No analytics data yet</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 320, margin: '0.5rem auto 0', lineHeight: 1.5 }}>
            Run audits and use the platform to start collecting data. Analytics update in real-time.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Stat Card Component ──
function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  )
}

// ── Mini Count Card ──
function MiniCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.65rem 0.85rem', borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--bg-card)',
    }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Error Row ──
function ErrorRow({ label, count, severity }: { label: string; count: number; severity: 'high' | 'medium' | 'low' }) {
  const colors = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' }
  const bgColors = { high: 'rgba(248,113,113,0.08)', medium: 'rgba(251,191,36,0.08)', low: 'rgba(96,165,250,0.08)' }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.35rem 0.5rem', borderRadius: 6, background: 'var(--bg)',
    }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors[severity] }}>
          {count}
        </span>
        <span style={{
          fontSize: '0.55rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: 3,
          background: bgColors[severity], color: colors[severity], textTransform: 'uppercase',
        }}>
          {severity}
        </span>
      </div>
    </div>
  )
}
