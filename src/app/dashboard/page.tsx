'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, AlertTriangle, ArrowRight, Terminal, Globe, Wifi, Smartphone, Monitor, MapPin, GitCompare, Zap, BarChart3, Eye, ShieldCheck, Shield, Star, ExternalLink, RefreshCw, CheckCircle, XCircle, Clock, WifiOff, Timer, Ban, AlertCircle, Share2, Link2, Rocket, Download, Lock, Sparkles } from 'lucide-react'
import ScoreRing from '@/components/ScoreRing'
import Link from 'next/link'
import type { AuditResult } from './types'
import { scoreColor, fieldCatColor } from './utils'
import OverviewTab from './OverviewTab'
import OpportunitiesTab from './OpportunitiesTab'
import DiagnosticsTab from './DiagnosticsTab'
import FieldDataTab from './FieldDataTab'
import SiteAuditTab from './SiteAuditTab'
import IntelligenceTab from './IntelligenceTab'
import HistoryTab from './HistoryTab'
import AnalyticsTab from './AnalyticsTab'
import { saveScan, getHistory } from '@/lib/scan-store'
import { useAuth } from '@/components/AuthProvider'
import { useSyncLocalData } from '@/hooks/useSyncLocalData'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useFlag } from '@/hooks/useFeatureFlag'

import LeadCaptureModal from '@/components/LeadCaptureModal'
import AuthModal from '@/components/AuthModal'
import AuditReminder from '@/components/AuditReminder'
import {
  executeAuditRequest, classifyError, getStageForElapsed, debounce,
  type AuditStageInfo, type AuditError, type ErrorCategory,
} from '@/lib/request-engine'
import { generatePdfReport } from '@/lib/pdf-export'

const connections = ['4G (Fast)', '4G (Slow)', '3G', 'Cable']
const locations = ['US East (Virginia)', 'EU West (London)', 'Asia (Singapore)', 'AU (Sydney)']

const LEGACY_STORAGE_KEY = 'vitalfix-last-audit'

// Stage icon colors for progress indicator
const STAGE_COLORS: Record<string, string> = {
  connecting: '#60a5fa', fetching: '#818cf8', analyzing: '#a78bfa',
  auditing: '#34d399', finalizing: '#fbbf24', retrying: '#f87171',
  done: '#34d399', error: '#f87171',
}

// Error category icons
const ERROR_ICONS: Record<ErrorCategory, any> = {
  timeout: Timer, network: WifiOff, server: AlertCircle,
  rate_limit: Ban, invalid_url: XCircle, unknown: AlertTriangle,
}

