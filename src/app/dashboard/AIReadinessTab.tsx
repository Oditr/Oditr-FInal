'use client'
import { useState } from 'react'
import { Bot, ShieldCheck, FileText, Globe, Code, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronRight, Copy, Sparkles } from 'lucide-react'
import type { AuditResult } from './types'

const statusColors: Record<string, string> = {
  'Excellent': '#34d399',
  'Good': '#60a5fa',
  'Needs Work': '#fbbf24',
  'Poor': '#f87171',
}

const crawlerStatusColors: Record<string, string> = {
  allowed: '#34d399',
  blocked: '#f87171',
  not_specified: '#6b7280',
}

function ScoreCircle({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 85 ? '#34d399' : score >= 65 ? '#60a5fa' : score >= 40 ? '#fbbf24' : '#f87171'
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        style={{ fill: color, fontSize: size * 0.28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
        {score}
      </text>
    </svg>
  )
}

export default function AIReadinessTab({ result }: { result: AuditResult }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['crawlers']))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const ai = (result as any).aiReadiness
  if (!ai) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Bot size={32} color="#6b7280" style={{ marginBottom: '0.75rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>AI-Agent Readiness data not available for this audit.</p>
      </div>
    )
  }

  const toggle = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const copySnippet = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const issues = ((result as any).issues || []).filter((i: any) => i.category === 'ai_readiness')

  return (
    <div className="stagger">

      {/* ── Experimental Disclaimer ── */}
      <div style={{
        padding: '0.75rem 1rem', marginBottom: '1.5rem', borderRadius: 12,
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
        display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.78rem', color: '#fbbf24',
      }}>
        <Sparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>Experimental:</strong> These are AI-Agent Readiness Signals — machine-readability indicators that estimate how AI-agent-friendly your website appears. They do not guarantee ranking in any AI system.
        </span>
      </div>

      {/* ── Score Hero ── */}
      <div className="glass-card" style={{
        padding: '2rem', marginBottom: '1.5rem', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(129,140,248,0.06), rgba(52,211,153,0.04))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Bot size={18} color="#818cf8" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>AI-Agent Readiness Score</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <ScoreCircle score={ai.score} size={120} />
        </div>
        <div style={{
          display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: 8,
          background: `${statusColors[ai.status] || '#6b7280'}15`,
          color: statusColors[ai.status] || '#6b7280',
          fontWeight: 700, fontSize: '0.82rem',
        }}>
          {ai.status}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem', maxWidth: 500, margin: '0.75rem auto 0', lineHeight: 1.6 }}>
          {ai.summary}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 6, background: 'rgba(129,140,248,0.1)', color: '#818cf8', fontWeight: 600 }}>
            Confidence: {ai.confidence}
          </span>
        </div>
      </div>

      {/* ── Crawler Access Table ── */}
      {ai.crawlerAccess && ai.crawlerAccess.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div
            onClick={() => toggle('crawlers')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: expandedSections.has('crawlers') ? '1rem' : 0 }}
          >
            <ShieldCheck size={16} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Crawler Access</span>
            <span style={{ marginLeft: 'auto' }}>
              {expandedSections.has('crawlers') ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
            </span>
          </div>
          {expandedSections.has('crawlers') && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {ai.crawlerAccess.map((c: any) => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem', borderRadius: 8,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{c.name}</span>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '0.1rem 0.45rem', borderRadius: 4,
                    background: `${crawlerStatusColors[c.status]}15`,
                    color: crawlerStatusColors[c.status],
                  }}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── llms.txt Status ── */}
      {ai.llmsTxt && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div
            onClick={() => toggle('llmstxt')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: expandedSections.has('llmstxt') ? '1rem' : 0 }}
          >
            <FileText size={16} color={ai.llmsTxt.exists ? '#34d399' : '#fbbf24'} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>llms.txt</span>
            <span style={{
              marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 4,
              background: ai.llmsTxt.exists ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
              color: ai.llmsTxt.exists ? '#34d399' : '#fbbf24',
            }}>
              {ai.llmsTxt.exists ? 'Found' : 'Missing'}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {expandedSections.has('llmstxt') ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
            </span>
          </div>
          {expandedSections.has('llmstxt') && (
            <div>
              {ai.llmsTxt.exists ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <p>Content length: {ai.llmsTxt.contentLength} bytes · Quality: {ai.llmsTxt.qualityScore}/100</p>
                  {ai.llmsTxt.importantLinksFound.length > 0 && (
                    <p style={{ marginTop: '0.5rem' }}>References: {ai.llmsTxt.importantLinksFound.join(', ')}</p>
                  )}
                </div>
              ) : ai.llmsTxt.suggestedTemplate ? (
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Consider creating an llms.txt file. Here&apos;s a starter template:
                  </p>
                  <div style={{ background: '#1e1e2e', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a6accd', fontWeight: 600 }}>Suggested llms.txt</span>
                      <button onClick={() => copySnippet('llmstxt', ai.llmsTxt.suggestedTemplate)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
                        color: copiedId === 'llmstxt' ? '#34d399' : '#a6accd',
                      }}>
                        <Copy size={13} />
                      </button>
                    </div>
                    <pre style={{ margin: 0, padding: '0.75rem', fontSize: '0.75rem', color: '#cdd6f4', overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                      <code>{ai.llmsTxt.suggestedTemplate}</code>
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ── Structured Data ── */}
      {ai.structuredData && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div
            onClick={() => toggle('schema')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: expandedSections.has('schema') ? '1rem' : 0 }}
          >
            <Code size={16} color={ai.structuredData.found ? '#34d399' : '#f87171'} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Structured Data</span>
            <span style={{
              marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 4,
              background: ai.structuredData.found ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              color: ai.structuredData.found ? '#34d399' : '#f87171',
            }}>
              {ai.structuredData.found ? `${ai.structuredData.schemas.length} schema(s)` : 'None'}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {expandedSections.has('schema') ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
            </span>
          </div>
          {expandedSections.has('schema') && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {ai.structuredData.schemas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ai.structuredData.schemas.map((s: any, i: number) => (
                    <div key={i} style={{
                      padding: '0.5rem 0.75rem', borderRadius: 8,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                      {s.valid ? <CheckCircle size={14} color="#34d399" /> : <AlertTriangle size={14} color="#f87171" />}
                      <span style={{ fontWeight: 600 }}>{s.type}</span>
                      {!s.valid && <span style={{ color: '#f87171', fontSize: '0.72rem' }}>Invalid JSON</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No JSON-LD structured data detected. Adding schema markup helps AI agents understand your content.</p>
              )}
              {ai.structuredData.missingRecommended.length > 0 && (
                <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Recommended schemas not found: {ai.structuredData.missingRecommended.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Discoverability ── */}
      {ai.discoverability && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div
            onClick={() => toggle('discover')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: expandedSections.has('discover') ? '1rem' : 0 }}
          >
            <Globe size={16} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Discoverability</span>
            <span style={{ marginLeft: 'auto' }}>
              {expandedSections.has('discover') ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
            </span>
          </div>
          {expandedSections.has('discover') && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {ai.discoverability.sitemapExists ? <CheckCircle size={14} color="#34d399" /> : <AlertTriangle size={14} color="#f87171" />}
                Sitemap: {ai.discoverability.sitemapExists ? 'Found' : 'Missing'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {ai.discoverability.sitemapInRobots ? <CheckCircle size={14} color="#34d399" /> : <Info size={14} color="#6b7280" />}
                Sitemap in robots.txt: {ai.discoverability.sitemapInRobots ? 'Yes' : 'No'}
              </div>
              {ai.discoverability.importantPagesFound.length > 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Discoverable pages: {ai.discoverability.importantPagesFound.join(', ')}
                </p>
              )}
              {ai.discoverability.importantPagesMissing.length > 0 && (
                <p style={{ color: '#fbbf24', fontSize: '0.78rem' }}>
                  Not easily discoverable: {ai.discoverability.importantPagesMissing.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Renderability Warnings ── */}
      {ai.renderability && ai.renderability.warnings.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={16} color="#fbbf24" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Renderability Warnings</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {ai.renderability.warnings.map((w: string, i: number) => (
              <div key={i} style={{
                padding: '0.5rem 0.75rem', borderRadius: 8,
                background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)',
              }}>
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Readiness Issues List ── */}
      {issues.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Info size={16} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>All AI Readiness Findings ({issues.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {issues.map((issue: any) => {
              const sevColor = issue.severity === 'critical' ? '#f87171' : issue.severity === 'high' ? '#fb923c' : issue.severity === 'medium' ? '#fbbf24' : issue.severity === 'low' ? '#60a5fa' : '#9ca3af'
              return (
                <div key={issue.id} style={{
                  padding: '1rem', borderRadius: 10, borderLeft: `3px solid ${sevColor}`,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{issue.title}</span>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.1rem 0.4rem', borderRadius: 4,
                        background: `${sevColor}15`, color: sevColor,
                      }}>{issue.severity}</span>
                      {issue.experimental && (
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4,
                          background: 'rgba(129,140,248,0.1)', color: '#818cf8',
                        }}>EXPERIMENTAL</span>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{issue.description}</p>
                  {issue.recommendation && (
                    <p style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.5rem' }}>
                      💡 {issue.recommendation}
                    </p>
                  )}
                  {issue.fixSnippet && (
                    <div style={{ marginTop: '0.5rem', background: '#1e1e2e', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ padding: '0.35rem 0.65rem', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#a6accd', fontWeight: 600 }}>Fix Snippet</span>
                        <button onClick={() => copySnippet(issue.id, issue.fixSnippet)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: copiedId === issue.id ? '#34d399' : '#a6accd' }}>
                          <Copy size={12} />
                        </button>
                      </div>
                      <pre style={{ margin: 0, padding: '0.6rem', fontSize: '0.72rem', color: '#cdd6f4', overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                        <code>{issue.fixSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
