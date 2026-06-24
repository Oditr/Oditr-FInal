import React from 'react'
import type { CategoryResult, AuditFinding } from '@/app/dashboard/types'
import { Bot, CheckCircle, XCircle, AlertTriangle, FileJson, FileText, Search, Code, RefreshCw } from 'lucide-react'

export function AIAgentReadinessTab({ result, onReAudit, isAuditing }: { result?: CategoryResult, onReAudit: () => void, isAuditing: boolean }) {
  if (!result) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <Bot size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>AI-Agent Readiness not found</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
          This audit may have been run before the AI-Agent Readiness module was added.
        </p>
        <button
          onClick={onReAudit}
          disabled={isAuditing}
          className="btn-primary"
          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isAuditing ? <><RefreshCw size={14} className="animate-spin" /> Running Audit...</> : <><RefreshCw size={14} /> Run New Audit</>}
        </button>
      </div>
    )
  }

  // Helper to color the score
  const scoreColor = result.score >= 90 ? '#34d399' : result.score >= 50 ? '#fbbf24' : '#f87171'
  const scoreBg = result.score >= 90 ? 'rgba(52,211,153,0.1)' : result.score >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)'

  const getIconForFinding = (id: string) => {
    if (id.includes('llms-txt')) return <FileText size={18} />
    if (id.includes('robots')) return <Bot size={18} />
    if (id.includes('json-ld')) return <FileJson size={18} />
    if (id.includes('semantic')) return <Code size={18} />
    if (id.includes('js-reliance')) return <Search size={18} />
    return <AlertTriangle size={18} />
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          border: `4px solid ${scoreColor}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px ${scoreBg}`,
          flexShrink: 0
        }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{result.score}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.25rem' }}>/ 100</span>
        </div>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>AI-Agent Readiness</h2>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(167,139,250,0.3)' }}>New</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 600, margin: 0 }}>
            This score evaluates how easily AI models, crawlers, and intelligent agents (like ChatGPT, Perplexity, and Claude) can discover, understand, and cite your website's content.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {result.findings.map(finding => {
          const isPassed = finding.severity === 'info'
          const iconColor = isPassed ? '#34d399' : finding.severity === 'critical' ? '#f87171' : '#fbbf24'
          const bg = isPassed ? 'rgba(52,211,153,0.05)' : finding.severity === 'critical' ? 'rgba(248,113,113,0.05)' : 'rgba(251,191,36,0.05)'
          const border = isPassed ? 'rgba(52,211,153,0.2)' : finding.severity === 'critical' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'

          return (
            <div key={finding.id} className="glass-card" style={{ padding: '1.25rem', background: bg, borderColor: border, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ color: iconColor, marginTop: '2px' }}>
                  {isPassed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
                    {finding.title}
                  </h4>
                  {finding.value && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', padding: '0.1rem 0.3rem', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {finding.value}
                    </span>
                  )}
                </div>
              </div>
              
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', paddingLeft: '2.2rem', lineHeight: 1.5, flex: 1 }}>
                {finding.description}
              </p>
              
              {finding.recommendation && (
                <div style={{ marginTop: 'auto', paddingLeft: '2.2rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>How to fix</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {finding.recommendation.fix}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
