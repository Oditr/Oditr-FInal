'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Mail, MessageSquare, Hash, Settings2,
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp,
  Shield, Zap, AlertTriangle,
} from 'lucide-react'

interface AlertConfig {
  emailEnabled: boolean
  emailTo: string
  slackEnabled: boolean
  slackWebhookUrl: string
  discordEnabled: boolean
  discordWebhookUrl: string
  scoreDropThreshold: number
}

interface MonitoringSetupProps {
  userId: string
  projectId?: string
}

const DEFAULT_CONFIG: AlertConfig = {
  emailEnabled: false,
  emailTo: '',
  slackEnabled: false,
  slackWebhookUrl: '',
  discordEnabled: false,
  discordWebhookUrl: '',
  scoreDropThreshold: 5,
}

export default function MonitoringSetup({ userId, projectId }: MonitoringSetupProps) {
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<'email' | 'slack' | 'discord' | null>('email')

  // Load existing config
  useEffect(() => {
    if (!userId) return
    const params = new URLSearchParams({ userId })
    if (projectId) params.set('projectId', projectId)
    fetch(`/api/v1/monitoring/schedule?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.configs && data.configs.length > 0) {
          const c = data.configs[0]
          setConfig({
            emailEnabled: c.email_enabled ?? false,
            emailTo: c.email_to ?? '',
            slackEnabled: c.slack_enabled ?? false,
            slackWebhookUrl: c.slack_webhook_url ?? '',
            discordEnabled: c.discord_enabled ?? false,
            discordWebhookUrl: c.discord_webhook_url ?? '',
            scoreDropThreshold: c.score_drop_threshold ?? 5,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, projectId])

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/v1/monitoring/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          projectId: projectId || null,
          ...config,
        }),
      })
      const data = await res.json()
      setSaveResult(data.success ? 'success' : 'error')
    } catch {
      setSaveResult('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveResult(null), 3000)
    }
  }

  const update = (patch: Partial<AlertConfig>) => setConfig(prev => ({ ...prev, ...patch }))
  const toggle = (section: typeof expandedSection) =>
    setExpandedSection(prev => prev === section ? null : section)

  const enabledCount = [config.emailEnabled, config.slackEnabled, config.discordEnabled].filter(Boolean).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem', color: 'var(--text-muted)' }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.85rem' }}>Loading alert configuration…</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(52,211,153,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={18} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Score Regression Alerts</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Get notified immediately when your audit scores drop
            </div>
          </div>
          {enabledCount > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.7rem', fontWeight: 700,
              padding: '0.2rem 0.6rem', borderRadius: 20,
              background: 'rgba(52,211,153,0.1)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.2)',
            }}>
              {enabledCount} channel{enabledCount > 1 ? 's' : ''} active
            </span>
          )}
        </div>

        {/* Threshold */}
        <div style={{
          background: 'var(--bg)', borderRadius: 10, padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 200 }}>
            <AlertTriangle size={14} color="#fbbf24" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Alert when score drops by</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {[3, 5, 10, 15].map(val => (
              <button
                key={val}
                onClick={() => update({ scoreDropThreshold: val })}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 6,
                  border: config.scoreDropThreshold === val
                    ? '1px solid rgba(129,140,248,0.6)'
                    : '1px solid var(--border)',
                  background: config.scoreDropThreshold === val
                    ? 'rgba(129,140,248,0.12)'
                    : 'var(--bg-card)',
                  color: config.scoreDropThreshold === val ? '#818cf8' : 'var(--text-secondary)',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                ≥{val} pts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Email Channel */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <button
          onClick={() => toggle('email')}
          style={{
            width: '100%', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(129,140,248,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={15} color="#818cf8" />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Email Alerts</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>via Resend — requires RESEND_API_KEY</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
            <div style={{
              position: 'relative', width: 36, height: 20, borderRadius: 10,
              background: config.emailEnabled ? '#818cf8' : 'var(--border)',
              transition: 'background 200ms', cursor: 'pointer',
            }} onClick={() => update({ emailEnabled: !config.emailEnabled })}>
              <div style={{
                position: 'absolute', top: 2, left: config.emailEnabled ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 200ms',
              }} />
            </div>
          </label>
          {expandedSection === 'email' ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </button>

        {expandedSection === 'email' && config.emailEnabled && (
          <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Alert Email Address
            </label>
            <input
              type="email"
              value={config.emailTo}
              onChange={e => update({ emailTo: e.target.value })}
              placeholder="you@company.com"
              style={{
                width: '100%', padding: '0.6rem 0.85rem',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)',
                fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}
        {expandedSection === 'email' && !config.emailEnabled && (
          <div style={{ padding: '0.5rem 1.25rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Enable email alerts to receive HTML reports when your scores drop.
          </div>
        )}
      </div>

      {/* Slack Channel */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <button
          onClick={() => toggle('slack')}
          style={{
            width: '100%', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(52,211,153,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={15} color="#34d399" />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Slack Alerts</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Incoming Webhook — rich Block Kit messages</div>
          </div>
          <div style={{
            position: 'relative', width: 36, height: 20, borderRadius: 10,
            background: config.slackEnabled ? '#34d399' : 'var(--border)',
            transition: 'background 200ms', cursor: 'pointer',
            flexShrink: 0,
          }} onClick={e => { e.stopPropagation(); update({ slackEnabled: !config.slackEnabled }) }}>
            <div style={{
              position: 'absolute', top: 2, left: config.slackEnabled ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 200ms',
            }} />
          </div>
          {expandedSection === 'slack' ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </button>

        {expandedSection === 'slack' && (
          <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
            {config.slackEnabled ? (
              <>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                  Slack Incoming Webhook URL
                </label>
                <input
                  type="url"
                  value={config.slackWebhookUrl}
                  onChange={e => update({ slackWebhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  style={{
                    width: '100%', padding: '0.6rem 0.85rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)',
                    fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <p style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Create a webhook at slack.com/apps → Incoming Webhooks → Add to Slack
                </p>
              </>
            ) : (
              <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Enable Slack alerts to post Block Kit messages to a channel when scores drop.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Discord Channel */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <button
          onClick={() => toggle('discord')}
          style={{
            width: '100%', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(96,165,250,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Hash size={15} color="#60a5fa" />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Discord Alerts</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Channel Webhook — color-coded severity embeds</div>
          </div>
          <div style={{
            position: 'relative', width: 36, height: 20, borderRadius: 10,
            background: config.discordEnabled ? '#60a5fa' : 'var(--border)',
            transition: 'background 200ms', cursor: 'pointer',
            flexShrink: 0,
          }} onClick={e => { e.stopPropagation(); update({ discordEnabled: !config.discordEnabled }) }}>
            <div style={{
              position: 'absolute', top: 2, left: config.discordEnabled ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 200ms',
            }} />
          </div>
          {expandedSection === 'discord' ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </button>

        {expandedSection === 'discord' && (
          <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
            {config.discordEnabled ? (
              <>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                  Discord Webhook URL
                </label>
                <input
                  type="url"
                  value={config.discordWebhookUrl}
                  onChange={e => update({ discordWebhookUrl: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{
                    width: '100%', padding: '0.6rem 0.85rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)',
                    fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <p style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  In Discord: Channel Settings → Integrations → Webhooks → New Webhook → Copy URL
                </p>
              </>
            ) : (
              <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Enable Discord alerts to post color-coded embeds to a channel when scores drop.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.65rem 1.5rem',
            background: saving ? 'var(--bg-card)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 700, fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            opacity: saving ? 0.7 : 1, transition: 'opacity 200ms',
          }}
        >
          {saving ? (
            <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
          ) : (
            <><Settings2 size={15} /> Save Alert Config</>
          )}
        </button>

        {saveResult === 'success' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#34d399' }}>
            <CheckCircle size={14} /> Saved
          </span>
        )}
        {saveResult === 'error' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#f87171' }}>
            <XCircle size={14} /> Save failed
          </span>
        )}
      </div>

      {/* Info footer */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'rgba(129,140,248,0.04)',
        borderRadius: 10, border: '1px solid rgba(129,140,248,0.1)',
        fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>How alerts work:</strong> After each scheduled audit completes, Øditr compares the new scores against your previous scan. If any category drops by more than your threshold, alerts are dispatched to all enabled channels within seconds.
      </div>
    </div>
  )
}
