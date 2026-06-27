'use client'
import { useState } from 'react'
import { CheckSquare, Square, RefreshCw, Download } from 'lucide-react'
import ScoreRing from '@/components/ui/ScoreRing'
import { scoreColor as getScoreColor } from '../dashboard/utils'

type CheckItem = { id: string; text: string; category: string; impact: 'high' | 'medium' | 'low' }

const items: CheckItem[] = [
  // LCP
  { id: 'lcp1', category: 'LCP', impact: 'high', text: 'Set fetchpriority="high" on the LCP image element' },
  { id: 'lcp2', category: 'LCP', impact: 'high', text: '<link rel="preload"> for LCP image in <head>' },
  { id: 'lcp3', category: 'LCP', impact: 'high', text: 'Serve images in WebP or AVIF format' },
  { id: 'lcp4', category: 'LCP', impact: 'high', text: 'Enable a CDN for static assets (Cloudflare, Vercel, CloudFront)' },
  { id: 'lcp5', category: 'LCP', impact: 'medium', text: 'Server response time (TTFB) is under 600ms' },
  { id: 'lcp6', category: 'LCP', impact: 'medium', text: 'Provide srcset and sizes on all images' },
  { id: 'lcp7', category: 'LCP', impact: 'medium', text: 'Compress and resize images to appropriate max width' },
  { id: 'lcp8', category: 'LCP', impact: 'medium', text: 'Use stale-while-revalidate caching on HTML responses' },
  { id: 'lcp9', category: 'LCP', impact: 'low', text: 'Inline critical CSS (above-the-fold styles)' },
  { id: 'lcp10', category: 'LCP', impact: 'low', text: 'Remove render-blocking stylesheets and scripts' },

  // INP
  { id: 'inp1', category: 'INP', impact: 'high', text: 'No JavaScript task exceeds 50ms (break up long tasks)' },
  { id: 'inp2', category: 'INP', impact: 'high', text: 'Debounce high-frequency event handlers (input, scroll, resize)' },
  { id: 'inp3', category: 'INP', impact: 'high', text: 'Defer non-critical scripts with defer or async attributes' },
  { id: 'inp4', category: 'INP', impact: 'medium', text: 'Move heavy computation to Web Workers' },
  { id: 'inp5', category: 'INP', impact: 'medium', text: 'Use scheduler.postTask() or scheduler.yield() for background work' },
  { id: 'inp6', category: 'INP', impact: 'medium', text: 'Virtualise long lists (react-window, TanStack Virtual)' },
  { id: 'inp7', category: 'INP', impact: 'medium', text: 'Avoid layout thrash (batch DOM reads/writes)' },
  { id: 'inp8', category: 'INP', impact: 'low', text: 'Profile and remove unused JavaScript with bundle analyser' },
  { id: 'inp9', category: 'INP', impact: 'low', text: 'Use code-splitting / dynamic imports for routes and heavy modules' },
  { id: 'inp10', category: 'INP', impact: 'low', text: 'Enable tree-shaking in your bundler config' },

  // CLS
  { id: 'cls1', category: 'CLS', impact: 'high', text: 'All <img> elements have explicit width and height attributes' },
  { id: 'cls2', category: 'CLS', impact: 'high', text: 'All ad slots and embeds have a reserved min-height' },
  { id: 'cls3', category: 'CLS', impact: 'high', text: 'Font swap does not cause layout shift (use size-adjust fallback)' },
  { id: 'cls4', category: 'CLS', impact: 'high', text: 'Dynamic banners/toasts are inserted above existing content, not injected mid-flow' },
  { id: 'cls5', category: 'CLS', impact: 'medium', text: 'Animations use transform and opacity only (not top/left/width/height)' },
  { id: 'cls6', category: 'CLS', impact: 'medium', text: 'Sticky or fixed positioned elements do not cause reflow on scroll' },
  { id: 'cls7', category: 'CLS', impact: 'medium', text: 'Skeleton loading screens replace empty states during data fetch' },
  { id: 'cls8', category: 'CLS', impact: 'low', text: 'Video embeds have aspect-ratio CSS property set' },
  { id: 'cls9', category: 'CLS', impact: 'low', text: 'CSS transitions use will-change sparingly and correctly' },
  { id: 'cls10', category: 'CLS', impact: 'low', text: 'No content is injected above the fold after page load' },

  // General
  { id: 'gen1', category: 'General', impact: 'high', text: 'Tested on real device (Android mid-range) with throttling' },
  { id: 'gen2', category: 'General', impact: 'high', text: 'PageSpeed Insights score ≥ 90 on mobile' },
  { id: 'gen3', category: 'General', impact: 'medium', text: 'HTTPS enabled with valid certificate' },
  { id: 'gen4', category: 'General', impact: 'medium', text: 'HTTP/2 or HTTP/3 enabled on hosting provider' },
  { id: 'gen5', category: 'General', impact: 'medium', text: 'Gzip or Brotli compression enabled on server' },
  { id: 'gen6', category: 'General', impact: 'medium', text: 'Third-party scripts loaded with async, defer, or facade pattern' },
  { id: 'gen7', category: 'General', impact: 'low', text: 'Resource Hints: dns-prefetch and preconnect for critical origins' },
  { id: 'gen8', category: 'General', impact: 'low', text: 'Lighthouse CI integrated into your CI/CD pipeline' },
  { id: 'gen9', category: 'General', impact: 'low', text: 'CrUX data monitored in Search Console' },
  { id: 'gen10', category: 'General', impact: 'low', text: 'Performance budget set and documented in project' },
]