export default function DashboardPage() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [prevResult, setPrevResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [location, setLocation] = useState('US East (Virginia)')
  const [connection, setConnection] = useState('4G (Fast)')
  const [runCount, setRunCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'intelligence' | 'overview' | 'opportunities' | 'diagnostics' | 'field' | 'siteaudit' | 'history' | 'analytics'>('intelligence')

  // Progress tracking state
  const [elapsed, setElapsed] = useState(0)
  const [currentStage, setCurrentStage] = useState<AuditStageInfo | null>(null)
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; max: number; waitMs: number } | null>(null)
  const [auditError, setAuditError] = useState<AuditError | null>(null)
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Growth system state
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const { user, plan, quotaUsed, quotaLimit, quotaRemaining } = useAuth()
  useSyncLocalData()
  const { trackPageView, trackFeature } = useAnalytics()

  // Feature flags for growth components
  const leadCaptureEnabled = useFlag('lead-capture-enabled')
  const auditReminderEnabled = useFlag('audit-reminder-enabled')
  // If PostHog is not configured, default to showing everything (existing behavior)
  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY

  // Track page view on mount
  useEffect(() => { trackPageView('/dashboard') }, [trackPageView])

  // Restore last audit result from localStorage on mount
  useEffect(() => {
    (async () => {
      try {
        // Try new history system first
        const history = await getHistory(user?.id)
        if (history.length > 0) {
          // We only have summary data in history, try legacy key for full result
          const saved = localStorage.getItem(LEGACY_STORAGE_KEY)
          if (saved) {
            const parsed = JSON.parse(saved)
            if (parsed.result) {
              setResult(parsed.result)
              setUrl(parsed.url || parsed.result.url || '')
              setRunCount(1)
            }
          }
        }
      } catch { /* localStorage unavailable or corrupted — ignore */ }
    })()
  }, [user?.id])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (elapsedTimer.current) clearInterval(elapsedTimer.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Stage-based progress: update from elapsed timer
  useEffect(() => {
    if (!loading) return
    const stageInfo = getStageForElapsed(elapsed)
    // Don't overwrite retry stage from engine callback
    setCurrentStage(prev => {
      if (prev?.stage === 'retrying') return prev
      return stageInfo
    })
  }, [elapsed, loading])

  const startProgressTimer = useCallback(() => {
    setElapsed(0)
    if (elapsedTimer.current) clearInterval(elapsedTimer.current)
    elapsedTimer.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
  }, [])

  const stopProgressTimer = useCallback(() => {
    if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current)
      elapsedTimer.current = null
    }
  }, [])

  const runAudit = useCallback(async () => {
    if (!url.trim()) return
    let targetUrl = url.trim()
    if (!/^https?:\/\//.test(targetUrl)) targetUrl = 'https://' + targetUrl

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort()

    setLoading(true)
    setError(null)
    setAuditError(null)
    setPrevResult(result)
    setResult(null)
    setActiveTab('intelligence')
    setRetryInfo(null)
    setCurrentStage({ stage: 'connecting', label: 'Connecting', detail: 'Starting audit…', progress: 5 })
    startProgressTimer()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const data = await executeAuditRequest(
        { url: targetUrl, device, connection, location },
        {
          onStageChange: (stage) => setCurrentStage(stage),
          onRetry: (attempt, max, waitMs) => {
            setRetryInfo({ attempt, max, waitMs })
            setCurrentStage({
              stage: 'retrying',
              label: `Retry ${attempt}/${max}`,
              detail: `Waiting ${(waitMs / 1000).toFixed(1)}s before retrying…`,
              progress: 5,
            })
          },
        },
        controller.signal,
      )

      setResult(data)
      setRunCount(c => c + 1)
      setRetryInfo(null)

      // Show lead capture modal for anonymous users (after short delay)
      if (!user) {
        setTimeout(() => setShowLeadCapture(true), 2000)
      }

      // Save to scan history + persist
      try {
        saveScan(data, user?.id)
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ result: data, url: targetUrl }))
      } catch { /* quota exceeded */ }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — don't show error
      } else {
        const classified = err.category ? err as AuditError : classifyError(err)
        setAuditError(classified)
        setError(classified.message)
      }
    } finally {
      stopProgressTimer()
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, device, connection, location, result, user?.id])

  // Debounced handler for Enter key (prevents rapid double-submit)
  const debouncedRunAudit = useMemo(() => debounce(() => runAudit(), 300), [runAudit])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedRunAudit.cancel()
  }, [debouncedRunAudit])

  const delta = (curr: number, prev: number) => {
    const d = curr - prev
    const color = d > 0 ? '#34d399' : d < 0 ? '#f87171' : 'var(--text-muted)'
    return { label: d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '—', color }
  }

  // Format elapsed time as Xm Ys or just Xs
  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <section style={{ padding: '4rem 0 2.5rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-accent">Performance Dashboard</span>
            <span className="badge badge-green">⚡ Real Lighthouse</span>

            {/* Plan badge */}
            {user && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700,
                background: plan === 'pro' ? 'rgba(129,140,248,0.12)' : plan === 'enterprise' ? 'rgba(96,165,250,0.12)' : plan === 'starter' ? 'rgba(56,189,248,0.12)' : 'rgba(52,211,153,0.12)',
                color: plan === 'pro' ? '#818cf8' : plan === 'enterprise' ? '#60a5fa' : plan === 'starter' ? '#38bdf8' : '#34d399',
                border: `1px solid ${plan === 'pro' ? 'rgba(129,140,248,0.25)' : plan === 'enterprise' ? 'rgba(96,165,250,0.25)' : plan === 'starter' ? 'rgba(56,189,248,0.25)' : 'rgba(52,211,153,0.25)'}`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {plan === 'pro' && <Star size={10} fill="#818cf8" />}
                {plan === 'enterprise' && <Shield size={10} />}
                {plan === 'starter' && <Rocket size={10} />}
                {plan} plan
              </span>
            )}

            {/* Quota counter (free users only) */}
            {user && quotaLimit > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 600,
                background: quotaRemaining === 0 ? 'rgba(248,113,113,0.1)' : quotaRemaining <= 1 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                color: quotaRemaining === 0 ? '#f87171' : quotaRemaining <= 1 ? '#fbbf24' : 'var(--text-muted)',
                border: `1px solid ${quotaRemaining === 0 ? 'rgba(248,113,113,0.25)' : quotaRemaining <= 1 ? 'rgba(251,191,36,0.25)' : 'var(--border)'}`,
              }}>
                {quotaUsed}/{quotaLimit} audits used today
              </span>
            )}

            {/* Unlimited badge (pro/enterprise) */}
            {user && quotaLimit === -1 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 600,
                background: 'rgba(129,140,248,0.08)', color: '#818cf8',
                border: '1px solid rgba(129,140,248,0.2)',
              }}>
                ∞ Unlimited audits
              </span>
            )}
          </div>
          <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
            Real-Time <span className="gradient-text">Lighthouse Audit</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 540, lineHeight: 1.6 }}>
            Enter any URL to run a live audit — real scores, real CWV data, real opportunities.
          </p>

          {/* Upgrade prompt when quota is nearly/fully exhausted */}
          {user && quotaLimit > 0 && quotaRemaining <= 1 && (
            <div style={{
              marginTop: '0.75rem', padding: '0.6rem 1rem', borderRadius: 10,
              background: quotaRemaining === 0 ? 'rgba(248,113,113,0.06)' : 'rgba(251,191,36,0.06)',
              border: `1px solid ${quotaRemaining === 0 ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
              display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {quotaRemaining === 0
                  ? '🚫 Daily audit limit reached.'
                  : '⚠️ 1 audit remaining today.'}
              </span>
              <Link href="/pricing" style={{
                fontSize: '0.78rem', fontWeight: 700, color: '#818cf8',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              }}>
                {plan === 'free' ? 'Upgrade to Starter for 25/day' : 'Upgrade to Pro for unlimited'} <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        {/* ── Input panel ── */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderColor: loading ? 'rgba(129,140,248,0.25)' : 'var(--border)', transition: 'border-color 200ms' }}>
          {/* URL + Run */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <Globe size={15} color="var(--text-muted)" />
              <input
                id="url-input"
                type="text"
                placeholder="example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') debouncedRunAudit() }}
                disabled={loading}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: "'JetBrains Mono', monospace", opacity: loading ? 0.5 : 1 }}
              />
            </div>

            {/* Device toggle */}
            <div style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              {(['mobile', 'desktop'] as const).map(d => (
                <button key={d} onClick={() => setDevice(d)} disabled={loading} style={{ padding: '0.4rem 0.7rem', borderRadius: 6, cursor: 'pointer', border: 'none', fontSize: '0.78rem', fontWeight: 500, background: device === d ? 'var(--bg-card)' : 'transparent', color: device === d ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 150ms' }}>
                  {d === 'mobile' ? <Smartphone size={13} /> : <Monitor size={13} />}
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            <button id="run-audit-btn" onClick={runAudit} disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.85 : 1, minWidth: 110 }}>
              {loading ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Search size={14} />}
              {loading ? 'Running…' : 'Run Audit'}
            </button>
          </div>

          {/* Location + Connection */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={12} color="var(--text-muted)" />
              <select value={location} onChange={e => setLocation(e.target.value)} disabled={loading} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {locations.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Wifi size={12} color="var(--text-muted)" />
              <select value={connection} onChange={e => setConnection(e.target.value)} disabled={loading} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {connections.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <span className="text-label" style={{ marginLeft: 'auto' }}>PageSpeed Insights API</span>
          </div>
        </div>

        {/* ── Loading state with live progress ── */}
        {loading && (
          <div style={{ padding: '3rem 1.5rem' }}>
            {/* Multi-stage progress indicator */}
            <div style={{ marginBottom: '1.5rem' }}>
              {/* Stage dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                {['connecting', 'fetching', 'analyzing', 'auditing', 'finalizing'].map((stage, i) => {
                  const stages = ['connecting', 'fetching', 'analyzing', 'auditing', 'finalizing']
                  const currentIdx = stages.indexOf(currentStage?.stage || 'connecting')
                  const isActive = i === currentIdx
                  const isComplete = i < currentIdx
                  const isRetrying = currentStage?.stage === 'retrying'
                  return (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <div style={{
                        width: isActive ? 10 : 8, height: isActive ? 10 : 8, borderRadius: '50%',
                        background: isRetrying ? '#f87171' : isComplete ? '#34d399' : isActive ? (STAGE_COLORS[stage] || 'var(--accent)') : 'var(--border)',
                        transition: 'all 300ms', flexShrink: 0,
                        boxShadow: isActive ? `0 0 8px ${STAGE_COLORS[stage] || 'var(--accent)'}50` : 'none',
                        animation: isActive ? 'pulse-glow 2s ease infinite' : 'none',
                      }} />
                      {i < 4 && (
                        <div style={{
                          flex: 1, height: 2, borderRadius: 1,
                          background: isComplete ? '#34d399' : 'var(--border)',
                          transition: 'background 300ms',
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: currentStage?.stage === 'retrying'
                    ? 'linear-gradient(90deg, #f87171, #fbbf24)'
                    : 'linear-gradient(90deg, var(--accent), #60a5fa, #34d399)',
                  width: `${currentStage?.progress || 5}%`,
                  transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>
            </div>

            {/* Stage label + elapsed */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={13} style={{ animation: 'spin 1.5s linear infinite', color: STAGE_COLORS[currentStage?.stage || 'connecting'] }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentStage?.label || 'Starting'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {currentStage?.detail || 'Initializing audit…'}
                  </div>
                </div>
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.82rem', fontWeight: 700,
                color: elapsed > 60 ? '#fbbf24' : elapsed > 30 ? '#60a5fa' : 'var(--text-muted)',
                padding: '0.2rem 0.6rem', borderRadius: 6,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                {formatElapsed(elapsed)}
              </span>
            </div>

            {/* Retry banner */}
            {retryInfo && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem',
                background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                animation: 'fadeIn 300ms ease-out',
              }}>
                <RefreshCw size={14} color="#f87171" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Retry {retryInfo.attempt}/{retryInfo.max} — waiting {(retryInfo.waitMs / 1000).toFixed(1)}s before retrying with exponential backoff…
                </span>
              </div>
            )}

            {/* Info banner for long audits */}
            {elapsed > 20 && !retryInfo && (
              <div style={{
                padding: '0.85rem 1.1rem', borderRadius: 10, marginBottom: '1.5rem',
                background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                animation: 'fadeIn 300ms ease-out',
              }}>
                <AlertTriangle size={14} color="#60a5fa" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {elapsed > 60
                    ? 'Still working — Google\'s PageSpeed API is slow for complex pages. We\'ll return partial results if PSI times out.'
                    : 'Google\'s PageSpeed Insights API can take 30-90 seconds for complex pages. Please wait…'
                  }
                </span>
              </div>
            )}

            {/* Skeleton cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton" style={{ height: 80 }} />
              ))}
            </div>
            <div className="skeleton" style={{ height: 200, marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: 120 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: '1.5rem' }}>
              Running Lighthouse + Site Audit for <strong style={{ color: 'var(--accent)' }}>{url}</strong> · {device}
            </p>
          </div>
        )}

        {/* ── Error state ── */}
        {(error || auditError) && !loading && (() => {
          const err = auditError || classifyError(new Error(error || ''))
          const IconComponent = ERROR_ICONS[err.category] || AlertTriangle
          const categoryColors: Record<ErrorCategory, string> = {
            timeout: '#fbbf24', network: '#f87171', server: '#60a5fa',
            rate_limit: '#818cf8', invalid_url: '#f87171', unknown: '#f87171',
          }
          const color = categoryColors[err.category] || '#f87171'

          return (
            <div style={{ padding: '1.5rem', borderRadius: 12, background: `${color}08`, border: `1px solid ${color}30`, marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconComponent size={18} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <p style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>Audit Failed</p>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                      padding: '0.1rem 0.4rem', borderRadius: 4,
                      background: `${color}15`, color, letterSpacing: '0.04em',
                    }}>
                      {err.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{err.message}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                    {err.hint}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {err.retryable && (
                  <button onClick={runAudit} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
                    <RefreshCw size={13} /> Retry
                  </button>
                )}
                {device === 'mobile' ? (
                  <button onClick={() => { setDevice('desktop'); setTimeout(runAudit, 100) }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
                    <Monitor size={13} /> Try Desktop
                  </button>
                ) : (
                  <button onClick={() => { setDevice('mobile'); setTimeout(runAudit, 100) }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
                    <Smartphone size={13} /> Try Mobile
                  </button>
                )}
                {prevResult && (
                  <button onClick={() => { setError(null); setAuditError(null); setResult(prevResult) }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
                    View Previous Result
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Results ── */}
        {result && !loading && (
          <div className="animate-fade-up">
            {/* Partial results banner */}
            {result.partial && (
              <div style={{
                padding: '0.85rem 1.1rem', borderRadius: 10, marginBottom: '1.25rem',
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
              }}>
                <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fbbf24' }}>Partial results:</strong>{' '}
                  {!result.scores
                    ? 'PageSpeed Insights data unavailable — showing custom audit only.'
                    : result.liteMode
                    ? 'PSI fell back to performance-only mode (full request timed out). Accessibility, Best Practices, and SEO scores are unavailable.'
                    : 'Custom audit data unavailable — showing Lighthouse only.'}
                  {result.partialReason && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Reason: {result.partialReason}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Meta bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <CheckCircle size={16} color="#34d399" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Audited: <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{result.url}</strong>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {result.strategy}{result.lighthouseVersion ? ` · Lighthouse ${result.lighthouseVersion}` : ''} · {new Date(result.fetchedAt).toLocaleTimeString()}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={async () => {
                    setShareLoading(true)
                    setShareSuccess(false)
                    try {
                      const res = await fetch('/api/report/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          url: result.url,
                          strategy: result.strategy,
                          healthScore: result.healthScore,
                          scores: result.scores,
                          cwvSummary: result.cwv,
                          topIssues: result.opportunities?.slice(0, 5),
                          customAudit: result.customAudit,
                        }),
                      })
                      const data = await res.json()
                      if (data.reportUrl) {
                        await navigator.clipboard.writeText(data.reportUrl)
                        setShareSuccess(true)
                        setTimeout(() => setShareSuccess(false), 3000)
                      }
                    } catch { /* ignore */ }
                    setShareLoading(false)
                  }}
                  disabled={shareLoading}
                  className="btn-ghost"
                  id="share-report-btn"
                  style={{
                    fontSize: '0.78rem', fontWeight: 600, padding: '0.25rem 0.5rem',
                    color: shareSuccess ? '#34d399' : 'var(--accent)',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  {shareSuccess ? <><Link2 size={12} /> Copied!</> : shareLoading ? <><RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Sharing…</> : <><Share2 size={12} /> Share</>}
                </button>
                <button
                  onClick={() => {
                    if (plan === 'free') {
                      alert('PDF export is available on Starter ($5/mo) and above. Visit /pricing to upgrade.')
                      return
                    }
                    generatePdfReport(result)
                    trackFeature('pdf_export')
                  }}
                  className="btn-ghost"
                  id="export-pdf-btn"
                  style={{
                    fontSize: '0.78rem', fontWeight: 600, padding: '0.25rem 0.5rem',
                    color: plan === 'free' ? 'var(--text-muted)' : 'var(--accent)',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  {plan === 'free' ? <><Lock size={12} /> PDF (Starter+)</> : <><Download size={12} /> Export PDF</>}
                </button>
                <a href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(result.url)}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                  View on PSI <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* ── Health Score hero (combined) ── */}
            {result.healthScore !== undefined && (
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(129,140,248,0.06))', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <ShieldCheck size={16} color="#34d399" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Overall Health Score</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                    Lighthouse + Site Audit
                  </span>
                  {result.fromCache && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', marginLeft: '0.25rem' }}>Cached</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <ScoreRing score={result.healthScore} size={130} color={scoreColor(result.healthScore)} label="Health" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Lighthouse: <strong style={{ color: scoreColor(result.scores?.performance ?? 0) }}>{result.scores?.performance ?? '—'}</strong> (60%)</span>
                  <span>Site Audit: <strong style={{ color: scoreColor(result.customAudit?.overallScore ?? 0) }}>{result.customAudit?.overallScore ?? '—'}</strong> (40%)</span>
                </div>
                {result.customAudit && result.customAudit.totalFindings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                    {result.customAudit.critical > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>{result.customAudit.critical} Critical</span>}
                    {result.customAudit.moderate > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>{result.customAudit.moderate} Moderate</span>}
                    {result.customAudit.minor > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>{result.customAudit.minor} Minor</span>}
                  </div>
                )}
              </div>
            )}

            {/* ── Performance Score — HERO (only shown when PSI data available) ── */}
            {result.scores && (
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', background: 'linear-gradient(160deg, rgba(129,140,248,0.06), transparent)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Zap size={16} color="#818cf8" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Lighthouse Performance Score</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                  Lab Data
                </span>
              </div>

              {/* Large Performance Ring */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <ScoreRing score={result.scores.performance} size={150} color={scoreColor(result.scores.performance)} label="Performance" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
                Lab score from Google Lighthouse ({result.strategy}) — simulated page load in a controlled environment. <strong style={{ color: 'var(--text-secondary)' }}>This is the same engine used by PageSpeed Insights.</strong>
              </p>

              {/* Other 3 scores — smaller, below */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {([
                  { label: 'Accessibility', val: result.scores.accessibility },
                  { label: 'Best Practices', val: result.scores.bestPractices },
                  { label: 'SEO', val: result.scores.seo },
                ]).map(s => (
                  <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <ScoreRing score={s.val} size={70} color={scoreColor(s.val)} label="" />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* ── Lab vs Field explainer — shown when CrUX data exists ── */}
            {result.fieldData && (
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={16} color="#a78bfa" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lab Score vs Real-User Data</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Lab (Lighthouse)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor(result.scores?.performance ?? 0), fontFamily: 'JetBrains Mono, monospace' }}>{result.scores?.performance ?? '—'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Simulated · Single run</div>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Field (CrUX)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: fieldCatColor(result.fieldData.overallCategory), fontFamily: 'JetBrains Mono, monospace' }}>{result.fieldData.overallCategory}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real users · 28-day avg</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Why do scores differ?</strong> Lab data is a single simulated test. Field data (Chrome UX Report) reflects real user experiences over 28 days. Tools like DebugBear, Search Console, and CrUX dashboards show <em>field</em> data. Lighthouse and PageSpeed Insights primarily show <em>lab</em> data. Both are important — lab data helps debug, field data reflects reality.
                </p>
              </div>
            )}

            {/* ── Before/After comparison ── */}
            {prevResult && prevResult.scores && result.scores && (
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'rgba(129,140,248,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <GitCompare size={16} color="#818cf8" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Before vs After</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Run #{runCount - 1} → Run #{runCount}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  {([
                    { label: 'Performance', prev: prevResult.scores.performance, curr: result.scores.performance },
                    { label: 'Accessibility', prev: prevResult.scores.accessibility, curr: result.scores.accessibility },
                    { label: 'Best Practices', prev: prevResult.scores.bestPractices, curr: result.scores.bestPractices },
                    { label: 'SEO', prev: prevResult.scores.seo, curr: result.scores.seo },
                  ]).map(row => {
                    const d = delta(row.curr, row.prev)
                    return (
                      <div key={row.label} style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{row.label}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{row.prev}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800 }}>{row.curr}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: d.color, marginTop: '0.25rem' }}>{d.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Tab navigation — underline style ── */}
            <div id="tab-navigation" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
              {([
                { id: 'intelligence', label: `Intelligence (${result.intelligence?.totalIssues ?? 0})`, icon: <Sparkles size={13} /> },
                { id: 'overview', label: 'Core Web Vitals', icon: <BarChart3 size={13} /> },
                { id: 'siteaudit', label: `Site Audit (${result.customAudit?.totalFindings ?? 0})`, icon: <ShieldCheck size={13} /> },
                { id: 'opportunities', label: `Opportunities (${result.opportunities?.length ?? 0})`, icon: <Zap size={13} /> },
                { id: 'diagnostics', label: 'Diagnostics', icon: <Eye size={13} /> },
                { id: 'field', label: 'Field Data', icon: <Star size={13} /> },
                { id: 'history', label: 'History', icon: <Clock size={13} /> },
                { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={13} /> },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`tab-underline${activeTab === t.id ? ' active' : ''}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            {activeTab === 'intelligence' && <IntelligenceTab result={result} />}
            {activeTab === 'overview' && <OverviewTab result={result} />}
            {activeTab === 'opportunities' && <OpportunitiesTab result={result} />}
            {activeTab === 'diagnostics' && <DiagnosticsTab result={result} />}
            {activeTab === 'field' && <FieldDataTab result={result} />}
            {activeTab === 'siteaudit' && <SiteAuditTab result={result} />}
            {activeTab === 'history' && <HistoryTab currentUrl={result.url} />}
            {activeTab === 'analytics' && <AnalyticsTab />}

            {/* ── CTA ── */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <Link href="/library" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                Get Fix Code <ArrowRight size={16} />
              </Link>
              <Link href="/checklist" className="btn-secondary" style={{ textDecoration: 'none' }}>Run Full Checklist</Link>
            </div>
          </div>
        )}

        {/* ── Lead Capture Modal (anonymous users after audit) ── */}
        {result && !loading && !user && showLeadCapture && (!posthogConfigured || leadCaptureEnabled) && (
          <LeadCaptureModal
            url={result.url}
            healthScore={result.healthScore}
            onClose={() => setShowLeadCapture(false)}
            onSignUp={() => setShowAuthModal(true)}
          />
        )}

        {/* ── Auth Modal (triggered from lead capture) ── */}
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}

        {/* ── Audit Reminder (returning users) ── */}
        {!result && !loading && !error && user && (!posthogConfigured || auditReminderEnabled) && (
          <AuditReminder onRunAudit={(reminderUrl) => { setUrl(reminderUrl); setTimeout(runAudit, 100) }} />
        )}

        {/* ── How to run a real audit (shown when no result yet) ── */}
        {!result && !loading && !error && (
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              Other Ways to Audit
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Terminal size={16} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lighthouse CLI</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', padding: '0.75rem 1rem', borderRadius: 8, background: '#0d0d14', color: '#c9d1d9', lineHeight: 1.7 }}>
                  <div><span style={{ color: '#34d399' }}>$</span> npx lighthouse https://your-site.com \</div>
                  <div>&nbsp;&nbsp;--preset=desktop --output=html</div>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Search size={16} color="#60a5fa" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>PageSpeed Insights</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Visit <a href="https://pagespeed.web.dev" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontWeight: 600 }}>pagespeed.web.dev</a> for both field data (CrUX) and lab data in one report.
                </p>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Wifi size={16} color="#fbbf24" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>WebPageTest</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <a href="https://www.webpagetest.org" target="_blank" rel="noreferrer" style={{ color: '#fbbf24', fontWeight: 600 }}>webpagetest.org</a> — waterfall charts, filmstrip, multi-location testing.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
