'use client'
import { useState } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronRight, Copy, ExternalLink,
  Zap, Shield, TrendingUp, Info, ArrowUpRight, Sparkles,
  CheckCircle, Target, Gauge, Brain, Eye, Code2, Lightbulb,
} from 'lucide-react'
import type { AuditResult, PrioritizedIssue, IntelligenceReport } from './types'

// ═══════════════════════════════════════════════
// VISUAL CONSTANTS
// ═══════════════════════════════════════════════

const TIER_COLORS = {
  'fix-first': '#f87171',
  'fix-next': '#fbbf24',
  optional: '#60a5fa',
} as const

const TIER_BG = {
  'fix-first': 'rgba(248,113,113,0.06)',
  'fix-next': 'rgba(251,191,36,0.06)',
  optional: 'rgba(96,165,250,0.04)',
} as const

const TIER_BORDER = {
  'fix-first': 'rgba(248,113,113,0.2)',
  'fix-next': 'rgba(251,191,36,0.2)',
  optional: 'rgba(96,165,250,0.15)',
} as const

const TIER_ICON = {
  'fix-first': Zap,
  'fix-next': Target,
  optional: Lightbulb,
} as const

const TIER_LABELS = {
  'fix-first': 'Fix First',
  'fix-next': 'Fix Next',
  optional: 'Optional',
} as const

const RATING_COLORS: Record<string, string> = {
  good: '#34d399',
  'needs-improvement': '#fbbf24',
  poor: '#f87171',
}

const UX_RATING_COLORS: Record<string, string> = {
  excellent: '#34d399',
  good: '#34d399',
  'needs-work': '#fbbf24',
  poor: '#f87171',
  critical: '#f87171',
}

const UX_RATING_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  'needs-work': 'Needs Work',
  poor: 'Poor',
  critical: 'Critical',
}

const IMPROVEMENT_COLORS: Record<string, string> = {
  significant: '#34d399',
  moderate: '#fbbf24',
  minor: '#60a5fa',
}

// ═══════════════════════════════════════════════
// SCORE BAR COMPONENT
// ═══════════════════════════════════════════════

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 70 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// CONFIDENCE BADGE
// ═══════════════════════════════════════════════

function ConfidenceBadge({ level, score }: { level: string; score: number }) {
  const color = level === 'high' ? '#34d399' : level === 'medium' ? '#fbbf24' : '#f87171'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.62rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 4,
      background: `${color}12`, color, border: `1px solid ${color}25`,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <Shield size={9} /> {level} confidence
    </span>
  )
}

// ═══════════════════════════════════════════════
// ISSUE CARD COMPONENT
// ═══════════════════════════════════════════════

