'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, ArrowRight, TrendingUp, Zap, Target, Clock,
  BarChart3, GitCompare, Eye, Sparkles, Shield, CheckCircle,
  ChevronRight, Activity, Gauge,
} from 'lucide-react'

// ── Benchmark data ──
const benchmarks = [
  { industry: 'E-commerce', lcp: '3.8s', inp: '320ms', cls: '0.18', lcpOk: false, inpOk: false, clsOk: false },
  { industry: 'SaaS / Apps', lcp: '2.4s', inp: '180ms', cls: '0.09', lcpOk: true, inpOk: true, clsOk: true },
  { industry: 'News / Media', lcp: '4.2s', inp: '410ms', cls: '0.22', lcpOk: false, inpOk: false, clsOk: false },
  { industry: 'Portfolio', lcp: '1.9s', inp: '120ms', cls: '0.04', lcpOk: true, inpOk: true, clsOk: true },
]

// ── Competitor comparison ──
const competitors = [
  {
    name: 'PageSpeed Insights',
    icon: '🔍',
    scores: { diagnostics: true, fixes: false, workflow: false, trends: false },
    gap: 'Shows problems but doesn\'t tell you how to fix them.',
  },
  {
    name: 'GTmetrix',
    icon: '📊',
    scores: { diagnostics: true, fixes: false, workflow: false, trends: true },
    gap: 'Great visualization, but fix guidance is generic.',
  },
  {
    name: 'WebPageTest',
    icon: '🧪',
    scores: { diagnostics: true, fixes: false, workflow: false, trends: false },
    gap: 'Very technical — steep learning curve for most teams.',
  },
  {
    name: 'Semrush',
    icon: '📈',
    scores: { diagnostics: true, fixes: false, workflow: false, trends: true },
    gap: 'Broad SEO focus — CWV detail is surface-level.',
  },
]

const comparisonAxes = [
  { key: 'diagnostics', label: 'Issue Diagnostics' },
  { key: 'fixes', label: 'Actionable Fixes' },
  { key: 'workflow', label: 'Guided Resolution' },
  { key: 'trends', label: 'Trend Tracking' },
]

// ── Stats ──
const stats = [
  { value: '60%', label: 'Faster Fix Prioritization', icon: <Zap size={18} />, color: '#fbbf24' },
  { value: '3×', label: 'Faster Audit Understanding', icon: <Eye size={18} />, color: '#60a5fa' },
  { value: '1-Step', label: 'Guided Resolution', icon: <Target size={18} />, color: '#34d399' },
  { value: 'Live', label: 'Historical Trend Tracking', icon: <TrendingUp size={18} />, color: '#818cf8' },
  { value: 'Built-in', label: 'Benchmark Comparison', icon: <GitCompare size={18} />, color: '#f87171' },
  { value: 'Real-time', label: 'Audit Insights', icon: <Activity size={18} />, color: '#a78bfa' },
]

