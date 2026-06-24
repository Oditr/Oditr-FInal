import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, ShieldCheck, AlertTriangle, BarChart3, ExternalLink, Code, Info, CheckCircle2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import ScoreRing from '@/components/ScoreRing'
import { AuditIssue, CategoryScore, UnifiedCategory } from '@/lib/audit-engine/types'

// ── Types ──
interface ReportData {
  id: string
  url: string
  strategy: string
  health_score: number | null
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number } | null
  cwv_summary: any
  top_issues: Array<{ title: string; impact: string; displayValue: string }> | null
  custom_audit: { overallScore: number; totalFindings: number; critical: number; moderate?: number; medium?: number; minor?: number; low?: number } | null
  categoryScores?: Record<UnifiedCategory, CategoryScore>
  issues?: AuditIssue[]
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

// ── Helpers ──
function scoreColor(score: number): string {
  if (score >= 90) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

function severityColor(sev: string): string {
  if (sev === 'critical') return '#f87171'
  if (sev === 'high') return '#fb923c'
  if (sev === 'medium') return '#fbbf24'
  if (sev === 'low') return '#60a5fa'
  return '#9ca3af'
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
    title: `${domain} scored ${score}/100 — Øditr Audit Engine`,
    description: `Core Audit Intelligence Report for ${domain}. Health Score: ${score}/100. Run your own free audit on Øditr.`,
    openGraph: {
      title: `${emoji} ${domain} — ${score}/100 Audit Score`,
      description: `See the full technical intelligence breakdown for ${domain}.`,
      type: 'website',
      url: `https://vitalfix.dev/report/${id}`, // Update to oditr when domain ready
    },
  }
}

// ── Component ──
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

  // Fallbacks for older reports without new categoryScores
  const catScores = report.categoryScores || {
    performance: { score: report.scores?.performance ?? 0, label: 'Performance' },
    seo: { score: report.scores?.seo ?? 0, label: 'SEO' },
    accessibility: { score: report.scores?.accessibility ?? 0, label: 'Accessibility' },
    security: { score: report.custom_audit?.overallScore ?? 0, label: 'Security' }, // Guess
    ai_readiness: { score: 0, label: 'AI Readiness' },
    mobile: { score: 100, label: 'Mobile' },
    images: { score: 100, label: 'Images' },
    broken_links: { score: 100, label: 'Broken Links' }
  } as any

  const issues: AuditIssue[] = report.issues || []

  // Group issues by category for display
  const issuesByCategory: Record<string, AuditIssue[]> = {}
  for (const issue of issues) {
    if (!issuesByCategory[issue.category]) issuesByCategory[issue.category] = []
    issuesByCategory[issue.category].push(issue)
  }

  const formatCatName = (cat: string) => {
    return cat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

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
            <span className="badge badge-accent">Øditr Intelligence Report</span>
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

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        
        {/* ── Overall Scorecard ── */}
        <div className="glass-card" style={{
          padding: '2rem', marginBottom: '2rem', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(129,140,248,0.06))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <ShieldCheck size={16} color="#34d399" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Overall Health Score</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <ScoreRing score={healthScore} size={140} color={scoreColor(healthScore)} label="Health" />
          </div>
        </div>

        {/* ── Category Score Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Object.values(catScores).map((cat: any) => {
            if (!cat || typeof cat.score !== 'number') return null;
            return (
              <div key={cat.category || cat.label} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
                <ScoreRing score={cat.score} size={64} color={scoreColor(cat.score)} label="" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {cat.category ? formatCatName(cat.category) : cat.label}
                </span>
                {cat.summary && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cat.summary}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Core Web Vitals ── */}
        {report.cwv_summary && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
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

        {/* ── Issues by Category ── */}
        {Object.keys(issuesByCategory).length > 0 ? (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              Intelligence Findings
            </h2>
            
            {Object.entries(issuesByCategory).map(([category, catIssues]) => (
              <div key={category} style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {formatCatName(category)}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    {catIssues.length}
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {catIssues.map((issue) => (
                    <div key={issue.id} className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${severityColor(issue.severity)}` }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{issue.title}</h4>
                        <span style={{ 
                          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.15rem 0.5rem', borderRadius: 4,
                          background: `${severityColor(issue.severity)}20`, color: severityColor(issue.severity)
                        }}>
                          {issue.severity}
                        </span>
                      </div>
                      
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                        {issue.description}
                      </p>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {issue.impact && (
                          <div style={{ flex: '1 1 200px', fontSize: '0.8rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                              <Info size={14} /> Why this matters
                            </div>
                            <span style={{ color: 'var(--text-secondary)' }}>{issue.impact}</span>
                          </div>
                        )}
                        {issue.recommendation && (
                          <div style={{ flex: '1 1 200px', fontSize: '0.8rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                              <CheckCircle2 size={14} /> Recommendation
                            </div>
                            <span style={{ color: 'var(--text-secondary)' }}>{issue.recommendation}</span>
                          </div>
                        )}
                      </div>

                      {issue.fixSnippet && (
                        <div style={{ marginTop: '0.75rem', background: '#1e1e2e', borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#a6accd', fontWeight: 600 }}>
                            <Code size={14} /> Developer Fix Snippet
                          </div>
                          <pre style={{ margin: 0, padding: '1rem', fontSize: '0.8rem', color: '#cdd6f4', overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                            <code>{issue.fixSnippet}</code>
                          </pre>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback for old reports without the new 'issues' array */
          report.top_issues && report.top_issues.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={16} color="#fbbf24" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Legacy Findings</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {report.top_issues.map((issue, i) => (
                  <div key={i} style={{
                    padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {issue.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* ── CTA — Run Your Own Audit ── */}
        <div style={{
          marginTop: '3rem',
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
          </div>
        </div>
      </div>
    </div>
  )
}