const impactColor: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#34d399' }
const catColor: Record<string, string> = { LCP: '#60a5fa', INP: '#34d399', CLS: '#fbbf24', General: '#818cf8' }

// Reuse shared score thresholds (80/50 for checklist completion %)
const checklistScoreColor = (pct: number) => pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'
const categories = ['All', 'LCP', 'INP', 'CLS', 'General']

export default function ChecklistPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('All')

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const reset = () => setChecked(new Set())

  const exportResults = () => {
    const lines: string[] = [
      '=== VitalFix Performance Audit Report ===',
      `Generated: ${new Date().toLocaleString()}`,
      `Score: ${pct}% (${done}/${total} completed)`,
      '',
    ]
    const cats = ['LCP', 'INP', 'CLS', 'General']
    for (const cat of cats) {
      const catItems = items.filter(i => i.category === cat)
      lines.push(`── ${cat} ──`)
      for (const item of catItems) {
        const status = checked.has(item.id) ? '[x]' : '[ ]'
        lines.push(`${status} [${item.impact.toUpperCase()}] ${item.text}`)
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vitalfix-audit-${Date.now()}.txt`
    a.click()
  }

  const filtered = filter === 'All' ? items : items.filter(i => i.category === filter)
  const total = filtered.length
  const done = filtered.filter(i => checked.has(i.id)).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const ringColor = checklistScoreColor(pct)

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <span className="badge badge-green" style={{ marginBottom: '1rem' }}>Audit Checklist</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            40-Point <span className="gradient-text">Performance Audit</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 540, lineHeight: 1.7 }}>
            Systematically audit every Core Web Vital. Check off items as you fix them and track your score in real time.
          </p>
        </div>
      </section>

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="checklist-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2.5rem', alignItems: 'start' }}>
          {/* Checklist */}
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button key={c} onClick={() => setFilter(c)} aria-label={`Filter by ${c}`} aria-pressed={filter === c} style={{
                  padding: '0.35rem 0.9rem', borderRadius: 100,
                  background: filter === c
                    ? (c === 'All' ? 'var(--accent)' : `${catColor[c]}22`)
                    : 'var(--bg-card)',
                  color: filter === c ? (c === 'All' ? '#fff' : catColor[c]) : 'var(--text-secondary)',
                  border: filter === c && c !== 'All' ? `1px solid ${catColor[c]}44` : '1px solid var(--border)',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {c}
                </button>
              ))}
              <button onClick={reset} aria-label="Reset all checks" style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.85rem', borderRadius: 100,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
              }}>
                <RefreshCw size={12} /> Reset
              </button>
              <button onClick={exportResults} aria-label="Export audit results" style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.85rem', borderRadius: 100,
                background: done > 0 ? 'rgba(96,165,250,0.1)' : 'var(--bg-card)',
                border: `1px solid ${done > 0 ? 'rgba(96,165,250,0.3)' : 'var(--border)'}`,
                color: done > 0 ? '#60a5fa' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
              }}>
                <Download size={12} /> Export
              </button>
            </div>

            {/* Items */}
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.9rem',
                    padding: '0.9rem 1.1rem', borderRadius: 10,
                    border: `1px solid ${checked.has(item.id) ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`,
                    background: checked.has(item.id) ? 'rgba(52,211,153,0.05)' : 'var(--bg-card)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    opacity: checked.has(item.id) ? 0.7 : 1,
                  }}
                >
                  {checked.has(item.id)
                    ? <CheckSquare size={18} color="#34d399" style={{ flexShrink: 0 }} />
                    : <Square size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  }
                  <span style={{
                    fontSize: '0.875rem', color: 'var(--text-primary)', flex: 1, lineHeight: 1.5,
                    textDecoration: checked.has(item.id) ? 'line-through' : 'none',
                  }}>
                    {item.text}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.45rem',
                      borderRadius: 5, background: `${catColor[item.category]}18`,
                      color: catColor[item.category], border: `1px solid ${catColor[item.category]}30`,
                    }}>{item.category}</span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.45rem',
                      borderRadius: 5, background: `${impactColor[item.impact]}12`,
                      color: impactColor[item.impact],
                    }}>{item.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score tracker */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="glass-card" style={{ padding: '2rem', minWidth: 200, textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Your Score
              </p>

              {/* Circular progress */}
              <div style={{ margin: '0 auto 1rem', width: 110, display: 'flex', justifyContent: 'center' }}>
                <ScoreRing score={pct} size={110} strokeWidth={8} color={ringColor} label="" />
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {done} / {total} completed
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Needs Work', color: '#f87171', range: '0–49%' },
                  { label: 'Getting There', color: '#fbbf24', range: '50–79%' },
                  { label: 'Excellent', color: '#34d399', range: '80–100%' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.range}</span>
                  </div>
                ))}
              </div>

              <p style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: ringColor,
                padding: '0.5rem', borderRadius: 8,
                background: pct >= 80 ? 'rgba(52,211,153,0.1)' : pct >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
              }}>
                {pct >= 80 ? '🚀 Excellent work!' : pct >= 50 ? '⚡ Keep going!' : '🔧 Lots to improve'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .checklist-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
