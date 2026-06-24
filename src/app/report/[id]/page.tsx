// ── Public Shareable Report Page ──
// /report/[id] — read-only audit summary designed for social sharing.

import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, ShieldCheck, AlertTriangle, BarChart3, ExternalLink } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import ScoreRing from '@/components/ScoreRing'

// ── Types ──
interface ReportData {
  id: string
  url: string
  strategy: string
  health_score: number | null
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number } | null
  cwv_summary: any
  top_issues: Array<{ title: string; impact: string; displayValue: string }> | null
  custom_audit: { overallScore: number; totalFindings: number; critical: number; moderate: number; minor: number } | null
  view_count: number
  created_at: string
}

// ── Server-side data fetching ──
async function getReport(id: string): Promise<ReportData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('public_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Increment view count (fire-and-forget)
  supabase
    .from('public_reports')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id)
    .then(() => {})

  return data as ReportData
}

// ── Score color helper ──
function scoreColor(score: number): string {
  if (score >= 90) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

// ── Dynamic OG metadata ──
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const report = await getReport(id)

  if (!report) {
    return { title: 'Report Not Found — Øditr' }
  }

  const domain = new URL(report.url).hostname
  const score = report.health_score ?? report.scores?.performance ?? 0
  const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴'

  return {
    title: `${domain} scored ${score}/100 — Øditr Audit`,
    description: `Core Web Vitals audit for ${domain}. Performance: ${report.scores?.performance ?? 'N/A'}, Health Score: ${score}/100. Run your own free audit on Øditr.`,
    openGraph: {
      title: `${emoji} ${domain} — ${score}/100 Web Vitals Score`,
      description: `See the full Core Web Vitals breakdown for ${domain}. Performance: ${report.scores?.performance ?? 'N/A'}/100. Run your own audit free.`,
      type: 'website',
      url: `https://vitalfix.dev/report/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${emoji} ${domain} — ${score}/100 on Øditr`,
      description: `Core Web Vitals audit results. Run your own free audit.`,
    },
  }
}

// ── Page Component ──
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await getReport(id)

  if (!report) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Report Not Found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            This audit report may have expired or doesn&apos;t exist.
          </p>
          <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
            Run Your Own Audit <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const domain = new URL(report.url).hostname
  const healthScore = report.health_score ?? 0
  const perfScore = report.scores?.performance ?? 0

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <section style={{
        padding: '4rem 0 2.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, var(--bg-secondary), var(--bg))',
      }}>
        <div className="container-pad" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge badge-accent">Shared Report</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
              background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)',
            }}>
              {report.strategy}
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800,
            letterSpacing: '-0.03em', marginBottom: '0.5rem',
          }}>
            Audit Results for <span className="gradient-text">{domain}</span>
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
            Generated {new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {report.view_count > 1 && <> · {report.view_count} views</>}
          </p>
          <a href={report.url} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600, textDecoration: 'none',
          }}>
            {report.url} <ExternalLink size={12} />
          </a>
        </div>
      </section>

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem', maxWidth: 720, margin: '0 auto' }}>
        {/* ── Health Score Hero ── */}
        <div className="glass-card" style={{
          padding: '2rem', marginBottom: '1.5rem', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(129,140,248,0.06))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <ShieldCheck size={16} color="#34d399" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Overall Health Score</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <ScoreRing score={healthScore} size={140} color={scoreColor(healthScore)} label="Health" />
          </div>
          {report.scores && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Performance: <strong style={{ color: scoreColor(report.scores.performance) }}>{report.scores.performance}</strong></span>
              {report.custom_audit && (
                <span>Site Audit: <strong style={{ color: scoreColor(report.custom_audit.overallScore) }}>{report.custom_audit.overallScore}</strong></span>
              )}
            </div>
          )}
        </div>

        {/* ── Lighthouse Scores ── */}
        {report.scores && (
          <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Zap size={16} color="#818cf8" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Lighthouse Scores</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Performance', val: report.scores.performance },
                { label: 'Accessibility', val: report.scores.accessibility },
                { label: 'Best Practices', val: report.scores.bestPractices },
                { label: 'SEO', val: report.scores.seo },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <ScoreRing score={s.val} size={64} color={scoreColor(s.val)} label="" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CWV Metrics ── */}
        {report.cwv_summary && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BarChart3 size={16} color="#60a5fa" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Core Web Vitals</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {['lcp', 'inp', 'cls', 'fcp', 'ttfb', 'tbt'].map(key => {
                const metric = report.cwv_summary[key]
                if (!metric) return null
                return (
                  <div key={key} style={{
                    padding: '0.85rem', borderRadius: 10,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                      {key.toUpperCase()}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '1.1rem',
                      color: scoreColor(metric.score ?? 50),
                    }}>
                      {metric.value}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Top Issues ── */}
        {report.top_issues && report.top_issues.length > 0 && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Top Issues Found</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {report.top_issues.slice(0, 5).map((issue, i) => (
                <div key={i} style={{
                  padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {issue.title}
                  </span>
                  {issue.impact && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      padding: '0.1rem 0.4rem', borderRadius: 4,
                      background: issue.impact === 'high' ? 'rgba(248,113,113,0.1)' : issue.impact === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(96,165,250,0.1)',
                      color: issue.impact === 'high' ? '#f87171' : issue.impact === 'medium' ? '#fbbf24' : '#60a5fa',
                    }}>
                      {issue.impact}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Findings Summary ── */}
        {report.custom_audit && report.custom_audit.totalFindings > 0 && (
          <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {report.custom_audit.critical > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                  {report.custom_audit.critical} Critical
                </span>
              )}
              {report.custom_audit.moderate > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                  {report.custom_audit.moderate} Moderate
                </span>
              )}
              {report.custom_audit.minor > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                  {report.custom_audit.minor} Minor
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── CTA — Run Your Own Audit ── */}
        <div style={{
          borderRadius: 20, padding: '2.5rem',
          background: 'linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(96,165,250,0.04) 50%, rgba(52,211,153,0.03) 100%)',
          border: '1px solid rgba(129,140,248,0.15)',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Want to audit <em>your</em> site?
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Run a free Core Web Vitals audit in 30 seconds. No sign-up required.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 2rem', fontSize: '0.9rem' }}>
              Run Free Audit <ArrowRight size={16} />
            </Link>
            <Link href="/library" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
              Browse Fix Library
            </Link>
          </div>
        </div>
      </div>

      {/* ── JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Øditr',
            url: 'https://vitalfix.dev',
            applicationCategory: 'DeveloperApplication',
            description: 'Core Web Vitals audit and optimization platform for developers.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
    </div>
  )
}