function IssueCard({ issue, isExpanded, onToggle }: {
  issue: PrioritizedIssue
  isExpanded: boolean
  onToggle: () => void
}) {
  const [copied, setCopied] = useState(false)
  const tierColor = TIER_COLORS[issue.priorityTier]

  const copySnippet = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      borderRadius: 10,
      background: 'var(--bg)',
      border: `1px solid var(--border)`,
      overflow: 'hidden',
      transition: 'border-color 200ms',
    }}>
      {/* Header — always visible */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
          padding: '0.85rem 1rem',
          cursor: 'pointer',
          transition: 'background 150ms',
        }}
      >
        {/* Expand indicator */}
        <span style={{ marginTop: 3, flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 150ms' }}>
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>

        {/* Priority score circle */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${tierColor}12`, border: `1.5px solid ${tierColor}35`,
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 800, color: tierColor,
        }}>
          {issue.priorityScore}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{issue.title}</span>
            {issue.originalSeverity && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 3,
                background: issue.originalSeverity === 'critical' ? 'rgba(248,113,113,0.12)' : issue.originalSeverity === 'moderate' ? 'rgba(251,191,36,0.12)' : 'rgba(96,165,250,0.12)',
                color: issue.originalSeverity === 'critical' ? '#f87171' : issue.originalSeverity === 'moderate' ? '#fbbf24' : '#60a5fa',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{issue.originalSeverity}</span>
            )}
            {issue.source === 'lighthouse' && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 600, padding: '0.08rem 0.3rem', borderRadius: 3,
                background: 'rgba(129,140,248,0.1)', color: '#818cf8',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Lighthouse</span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, marginBottom: '0.4rem' }}>
            {issue.businessNarrative.slice(0, 140)}{issue.businessNarrative.length > 140 ? '…' : ''}
          </p>
          
          {/* Affected Metrics Badges */}
          {issue.affectedMetrics && issue.affectedMetrics.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {issue.affectedMetrics.map(metric => (
                <span key={metric} style={{
                  fontSize: '0.58rem', fontWeight: 600, padding: '0.12rem 0.4rem', borderRadius: 4,
                  background: 'rgba(167,139,250,0.12)', color: '#a78bfa',
                  border: '1px solid rgba(167,139,250,0.25)',
                  display: 'flex', alignItems: 'center', gap: '0.2rem'
                }}>
                  Affects {metric}
                </span>
              ))}
            </div>
          )}
          
          {/* Metadata tags (Confidence, Impact, Effort) */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Shield size={9} color="#818cf8" />
              Conf: <span style={{ color: '#818cf8' }}>{issue.confidenceScore}%</span>
            </span>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Target size={9} color="#f87171" />
              Impact: <span style={{ color: '#f87171' }}>{issue.impactScore}/100</span>
            </span>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Gauge size={9} color="#34d399" />
              Effort: <span style={{ color: '#34d399' }}>{issue.effortScore}/100</span>
            </span>
          </div>
        </div>

        {/* Estimated improvement badge */}
        <span style={{
          display: 'flex', alignItems: 'center', gap: '0.2rem',
          fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 4,
          background: `${IMPROVEMENT_COLORS[issue.estimatedImprovement]}10`,
          color: IMPROVEMENT_COLORS[issue.estimatedImprovement],
          border: `1px solid ${IMPROVEMENT_COLORS[issue.estimatedImprovement]}22`,
          whiteSpace: 'nowrap', flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
          <TrendingUp size={10} />
          {issue.estimatedImprovement}
        </span>
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          animation: 'fadeIn 200ms ease-out',
        }}>
          {/* Score bars */}
          <div style={{ padding: '0.85rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <ScoreBar label="Impact" value={issue.impactScore} color="#f87171" />
            <ScoreBar label="Effort" value={issue.effortScore} color="#34d399" />
            <ScoreBar label="Confidence" value={issue.confidenceScore} color="#818cf8" />
          </div>

          {/* Why it matters */}
          <div style={{ padding: '0 1rem 0.85rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <Info size={12} color="#a78bfa" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Why This Matters</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{issue.whyItMatters}</p>
          </div>

          {/* Expected benefit */}
          <div style={{ padding: '0 1rem 0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <ArrowUpRight size={12} color="#34d399" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expected Benefit</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{issue.expectedBenefit}</p>
          </div>

          {/* Framework hint (Legacy/Text-only) */}
          {!issue.fixSnippet && issue.frameworkHint && (
            <div style={{ padding: '0 1rem 0.85rem' }}>
              <div style={{
                padding: '0.65rem 0.85rem', borderRadius: 8,
                background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <Code2 size={12} color="#818cf8" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Framework-Specific Fix</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{issue.frameworkHint}</p>
              </div>
            </div>
          )}

          {/* Fix Snippet Engine */}
          {issue.fixSnippet && (
            <div style={{ padding: '0 1rem 0.85rem' }}>
              <div style={{
                padding: '0.85rem', borderRadius: 8,
                background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <Code2 size={12} color="#34d399" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>One-Click Fix ({issue.fixSnippet.language})</span>
                </div>
                {issue.fixSnippet.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0, marginBottom: '0.65rem' }}>
                    {issue.fixSnippet.description}
                  </p>
                )}
                <div style={{ position: 'relative' }}>
                  <pre style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
                    padding: '0.75rem 1rem', borderRadius: 6,
                    background: '#0d0d14', color: '#c9d1d9',
                    lineHeight: 1.6, overflow: 'auto', maxHeight: 250,
                    border: '1px solid rgba(255,255,255,0.06)', margin: 0,
                  }}>
                    {issue.fixSnippet.code}
                  </pre>
                  <button
                    onClick={(e) => { e.stopPropagation(); copySnippet(issue.fixSnippet!.code) }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.5rem', borderRadius: 4,
                      background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                      color: copied ? '#34d399' : '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <Copy size={10} />
                    {copied ? 'Copied!' : 'Copy Fix'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fix instructions (Legacy Lighthouse) */}
          {!issue.fixSnippet && issue.fix && (
            <div style={{
              padding: '0.85rem 1rem',
              borderTop: '1px solid var(--border)',
              background: 'rgba(52,211,153,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={12} color="#34d399" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>How to Fix</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0, marginBottom: issue.fix.codeSnippet ? '0.65rem' : 0 }}>
                {issue.fix.instruction}
              </p>

              {/* Code snippet */}
              {issue.fix.codeSnippet && (
                <div style={{ position: 'relative' }}>
                  <pre style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
                    padding: '0.75rem 1rem', borderRadius: 6,
                    background: '#0d0d14', color: '#c9d1d9',
                    lineHeight: 1.6, overflow: 'auto', maxHeight: 200,
                    border: '1px solid rgba(255,255,255,0.06)', margin: 0,
                  }}>
                    {issue.fix.codeSnippet}
                  </pre>
                  <button
                    onClick={(e) => { e.stopPropagation(); copySnippet(issue.fix!.codeSnippet!) }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.5rem', borderRadius: 4,
                      background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                      color: copied ? '#34d399' : '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <Copy size={10} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Docs link */}
              {issue.fix.docsUrl && (
                <a
                  href={issue.fix.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600,
                    textDecoration: 'none', marginTop: '0.5rem',
                  }}
                >
                  Learn more <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// TIER SECTION
// ═══════════════════════════════════════════════

function TierSection({ tier, issues, expanded, onToggle, defaultOpen = true }: {
  tier: 'fix-first' | 'fix-next' | 'optional'
  issues: PrioritizedIssue[]
  expanded: Set<string>
  onToggle: (id: string) => void
  defaultOpen?: boolean
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen)
  const TierIcon = TIER_ICON[tier]
  const color = TIER_COLORS[tier]

  if (issues.length === 0) return null

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${TIER_BORDER[tier]}`,
      background: TIER_BG[tier],
      overflow: 'hidden',
      marginBottom: '1rem',
    }}>
      {/* Tier header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.85rem 1.15rem',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}15`,
        }}>
          <TierIcon size={14} color={color} />
        </div>
        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{TIER_LABELS[tier]}</span>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 20,
          background: `${color}15`, color, minWidth: 20, textAlign: 'center',
        }}>{issues.length}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', transition: 'transform 150ms' }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* Issue cards */}
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.75rem 0.85rem' }}>
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isExpanded={expanded.has(issue.id)}
              onToggle={() => onToggle(issue.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN TAB COMPONENT
// ═══════════════════════════════════════════════

export default function IntelligenceTab({ result }: { result: AuditResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const intel = result.intelligence
  if (!intel) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Brain size={24} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Intelligence data unavailable</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          The intelligence engine could not process this audit. Raw data is available in other tabs.
        </p>
      </div>
    )
  }

  const toggleIssue = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const uxColor = UX_RATING_COLORS[intel.businessSummary.overallUxRating] || '#fbbf24'

  return (
    <div className="stagger">
      {/* ═══ Business Summary Hero ═══ */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        marginBottom: '1.25rem',
        background: `linear-gradient(135deg, ${uxColor}08, transparent)`,
        borderColor: `${uxColor}25`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${uxColor}12`,
          }}>
            <Sparkles size={16} color={uxColor} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem' }}>Øditr Intelligence Report</span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 4,
            background: `${uxColor}12`, color: uxColor,
            border: `1px solid ${uxColor}25`,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {UX_RATING_LABELS[intel.businessSummary.overallUxRating] || intel.businessSummary.overallUxRating}
          </span>
          <ConfidenceBadge level={intel.trust.confidenceLevel} score={intel.trust.confidenceScore} />
        </div>

        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
          {intel.businessSummary.headline}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
          {intel.businessSummary.summary}
        </p>
      </div>

      {/* ═══ Detection Badges ═══ */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {/* Framework */}
        {intel.detectedFramework.framework !== 'unknown' && (
          <div className="glass-card" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <Code2 size={14} color="#818cf8" />
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detected Framework</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#818cf8' }}>
                {intel.detectedFramework.label}
                {intel.detectedFramework.reliable && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>({intel.detectedFramework.confidence}%)</span>}
                {!intel.detectedFramework.reliable && <span style={{ fontSize: '0.58rem', color: '#fbbf24', marginLeft: '0.3rem' }}>(low confidence)</span>}
              </div>
            </div>
          </div>
        )}

        {/* Site category */}
        <div className="glass-card" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
          <Eye size={14} color="#34d399" />
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Site Category</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>
              {intel.siteContext.label}
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>({intel.siteContext.confidence}%)</span>
            </div>
          </div>
        </div>

        {/* Issue count */}
        <div className="glass-card" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 150px' }}>
          <Gauge size={14} color="#fbbf24" />
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Issues</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
              <span style={{ color: '#f87171' }}>{intel.fixFirst.length}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / </span>
              <span style={{ color: '#fbbf24' }}>{intel.fixNext.length}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / </span>
              <span style={{ color: '#60a5fa' }}>{intel.optional.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Metric Narratives ═══ */}
      {intel.businessSummary.metricNarratives.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }} />
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Performance Impact</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
            {intel.businessSummary.metricNarratives.map(mn => {
              const color = RATING_COLORS[mn.rating] || '#fbbf24'
              return (
                <div key={mn.metric} style={{
                  padding: '0.85rem 1rem', borderRadius: 8,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{mn.metric}</span>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: 3,
                        background: `${color}12`, color,
                      }}>
                        {mn.rating === 'needs-improvement' ? 'Needs Work' : mn.rating.charAt(0).toUpperCase() + mn.rating.slice(1)}
                      </span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace' }}>{mn.displayValue}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    {mn.narrative}
                  </p>
                  {mn.contextualNote && (
                    <p style={{ fontSize: '0.72rem', color: '#a78bfa', lineHeight: 1.5, margin: 0, marginTop: '0.35rem', fontStyle: 'italic' }}>
                      {mn.contextualNote}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Prioritized Issue Tiers ═══ */}
      <TierSection
        tier="fix-first"
        issues={intel.fixFirst}
        expanded={expanded}
        onToggle={toggleIssue}
        defaultOpen={true}
      />
      <TierSection
        tier="fix-next"
        issues={intel.fixNext}
        expanded={expanded}
        onToggle={toggleIssue}
        defaultOpen={true}
      />
      <TierSection
        tier="optional"
        issues={intel.optional}
        expanded={expanded}
        onToggle={toggleIssue}
        defaultOpen={false}
      />

      {/* ═══ No Issues ═══ */}
      {intel.totalIssues === 0 && (
        <div className="glass-card" style={{
          padding: '2rem', textAlign: 'center',
          background: 'rgba(52,211,153,0.04)', borderColor: 'rgba(52,211,153,0.2)',
        }}>
          <CheckCircle size={28} color="#34d399" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', color: '#34d399', marginBottom: '0.4rem' }}>No issues detected</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Both Lighthouse and the custom audit found no actionable issues. Your page is in great shape!
          </p>
        </div>
      )}

      {/* ═══ Trust & Evidence Footer ═══ */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginTop: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <Shield size={13} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Evidence Sources</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: intel.trust.caveats.length > 0 ? '0.65rem' : 0 }}>
          {intel.trust.evidenceSources.map((src, i) => (
            <span key={i} style={{
              fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
              background: 'rgba(129,140,248,0.08)', color: '#818cf8',
              border: '1px solid rgba(129,140,248,0.15)',
            }}>{src}</span>
          ))}
        </div>
        {intel.trust.caveats.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {intel.trust.caveats.map((caveat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                <AlertTriangle size={11} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{caveat}</span>
              </div>
            ))}
          </div>
        )}
        {intel.trust.improvementHint && (
          <p style={{ fontSize: '0.72rem', color: '#34d399', margin: 0, marginTop: '0.5rem' }}>
            💡 {intel.trust.improvementHint}
          </p>
        )}
      </div>
    </div>
  )
}
