'use client'
import { useState } from 'react'
import type { BusinessProfile, ImportantPage, BusinessType, ConversionGoal, FunnelStage, BusinessCriticality } from '@/lib/revenue-impact'
import { Building2, Globe, DollarSign, Users, Target, Plus, Trash2, ChevronDown, Info } from 'lucide-react'

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'agency', label: 'Agency' },
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'blog', label: 'Blog / Content' },
  { value: 'portfolio', label: 'Portfolio / Service' },
  { value: 'other', label: 'Other' },
]

const CONVERSION_GOALS: { value: ConversionGoal; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'lead_submission', label: 'Lead Form Submission' },
  { value: 'signup', label: 'Signup' },
  { value: 'demo_booking', label: 'Demo Booking' },
  { value: 'contact_request', label: 'Contact Request' },
  { value: 'newsletter', label: 'Newsletter Signup' },
  { value: 'trial_start', label: 'Trial Start' },
  { value: 'custom', label: 'Custom Goal' },
]

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD']

const PAGE_TYPES = ['Homepage', 'Pricing', 'Product', 'Checkout', 'Signup', 'Contact', 'Demo', 'Landing', 'Blog', 'Custom']
const FUNNEL_STAGES: { value: FunnelStage; label: string }[] = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'retention', label: 'Retention' },
]
const CRITICALITIES: { value: BusinessCriticality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
  background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontSize: '0.82rem',
  fontFamily: "'JetBrains Mono', monospace", outline: 'none',
  transition: 'border-color 150ms',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', appearance: 'none' as any,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700,
  color: 'var(--text-secondary)', marginBottom: '0.35rem',
  letterSpacing: '0.02em',
}

interface Props {
  initialProfile?: Partial<BusinessProfile>
  onSave: (profile: BusinessProfile) => void
  saving?: boolean
}