export default function BenchmarkSection() {
  const [isOpen, setIsOpen] = useState(false)

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  return (
    <>
      {/* ── Visible Benchmark Section ── */}
      <section style={{
        padding: '4rem 0',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="badge badge-orange" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
              Industry Benchmarks
            </span>
            <h2 className="text-h1" style={{ marginTop: '0.5rem' }}>
              How Does Your Site <span className="gradient-text-warm">Stack Up?</span>
            </h2>
            <p style={{
              color: 'var(--text-secondary)', marginTop: '0.75rem',
              maxWidth: 480, margin: '0.75rem auto 0', fontSize: '0.9rem',
            }}>
              Real-world CrUX p75 data by industry. Most sites are failing — here&apos;s where you stand.
            </p>
          </div>

          {/* Summary cards row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem', marginBottom: '1.5rem',
          }}>
            {[
              { label: 'Overall Score', value: 'Top 15%', sub: 'fix-first approach', icon: <Gauge size={16} />, color: '#34d399' },
              { label: 'Ranked Above', value: '4 tools', sub: 'in guided resolution', icon: <TrendingUp size={16} />, color: '#818cf8' },
              { label: 'Key Differentiator', value: 'Resolution', sub: 'not just diagnostics', icon: <Target size={16} />, color: '#fbbf24' },
            ].map(c => (
              <div key={c.label} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: c.color }}>{c.icon}</span>
                  <span className="text-label">{c.label}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>{c.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Benchmark table */}
          <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
              gap: 0, padding: '0.75rem 1.25rem',
              background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
            }}>
              <span className="text-label">Industry</span>
              {['LCP (p75)', 'INP (p75)', 'CLS (p75)'].map(h => (
                <span key={h} className="text-label" style={{ textAlign: 'center' }}>{h}</span>
              ))}
            </div>
            {benchmarks.map((b, i) => (
              <div key={b.industry} style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
                gap: 0, padding: '0.85rem 1.25rem',
                borderBottom: i < benchmarks.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.industry}</span>
                {[
                  { val: b.lcp, ok: b.lcpOk },
                  { val: b.inp, ok: b.inpOk },
                  { val: b.cls, ok: b.clsOk },
                ].map((cell, ci) => (
                  <div key={ci} style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                      color: cell.ok ? '#34d399' : '#f87171',
                      padding: '0.15rem 0.45rem', borderRadius: 5,
                      background: cell.ok ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
                    }}>
                      {cell.val}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Data from Chrome UX Report (CrUX) · Green = Good · Red = Needs Improvement
            </p>
            <button
              onClick={() => setIsOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1.25rem', borderRadius: 9,
                background: 'linear-gradient(135deg, rgba(129,140,248,0.1), rgba(96,165,250,0.08))',
                border: '1px solid rgba(129,140,248,0.25)',
                color: 'var(--accent)', fontWeight: 600, fontSize: '0.82rem',
                cursor: 'pointer', transition: 'all 200ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(129,140,248,0.18), rgba(96,165,250,0.14))'
                e.currentTarget.style.borderColor = 'rgba(129,140,248,0.45)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(129,140,248,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(129,140,248,0.1), rgba(96,165,250,0.08))'
                e.currentTarget.style.borderColor = 'rgba(129,140,248,0.25)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              View Full Analysis <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Slide-Over Drawer ── */}
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(560px, 92vw)', zIndex: 1000,
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          boxShadow: isOpen ? '-20px 0 60px rgba(0, 0, 0, 0.3)' : 'none',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Drawer header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '1rem 1.5rem',
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Benchmark Intelligence</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>How Øditr compares to alternatives</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer content */}
        <div style={{ padding: '1.5rem' }}>

          {/* ── A. Competitor Comparison ── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <GitCompare size={16} color="var(--accent)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Competitor Comparison</span>
            </div>

            {/* Comparison matrix */}
            <div style={{
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              marginBottom: '1rem',
            }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)',
                padding: '0.6rem 0.85rem', background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)', gap: '0.25rem',
              }}>
                <span className="text-label" style={{ fontSize: '0.62rem' }}>Tool</span>
                {comparisonAxes.map(a => (
                  <span key={a.key} className="text-label" style={{ fontSize: '0.62rem', textAlign: 'center' }}>{a.label}</span>
                ))}
              </div>

              {/* Oditr row (highlighted) */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)',
                padding: '0.7rem 0.85rem', gap: '0.25rem', alignItems: 'center',
                background: 'rgba(129, 140, 248, 0.04)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent)' }}>
                  ✦ Øditr
                </span>
                {[true, true, true, true].map((v, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <CheckCircle size={14} color="#34d399" />
                  </div>
                ))}
              </div>

              {/* Competitor rows */}
              {competitors.map((c, idx) => (
                <div key={c.name} style={{
                  display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)',
                  padding: '0.7rem 0.85rem', gap: '0.25rem', alignItems: 'center',
                  borderBottom: idx < competitors.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {c.icon} {c.name}
                  </span>
                  {comparisonAxes.map(a => (
                    <div key={a.key} style={{ textAlign: 'center' }}>
                      {c.scores[a.key as keyof typeof c.scores]
                        ? <CheckCircle size={13} color="var(--text-muted)" />
                        : <X size={13} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Competitor gap cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {competitors.map(c => (
                <div key={c.name} style={{
                  padding: '0.65rem 0.85rem', borderRadius: 8,
                  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '0.95rem', flexShrink: 0, lineHeight: 1.4 }}>{c.icon}</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{c.name}</span>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.1rem' }}>
                      {c.gap}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── B. Product Workflow Stats ── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <BarChart3 size={16} color="#60a5fa" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Platform Advantages</span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.65rem',
            }}>
              {stats.map((s, i) => (
                <div key={s.label} style={{
                  padding: '1rem', borderRadius: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  transition: 'all 200ms',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 8,
                    background: `${s.color}12`, color: s.color,
                    marginBottom: '0.6rem',
                  }}>
                    {s.icon}
                  </div>
                  <div style={{
                    fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.03em',
                    color: 'var(--text-primary)', lineHeight: 1,
                    marginBottom: '0.25rem',
                  }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── C. Value Differentiation ── */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              borderRadius: 14, padding: '1.5rem',
              background: 'linear-gradient(160deg, rgba(129,140,248,0.06), rgba(52,211,153,0.04), transparent)',
              border: '1px solid rgba(129,140,248,0.2)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 150, height: 150, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(129,140,248,0.1), transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Sparkles size={16} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>
                    What Makes Øditr Different
                  </span>
                </div>

                <h3 style={{
                  fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em',
                  marginBottom: '0.75rem', lineHeight: 1.3,
                }}>
                  More than diagnostics —<br />
                  <span className="gradient-text">built for resolution.</span>
                </h3>

                <p style={{
                  fontSize: '0.84rem', color: 'var(--text-secondary)',
                  lineHeight: 1.7, marginBottom: '1.25rem',
                }}>
                  Most tools show you what&apos;s broken. Øditr shows you <strong style={{ color: 'var(--text-primary)' }}>what to fix</strong>,{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>how to fix it</strong>, and{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>how much it&apos;ll improve</strong>. Every audit
                  produces actionable code, prioritized by impact, with expected score uplift.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { text: 'Fix-first recommendations with code snippets', icon: <Shield size={13} /> },
                    { text: 'Expected score uplift for each fix', icon: <TrendingUp size={13} /> },
                    { text: 'Simpler UI — no learning curve', icon: <Eye size={13} /> },
                    { text: 'Guided resolution workflow', icon: <Target size={13} /> },
                  ].map(item => (
                    <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#34d399' }}>{item.icon}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom CTA ── */}
          <div style={{
            textAlign: 'center',
            padding: '1.5rem', borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
          }}>
            <p style={{
              fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem',
            }}>
              See the difference yourself
            </p>
            <p style={{
              fontSize: '0.8rem', color: 'var(--text-muted)',
              marginBottom: '1rem',
            }}>
              Run your first audit — free, no sign-up required.
            </p>
            <a href="/dashboard" className="btn-primary" style={{
              textDecoration: 'none', padding: '0.65rem 1.5rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}>
              Run Free Audit <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
