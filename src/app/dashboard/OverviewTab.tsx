'use client'
import ScoreRing from '@/components/ui/ScoreRing'
import type { AuditResult } from './types'
import { scoreColor, waterfallItems, typeColors, filmStrip } from './utils'

export default function OverviewTab({ result }: { result: AuditResult }) {
  if (!result.cwv) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Lab metrics unavailable</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          PageSpeed Insights did not return lab data for this audit. Only the Site Audit results are available.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {([
          { key: 'lcp', label: 'LCP', full: 'Largest Contentful Paint', color: '#60a5fa' },
          { key: 'inp', label: 'INP', full: 'Interaction to Next Paint', color: '#34d399' },
          { key: 'cls', label: 'CLS', full: 'Cumulative Layout Shift', color: '#fbbf24' },
          { key: 'fcp', label: 'FCP', full: 'First Contentful Paint', color: '#a78bfa' },
          { key: 'ttfb', label: 'TTFB', full: 'Server Response Time', color: '#ec4899' },
          { key: 'tbt', label: 'TBT', full: 'Total Blocking Time', color: '#ef4444' },
          { key: 'si', label: 'SI', full: 'Speed Index', color: '#f59e0b' },
        ] as const).map(m => {
          const data = result.cwv![m.key]
          return (
            <div key={m.key} className="glass-card" style={{ padding: '1.5rem', borderColor: `${m.color}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.key.toUpperCase()}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4, background: `${scoreColor(data.score)}18`, color: scoreColor(data.score) }}>
                  {data.score >= 90 ? 'Good' : data.score >= 50 ? 'Needs Improvement' : 'Poor'}
                </span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: scoreColor(data.score), fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: '0.3rem' }}>
                {data.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.full}</div>
              {/* Score bar */}
              <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.score}%`, background: scoreColor(data.score), borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Waterfall chart */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Network Waterfall</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>simulated layout · real metrics above</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{type}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {waterfallItems.map((item, i) => (
            <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>{item.label}</span>
              <div style={{ position: 'relative', height: 22, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div className="waterfall-bar" style={{ position: 'absolute', left: `${item.offset}%`, width: `${item.width}%`, background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`, animationDelay: `${i * 60}ms` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filmstrip */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa' }} />
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Filmstrip View</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>simulated page-load progression</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {filmStrip.map((frame, i) => (
            <div key={frame.label} className="filmstrip-frame" style={{ animationDelay: `${i * 80}ms`, minWidth: 100 }}>
              <div style={{ height: 70, background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${frame.fill}%`, background: 'linear-gradient(180deg, transparent, rgba(96,165,250,0.15))' }} />
                {frame.fill > 10 && <div style={{ position: 'absolute', top: 8, left: 8, right: 8, height: 8, borderRadius: 2, background: 'var(--border)', opacity: Math.min(1, frame.fill / 30) }} />}
                {frame.fill > 30 && <div style={{ position: 'absolute', top: 22, left: 8, right: 20, height: 18, borderRadius: 3, background: 'rgba(96,165,250,0.25)', opacity: Math.min(1, (frame.fill - 20) / 30) }} />}
                {frame.fill > 60 && <div style={{ position: 'absolute', top: 46, left: 8, right: 30, height: 6, borderRadius: 2, background: 'var(--border)', opacity: Math.min(1, (frame.fill - 50) / 30) }} />}
                {frame.fill >= 100 && <div style={{ position: 'absolute', inset: 0, border: '2px solid #43e97b', borderRadius: 0 }} />}
              </div>
              <div style={{ padding: '0.4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: frame.fill >= 100 ? '#34d399' : 'var(--text-muted)' }}>{frame.label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{frame.fill}% loaded</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