export default function BusinessProfileForm({ initialProfile, onSave, saving }: Props) {
  const [businessType, setBusinessType] = useState<BusinessType>(initialProfile?.businessType || 'other')
  const [currency, setCurrency] = useState(initialProfile?.currency || 'USD')
  const [conversionGoal, setConversionGoal] = useState<ConversionGoal>(initialProfile?.primaryConversionGoal || 'purchase')
  const [monthlyVisitors, setMonthlyVisitors] = useState(initialProfile?.monthlyVisitors?.toString() || '')
  const [monthlySessions, setMonthlySessions] = useState(initialProfile?.monthlySessions?.toString() || '')
  const [conversionRate, setConversionRate] = useState(
    initialProfile?.conversionRate ? (initialProfile.conversionRate * 100).toString() : ''
  )
  const [aov, setAov] = useState(initialProfile?.averageOrderValue?.toString() || '')
  const [leadValue, setLeadValue] = useState(initialProfile?.averageLeadValue?.toString() || '')
  const [customerValue, setCustomerValue] = useState(initialProfile?.averageCustomerValue?.toString() || '')
  const [trialToPaid, setTrialToPaid] = useState(
    initialProfile?.trialToPaidRate ? (initialProfile.trialToPaidRate * 100).toString() : ''
  )
  const [importantPages, setImportantPages] = useState<ImportantPage[]>(initialProfile?.importantPages || [])
  const [showPages, setShowPages] = useState(false)

  const isSaas = businessType === 'saas'
  const isLead = businessType === 'lead_generation' || businessType === 'agency'
  const isEcommerce = businessType === 'ecommerce' || businessType === 'marketplace'

  const handleSubmit = () => {
    const profile: BusinessProfile = {
      projectId: initialProfile?.projectId || 'default',
      userId: initialProfile?.userId,
      businessType,
      currency,
      monthlyVisitors: monthlyVisitors ? Number(monthlyVisitors) : null,
      monthlySessions: monthlySessions ? Number(monthlySessions) : null,
      conversionRate: conversionRate ? Number(conversionRate) / 100 : null,
      averageOrderValue: aov ? Number(aov) : null,
      averageLeadValue: leadValue ? Number(leadValue) : null,
      averageCustomerValue: customerValue ? Number(customerValue) : null,
      trialToPaidRate: trialToPaid ? Number(trialToPaid) / 100 : null,
      primaryConversionGoal: conversionGoal,
      importantPages,
    }
    onSave(profile)
  }

  const addPage = () => {
    setImportantPages([...importantPages, {
      url: '', pageType: 'Homepage', trafficShare: 0.10,
      funnelStage: 'awareness', businessCriticality: 'medium', conversionImportance: 'medium',
    }])
    setShowPages(true)
  }

  const removePage = (idx: number) => {
    setImportantPages(importantPages.filter((_, i) => i !== idx))
  }

  const updatePage = (idx: number, field: string, value: any) => {
    setImportantPages(importantPages.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Building2 size={18} color="#818cf8" />
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          Business Profile
        </h3>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Add your real analytics data to improve revenue impact accuracy. All fields are optional — estimated defaults are used where data is missing.
      </p>

      {/* Row 1: Business Type + Goal + Currency */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Business Type</label>
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)} style={selectStyle}>
            {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Conversion Goal</label>
          <select value={conversionGoal} onChange={(e) => setConversionGoal(e.target.value as ConversionGoal)} style={selectStyle}>
            {CONVERSION_GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={selectStyle}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: Traffic */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}><Users size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Monthly Visitors</label>
          <input type="number" placeholder="e.g. 50000" value={monthlyVisitors}
            onChange={(e) => setMonthlyVisitors(e.target.value)} style={inputStyle} min={0} />
        </div>
        <div>
          <label style={labelStyle}><Globe size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Monthly Sessions</label>
          <input type="number" placeholder="e.g. 75000" value={monthlySessions}
            onChange={(e) => setMonthlySessions(e.target.value)} style={inputStyle} min={0} />
        </div>
        <div>
          <label style={labelStyle}><Target size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Conversion Rate (%)</label>
          <input type="number" placeholder="e.g. 2.5" value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)} style={inputStyle} min={0} max={100} step={0.1} />
        </div>
      </div>

      {/* Row 3: Value fields (contextual) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {(isEcommerce || businessType === 'other') && (
          <div>
            <label style={labelStyle}><DollarSign size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Avg Order Value ({currency})</label>
            <input type="number" placeholder="e.g. 120" value={aov}
              onChange={(e) => setAov(e.target.value)} style={inputStyle} min={0} />
          </div>
        )}
        {(isLead || businessType === 'other') && (
          <div>
            <label style={labelStyle}><DollarSign size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Avg Lead Value ({currency})</label>
            <input type="number" placeholder="e.g. 500" value={leadValue}
              onChange={(e) => setLeadValue(e.target.value)} style={inputStyle} min={0} />
          </div>
        )}
        {(isSaas || businessType === 'other') && (
          <>
            <div>
              <label style={labelStyle}><DollarSign size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Avg Customer Value ({currency})</label>
              <input type="number" placeholder="e.g. 2000" value={customerValue}
                onChange={(e) => setCustomerValue(e.target.value)} style={inputStyle} min={0} />
            </div>
            <div>
              <label style={labelStyle}>Trial-to-Paid Rate (%)</label>
              <input type="number" placeholder="e.g. 15" value={trialToPaid}
                onChange={(e) => setTrialToPaid(e.target.value)} style={inputStyle} min={0} max={100} step={0.1} />
            </div>
          </>
        )}
      </div>

      {/* Important Pages */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setShowPages(!showPages)} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%',
          padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
        }}>
          <ChevronDown size={14} style={{ transform: showPages ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          Important Pages ({importantPages.length})
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Optional — improves accuracy</span>
        </button>

        {showPages && (
          <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
            {importantPages.map((page, idx) => (
              <div key={idx} style={{
                padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.68rem' }}>Page URL</label>
                    <input type="text" placeholder="https://..." value={page.url}
                      onChange={(e) => updatePage(idx, 'url', e.target.value)} style={{ ...inputStyle, fontSize: '0.78rem' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.68rem' }}>Type</label>
                    <select value={page.pageType} onChange={(e) => updatePage(idx, 'pageType', e.target.value)} style={{ ...selectStyle, fontSize: '0.78rem' }}>
                      {PAGE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.68rem' }}>Funnel Stage</label>
                    <select value={page.funnelStage} onChange={(e) => updatePage(idx, 'funnelStage', e.target.value)} style={{ ...selectStyle, fontSize: '0.78rem' }}>
                      {FUNNEL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '0.68rem' }}>Criticality</label>
                    <select value={page.businessCriticality} onChange={(e) => updatePage(idx, 'businessCriticality', e.target.value)} style={{ ...selectStyle, fontSize: '0.78rem' }}>
                      {CRITICALITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <button onClick={() => removePage(idx)} style={{
                    border: 'none', background: 'rgba(248,113,113,0.1)',
                    borderRadius: 6, padding: '0.45rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={14} color="#f87171" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addPage} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--accent)', fontSize: '0.78rem',
              fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={14} /> Add Important Page
            </button>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div style={{
        padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem',
        background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
      }}>
        <Info size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          These values are estimates. Add your real traffic and conversion data to improve accuracy.
          Revenue impact calculations use transparent formulas and clearly labeled assumptions.
        </span>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
        {saving ? 'Saving…' : 'Calculate Revenue Impact'}
      </button>
    </div>
  )
}
