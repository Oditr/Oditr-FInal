'use client'
import { useState } from 'react'
import type { RevenueImpactResult, IssueImpactOutput, BusinessProfile, ConfidenceLevel, PriorityLabel } from '@/lib/revenue-impact'
import type { AuditResult } from '@/app/dashboard/types'
import { buildRevenueImpactReport, auditResultToIssues } from '@/lib/revenue-impact'
import BusinessProfileForm from './BusinessProfileForm'
import { RevenueHistoryChart } from './RevenueHistoryChart'
import {
  DollarSign, AlertTriangle, TrendingDown, Shield, ChevronDown,
  ChevronRight, Info, Sparkles, Target, BarChart3, Wrench, Eye,
} from 'lucide-react'

// ── Formatting Helpers ──

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$',
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`
  return `${symbol}${Math.round(amount)}`
}

function confidenceColor(c: ConfidenceLevel): string {
  if (c === 'high') return '#34d399'
  if (c === 'medium') return '#fbbf24'
  return '#f87171'
}

function priorityColor(label: PriorityLabel): string {
  if (label === 'Critical Revenue Risk') return '#f87171'
  if (label === 'High Revenue Risk') return '#fbbf24'
  if (label === 'Moderate Revenue Risk') return '#60a5fa'
  if (label === 'Low Revenue Risk') return '#818cf8'
  return 'var(--text-muted)'
}

function difficultyEmoji(d: string): string {
  if (d === 'easy') return '🟢'
  if (d === 'medium') return '🟡'
  if (d === 'hard') return '🔴'
  return '⚪'
}

// ── Main Dashboard Component ──

interface Props {
  result: AuditResult
}

export default function RevenueImpactTab({ result }: Props) {
  const [report, setReport] = useState<RevenueImpactResult | null>(null)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)

  const handleProfileSave = async (savedProfile: BusinessProfile) => {
    setCalculating(true)
    setProfile(savedProfile)

    try {
      // 1. Calculate the impact locally so the UI updates fast
      const customFindings = result.customAudit?.categories?.flatMap(
        (cat) => (cat.findings || []).map((f) => ({ ...f, category: cat.category }))
      ) || []

      const issues = auditResultToIssues(
        result.url,
        customFindings,
        result.opportunities
      )

      // The new ID for this specific run
      const runId = `rep_${Date.now()}`
      const impactReport = buildRevenueImpactReport(savedProfile, issues, runId)
      setReport(impactReport)

      // 2. Call the calculate route to persist the generated report
      fetch('/api/v1/revenue/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: result.url,
          profile: savedProfile,
          customFindings,
          lighthouseOpportunities: result.opportunities,
          reportId: runId,
        })
      }).catch(err => console.error('Failed to persist revenue calculation', err))
      
    } catch (e) {
      console.error('Revenue calculation failed:', e)
    } finally {
      setCalculating(false)
    }
  }

  // ── No report yet: show profile form ──
  if (!report) {
    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#34d399" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Revenue Impact Engine
            </h2>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem',
              borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.2)', textTransform: 'uppercase',
            }}>
              Beta
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 560 }}>
            Understand how technical issues may affect your revenue, conversions, and leads.
            Add your business data below to generate a transparent revenue impact analysis.
          </p>
        </div>
        <BusinessProfileForm onSave={handleProfileSave} saving={calculating} />
      </div>
    )
  }

  // ── Report exists: show dashboard ──
  const criticalCount = report.issueImpacts.filter(
    (i) => i.priorityLabel === 'Critical Revenue Risk'
  ).length
  const highCount = report.issueImpacts.filter(
    (i) => i.priorityLabel === 'High Revenue Risk'
  ).length

  // Priority matrix buckets
  const fixImmediately = report.issueImpacts.filter(
    (i) => i.estimatedRevenueAtRisk > 100 && (i.fixDifficulty === 'easy' || i.fixDifficulty === 'medium')
  )
  const planSprint = report.issueImpacts.filter(
    (i) => i.estimatedRevenueAtRisk > 100 && i.fixDifficulty === 'hard'
  )
  const quickCleanup = report.issueImpacts.filter(
    (i) => i.estimatedRevenueAtRisk <= 100 && (i.fixDifficulty === 'easy' || i.fixDifficulty === 'medium')
  )
  const backlog = report.issueImpacts.filter(
    (i) => i.estimatedRevenueAtRisk <= 100 && i.fixDifficulty === 'hard'
  )

  return (
    <div>
      {/* ── Historical Trend Chart ── */}
      {profile && <RevenueHistoryChart projectId={profile.projectId} />}

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {/* Total Revenue at Risk */}
        <div className="glass-card" style={{
          padding: '1.25rem', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(248,113,113,0.06), rgba(251,191,36,0.04))',
          borderColor: 'rgba(248,113,113,0.2)',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Estimated Revenue at Risk
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatCurrency(report.totalEstimatedRevenueAtRisk, report.currency)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>per month (estimated)</div>
        </div>

        {/* Critical Issues */}
        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Critical Revenue Risks
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: criticalCount > 0 ? '#f87171' : '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {highCount > 0 ? `+ ${highCount} high risk` : 'issues found'}
          </div>
        </div>

        {/* Confidence */}
        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Overall Confidence
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '1rem', fontWeight: 800,
            color: confidenceColor(report.overallConfidence),
            padding: '0.3rem 0.75rem', borderRadius: 8,
            background: `${confidenceColor(report.overallConfidence)}15`,
            border: `1px solid ${confidenceColor(report.overallConfidence)}30`,
          }}>
            <Shield size={14} />
            {report.overallConfidence.charAt(0).toUpperCase() + report.overallConfidence.slice(1)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {report.overallConfidence === 'high' ? 'Based on your real data' :
             report.overallConfidence === 'medium' ? 'Some values estimated' :
             'Most values estimated'}
          </div>
        </div>

        {/* Total Issues Analyzed */}
        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Issues Analyzed
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#818cf8', fontFamily: "'JetBrains Mono', monospace" }}>
            {report.issueImpacts.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            technical issues mapped
          </div>
        </div>
      </div>

      {/* ── Priority Matrix ── */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Target size={16} color="#818cf8" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Fix Priority Matrix</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <MatrixCell title="🔥 Fix Immediately" subtitle="High impact + Easy fix" count={fixImmediately.length} color="#f87171" />
          <MatrixCell title="📋 Plan Next Sprint" subtitle="High impact + Hard fix" count={planSprint.length} color="#fbbf24" />
          <MatrixCell title="🧹 Quick Cleanup" subtitle="Low impact + Easy fix" count={quickCleanup.length} color="#60a5fa" />
          <MatrixCell title="📥 Backlog" subtitle="Low impact + Hard fix" count={backlog.length} color="var(--text-muted)" />
        </div>
      </div>

      {/* ── Top Revenue Risks Table ── */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingDown size={16} color="#f87171" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Revenue Risk Breakdown</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sorted by priority score
          </span>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {report.issueImpacts.slice(0, 15).map((impact) => (
            <IssueRow
              key={impact.issueId}
              impact={impact}
              currency={report.currency}
              expanded={expandedIssue === impact.issueId}
              onToggle={() => setExpandedIssue(expandedIssue === impact.issueId ? null : impact.issueId)}
            />
          ))}
        </div>

        {report.issueImpacts.length > 15 && (
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            + {report.issueImpacts.length - 15} more issues analyzed
          </div>
        )}
      </div>

      {/* ── Assumptions Panel ── */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderColor: 'rgba(96,165,250,0.2)' }}>
        <button onClick={() => setShowAssumptions(!showAssumptions)} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
          padding: 0,
        }}>
          <Eye size={16} color="#60a5fa" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Assumptions & Methodology</span>
          <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showAssumptions ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
        </button>

        {showAssumptions && profile && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
              <AssumptionRow label="Monthly Sessions" value={profile.monthlySessions?.toLocaleString() || 'Estimated: 5,000'} estimated={!profile.monthlySessions} />
              <AssumptionRow label="Conversion Rate" value={profile.conversionRate ? `${(profile.conversionRate * 100).toFixed(1)}%` : 'Estimated (industry default)'} estimated={!profile.conversionRate} />
              <AssumptionRow label="Avg Order/Lead Value" value={profile.averageOrderValue ? `${CURRENCY_SYMBOLS[profile.currency] || ''}${profile.averageOrderValue}` : profile.averageLeadValue ? `${CURRENCY_SYMBOLS[profile.currency] || ''}${profile.averageLeadValue}` : 'Estimated: $50'} estimated={!profile.averageOrderValue && !profile.averageLeadValue} />
              <AssumptionRow label="Business Type" value={profile.businessType.replace('_', ' ')} estimated={false} />
            </div>

            <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>How this works:</strong><br />
              Revenue at Risk = (Affected Sessions × Conversion Rate × AOV) × Issue Impact Factor<br />
              Impact factors are weighted by issue severity, page funnel stage, and business criticality.<br />
              <strong style={{ color: '#fbbf24' }}>These are estimates, not guarantees.</strong> Add your real analytics data to improve accuracy.
            </div>
          </div>
        )}
      </div>

      {/* ── Recalculate Button ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => { setReport(null); setProfile(null) }} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          <Wrench size={14} /> Update Business Profile
        </button>
        {profile && (
          <button onClick={() => handleProfileSave(profile)} className="btn-primary" style={{ fontSize: '0.82rem' }}>
            <Sparkles size={14} /> Recalculate Impact
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──

function MatrixCell({ title, subtitle, count, color }: { title: string; subtitle: string; count: number; color: string }) {
  return (
    <div style={{
      padding: '0.85rem', borderRadius: 10, border: '1px solid var(--border)',
      background: count > 0 ? `${color}08` : 'transparent',
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.15rem' }}>{title}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{subtitle}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: count > 0 ? color : 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
        {count}
      </div>
    </div>
  )
}

function IssueRow({ impact, currency, expanded, onToggle }: {
  impact: IssueImpactOutput; currency: string; expanded: boolean; onToggle: () => void
}) {
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border)',
      background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
      overflow: 'hidden', transition: 'all 150ms',
    }}>
      {/* Main row */}
      <button onClick={onToggle} style={{
        display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 0.8fr 0.8fr auto',
        alignItems: 'center', gap: '0.5rem', width: '100%',
        padding: '0.75rem', background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-primary)', textAlign: 'left', fontSize: '0.8rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: priorityColor(impact.priorityLabel), flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3 }}>
            {impact.issueTitle}
          </span>
        </div>
        <span style={{ fontWeight: 800, color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>
          {formatCurrency(impact.estimatedRevenueAtRisk, currency)}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700,
          color: confidenceColor(impact.confidence),
        }}>
          {impact.confidence}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          color: impact.priorityScore >= 70 ? '#f87171' : impact.priorityScore >= 40 ? '#fbbf24' : 'var(--text-muted)',
        }}>
          {impact.priorityScore}/100
        </span>
        <span style={{ fontSize: '0.72rem' }}>
          {difficultyEmoji(impact.fixDifficulty)} {impact.fixDifficulty}
        </span>
        <ChevronRight size={14} color="var(--text-muted)" style={{
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms',
        }} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '0 0.75rem 0.75rem', borderTop: '1px solid var(--border)',
          paddingTop: '0.75rem', fontSize: '0.78rem', lineHeight: 1.6,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Priority:</strong> <span style={{ color: priorityColor(impact.priorityLabel) }}>{impact.priorityLabel}</span></div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Impact Category:</strong> {impact.impactCategory.join(', ')}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Affected URL:</strong> <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>{impact.affectedUrl}</span></div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Page Type:</strong> {impact.pageType} ({impact.funnelStage})</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Affected Sessions:</strong> ~{impact.estimatedAffectedSessions.toLocaleString()}/mo</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Baseline Revenue:</strong> {formatCurrency(impact.baselineRevenue, currency)}/mo</div>
          </div>

          {/* Assumptions used */}
          <div style={{
            padding: '0.6rem', borderRadius: 8,
            background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.3rem' }}>Assumptions Used</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>Sessions: {impact.assumptionsUsed.monthlySessions.toLocaleString()} {impact.assumptionsUsed.isEstimatedSessions ? '(estimated)' : '(provided)'}</span>
              <span>CVR: {(impact.assumptionsUsed.conversionRate * 100).toFixed(1)}% {impact.assumptionsUsed.isEstimatedConversion ? '(estimated)' : '(provided)'}</span>
              <span>AOV: {formatCurrency(impact.assumptionsUsed.aov, currency)} {impact.assumptionsUsed.isEstimatedAov ? '(estimated)' : '(provided)'}</span>
              <span>Traffic Share: {(impact.assumptionsUsed.pageTrafficShare * 100).toFixed(0)}% {impact.assumptionsUsed.isEstimatedTrafficShare ? '(estimated)' : '(provided)'}</span>
              <span>Impact Factor: {(impact.assumptionsUsed.impactFactor * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AssumptionRow({ label, value, estimated }: { label: string; value: string; estimated: boolean }) {
  return (
    <div style={{
      padding: '0.6rem 0.75rem', borderRadius: 8,
      border: `1px solid ${estimated ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
      background: estimated ? 'rgba(251,191,36,0.04)' : 'transparent',
    }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {value}
        {estimated && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24' }}>ESTIMATED</span>}
      </div>
    </div>
  )
}
