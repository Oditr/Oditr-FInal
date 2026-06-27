'use client'

import { useState } from 'react'
import { Check, Star, Zap, Shield, Building2, ArrowRight, ChevronDown, ChevronUp, Sparkles, BarChart3, Download, Globe, Lock, Code2, Crown, Loader2, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import AuthModal from '@/components/AuthModal'
import { FAQJsonLd } from '@/components/seo/JsonLd'

// ── 4-Tier Plan Data ──
const plans = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Get started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    desc: 'Everything you need to start auditing and fixing Core Web Vitals.',
    color: '#34d399',
    icon: <Zap size={18} />,
    features: [
      { text: '5 audits per day', highlight: false },
      { text: 'Full Lighthouse audit', highlight: false },
      { text: '8-module site audit', highlight: false },
      { text: 'Core Web Vitals + CrUX', highlight: false },
      { text: 'Code snippet library', highlight: false },
      { text: '7-day scan history (15 scans)', highlight: false },
      { text: '3 shareable reports/month', highlight: false },
    ],
    cta: 'Start Free',
    href: '/dashboard',
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: "Developer's toolkit",
    monthlyPrice: 5,
    yearlyPrice: 48,
    desc: 'More audits, history, and exports for developers who audit regularly.',
    color: '#38bdf8',
    icon: <Rocket size={18} />,
    features: [
      { text: '25 audits per day', highlight: true },
      { text: '90-day scan history', highlight: true },
      { text: 'Trend tracking with sparklines', highlight: true },
      { text: 'PDF report export (10/mo)', highlight: true },
      { text: 'CSV/JSON data export', highlight: false },
      { text: 'Batch audit (3 URLs)', highlight: false },
      { text: 'Full analytics dashboard', highlight: false },
      { text: 'Unlimited shareable reports', highlight: false },
    ],
    cta: 'Get Starter',
    href: '#',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Most popular',
    monthlyPrice: 19,
    yearlyPrice: 179,
    desc: 'Unlimited audits, monitoring, API access, and tools built for performance engineers.',
    color: '#818cf8',
    icon: <Sparkles size={18} />,
    features: [
      { text: 'Unlimited audits', highlight: true },
      { text: 'Scheduled monitoring (10 URLs)', highlight: true },
      { text: 'Performance budgets & alerts', highlight: true },
      { text: 'Competitor benchmarking', highlight: false },
      { text: 'REST API (1K req/day)', highlight: true },
      { text: 'CI/CD CLI + GitHub Action', highlight: false },
      { text: 'Batch audit (10 URLs)', highlight: false },
      { text: 'Priority processing', highlight: true },
    ],
    cta: 'Upgrade to Pro',
    href: '#',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams & agencies',
    monthlyPrice: -1, // Custom
    yearlyPrice: -1,
    desc: 'Multi-site monitoring, team collaboration, and white-label reporting for organizations.',
    color: '#60a5fa',
    icon: <Building2 size={18} />,
    features: [
      { text: 'Unlimited site monitoring', highlight: true },
      { text: 'Team seats (5 included)', highlight: true },
      { text: 'White-label PDF reports', highlight: true },
      { text: 'REST API (10K req/day)', highlight: false },
      { text: 'Custom integrations', highlight: false },
      { text: 'SSO + invoice billing', highlight: false },
      { text: 'Dedicated account manager', highlight: false },
      { text: 'Custom SLA', highlight: false },
    ],
    cta: 'Contact Sales',
    href: 'mailto:hello@vitalfix.dev',
    highlight: false,
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const { user, plan: currentPlan } = useAuth()

  const handleCheckout = async (planId: string, billingCycle: string) => {
    if (planId === 'free') {
      if (user) {
        window.location.href = '/dashboard'
      } else {
        setAuthOpen(true)
      }
      return
    }

    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@vitalfix.dev'
      return
    }

    // Starter or Pro plan — redirect to Stripe Checkout
    if (!user) {
      setAuthOpen(true)
      return
    }

    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to start checkout')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }
const faqs = [
  {
    q: 'Is the Free plan really free forever?',
    a: 'Yes. The Free plan includes 5 daily audits, full site audit, and access to the complete code snippet library — no credit card, no trial, no catch.',
  },
  {
    q: 'What\'s the difference between Starter and Pro?',
    a: 'Starter ($5/mo) gives you 25 audits/day, 90-day history, PDF export, and trend tracking. Pro ($19/mo) removes all limits and adds scheduled monitoring, alerts, API access, and CI/CD integration.',
  },
  {
    q: 'How does yearly billing save me money?',
    a: 'Yearly billing saves ~20% on both Starter ($48/yr vs $60/yr) and Pro ($179/yr vs $228/yr).',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Absolutely. Cancel anytime from your account dashboard. No fees, no questions. Access continues until the end of the billing period.',
  },
  {
    q: 'Do you offer student or open-source discounts?',
    a: 'Yes — email us at hello@vitalfix.dev with proof of student status or your open-source project link for a 50% discount on any paid plan.',
  },
  {
    q: 'What\'s included in the Enterprise plan?',
    a: 'Enterprise includes everything in Pro, plus unlimited site monitoring, team seats, white-label reports, SSO, custom integrations, dedicated support, and custom SLA. Contact us for pricing.',
  },
]

const comparisonFeatures = [
  { feature: 'Daily audits', free: '5', starter: '25', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Scan history', free: '7 days', starter: '90 days', pro: 'Unlimited', enterprise: '2 years' },
  { feature: 'Custom site audit', free: '✓', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Shareable reports', free: '3/mo', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Trend tracking', free: '—', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'PDF export', free: '—', starter: '10/mo', pro: '✓', enterprise: '✓ (white-label)' },
  { feature: 'CSV/JSON export', free: '—', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Batch audit', free: '—', starter: '3 URLs', pro: '10 URLs', enterprise: '50 URLs' },
  { feature: 'Analytics dashboard', free: 'Basic', starter: 'Full', pro: 'Full', enterprise: 'Full' },
  { feature: 'Scheduled monitoring', free: '—', starter: '—', pro: '10 URLs', enterprise: 'Unlimited' },
  { feature: 'Performance budgets', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Alerts (email/Slack)', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
  { feature: 'REST API', free: '—', starter: '—', pro: '1K req/day', enterprise: '10K req/day' },
  { feature: 'CI/CD + GitHub Action', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Team collaboration', free: '—', starter: '—', pro: '—', enterprise: '✓ (5 seats)' },
  { feature: 'White-label reports', free: '—', starter: '—', pro: '—', enterprise: '✓' },
  { feature: 'Custom integrations', free: '—', starter: '—', pro: '—', enterprise: '✓' },
  { feature: 'SSO + invoice billing', free: '—', starter: '—', pro: '—', enterprise: '✓' },
  { feature: 'Dedicated support', free: '—', starter: 'Email 48hr', pro: 'Email 24hr', enterprise: 'Named manager' },
]

  const isYearly = billing === 'yearly'
  const yearlySavings = 20 // ~20% across both paid tiers


  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Hero Section ── */}
      <section style={{
        padding: '5rem 0 3.5rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(129,140,248,0.06), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container-pad" style={{ position: 'relative' }}>
          <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Pricing</span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
            lineHeight: 1.1,
          }}>
            Simple, <span className="gradient-text">transparent pricing</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '1.05rem',
            maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.7,
          }}>
            Start free. Upgrade when you need unlimited audits, deep analytics, and team features.
          </p>

          {/* ── Monthly / Yearly Toggle ── */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.35rem', borderRadius: 12,
            background: 'var(--bg)', border: '1px solid var(--border)',
          }}>
            <button
              onClick={() => setBilling('monthly')}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 9, border: 'none',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                background: !isYearly ? 'var(--bg-card)' : 'transparent',
                color: !isYearly ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: !isYearly ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 200ms',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 9, border: 'none',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                background: isYearly ? 'var(--bg-card)' : 'transparent',
                color: isYearly ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: isYearly ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 200ms',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              Yearly
              <span style={{
                fontSize: '0.65rem', fontWeight: 700,
                padding: '0.15rem 0.45rem', borderRadius: 6,
                background: 'rgba(52,211,153,0.12)', color: '#34d399',
                border: '1px solid rgba(52,211,153,0.2)',
              }}>
                Save {yearlySavings}%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section style={{ padding: '4rem 0 3rem' }}>
        <div className="container-pad">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
          }}>
            {plans.map((p, idx) => {
              const price = p.monthlyPrice === -1
                ? null
                : isYearly
                  ? p.yearlyPrice === 0 ? 0 : Math.round(p.yearlyPrice / 12)
                  : p.monthlyPrice

              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 20,
                    padding: p.highlight ? '2.5rem' : '2.25rem',
                    border: `1px solid ${p.highlight ? 'rgba(129,140,248,0.3)' : 'var(--border)'}`,
                    background: p.highlight
                      ? 'linear-gradient(160deg, rgba(129,140,248,0.06), rgba(96,165,250,0.03), transparent)'
                      : 'var(--bg-card)',
                    position: 'relative',
                    boxShadow: p.highlight
                      ? '0 0 60px rgba(129,140,248,0.1), 0 20px 60px rgba(0,0,0,0.15)'
                      : '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: p.highlight ? 'scale(1.02)' : 'none',
                    animation: `fadeUpStagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.08}s forwards`,
                    opacity: 0,
                  }}
                >
                  {/* Most Popular badge */}
                  {p.highlight && (
                    <div style={{
                      position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                      padding: '0.3rem 1.1rem', borderRadius: 100,
                      background: 'linear-gradient(135deg, #7c6bff, #38bdf8)',
                      fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                      whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      boxShadow: '0 4px 15px rgba(124,107,255,0.3)',
                    }}>
                      <Star size={11} fill="#fff" /> Most Popular
                    </div>
                  )}

                  {/* Plan header */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      marginBottom: '0.65rem',
                    }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8,
                        background: `${p.color}15`, color: p.color,
                      }}>
                        {p.icon}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {p.name}
                      </span>
                    </div>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '0.5rem' }}>
                      {price !== null ? (
                        <>
                          <span style={{
                            fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em',
                            color: 'var(--text-primary)', lineHeight: 1,
                          }}>
                            ${price}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {price === 0 ? '/forever' : '/mo'}
                          </span>
                        </>
                      ) : (
                        <span style={{
                          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
                          color: 'var(--text-primary)', lineHeight: 1,
                        }}>
                          Custom
                        </span>
                      )}
                    </div>

                    {/* Yearly price note */}
                    {p.id === 'pro' && isYearly && (
                      <div style={{
                        fontSize: '0.75rem', color: '#34d399', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        marginBottom: '0.25rem',
                      }}>
                        <Sparkles size={11} />
                        ${p.yearlyPrice}/year — Save ${9 * 12 - p.yearlyPrice}
                      </div>
                    )}

                    <p style={{
                      fontSize: '0.85rem', color: 'var(--text-secondary)',
                      lineHeight: 1.6, marginTop: '0.25rem',
                    }}>
                      {p.desc}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleCheckout(p.id, billing)}
                    disabled={checkoutLoading === p.id || !!(user && currentPlan === p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      width: '100%', cursor: (user && currentPlan === p.id) ? 'default' : 'pointer',
                      padding: '0.8rem 1.5rem', borderRadius: 11, fontWeight: 700, fontSize: '0.9rem',
                      background: (user && currentPlan === p.id)
                        ? 'var(--bg-card)'
                        : p.highlight ? 'linear-gradient(135deg, #7c6bff, #38bdf8)' : 'var(--bg)',
                      color: (user && currentPlan === p.id)
                        ? 'var(--text-muted)'
                        : p.highlight ? '#fff' : 'var(--text-primary)',
                      border: (user && currentPlan === p.id)
                        ? '1px solid var(--border)'
                        : p.highlight ? 'none' : '1px solid var(--border)',
                      marginBottom: '1.75rem',
                      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: p.highlight && !(user && currentPlan === p.id) ? '0 4px 20px rgba(124,107,255,0.25)' : 'none',
                      opacity: checkoutLoading === p.id ? 0.7 : 1,
                    }}
                  >
                    {checkoutLoading === p.id ? (
                      <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Redirecting…</>
                    ) : (user && currentPlan === p.id) ? (
                      <><Crown size={15} /> Current Plan</>
                    ) : (
                      <>{p.cta} <ArrowRight size={15} /></>
                    )}
                  </button>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {p.id !== 'free' && (
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: 'var(--text-muted)',
                        marginBottom: '0.2rem',
                      }}>
                        {p.id === 'starter' ? 'Everything in Free, plus:' : p.id === 'pro' ? 'Everything in Starter, plus:' : 'Everything in Pro, plus:'}
                      </div>
                    )}
                    {p.features.map(f => (
                      <div key={f.text} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                      }}>
                        <Check size={14} color={p.color} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{
                          fontSize: '0.84rem', lineHeight: 1.5,
                          color: f.highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: f.highlight ? 600 : 400,
                        }}>
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section style={{
        padding: '2.5rem 0',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div className="container-pad" style={{
          display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap',
        }}>
          {[
            { icon: <Shield size={18} color="#34d399" />, text: 'No credit card for Free' },
            { icon: <Lock size={18} color="#818cf8" />, text: '14-day money-back guarantee' },
            { icon: <Zap size={18} color="#fbbf24" />, text: 'Cancel anytime, no questions' },
            { icon: <Globe size={18} color="#60a5fa" />, text: 'Used by developers worldwide' },
          ].map(t => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t.icon}
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {t.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section style={{ padding: '5rem 0 4rem' }}>
        <div className="container-pad">
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800,
            textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em',
          }}>
            Compare <span className="gradient-text">all features</span>
          </h2>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.9rem',
            textAlign: 'center', marginBottom: '3rem', maxWidth: 480, margin: '0 auto 3rem',
          }}>
            Every plan includes the core audit engine. Here&apos;s how they differ.
          </p>

          <div style={{
            maxWidth: 920, margin: '0 auto',
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            overflowX: 'auto',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.8fr 0.8fr 0.8fr',
              padding: '0.85rem 1.25rem',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              gap: '0.5rem',
              minWidth: 650,
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Feature
              </span>
              {['Free', 'Starter', 'Pro', 'Enterprise'].map(name => (
                <span key={name} style={{
                  fontSize: '0.72rem', fontWeight: 700, textAlign: 'center',
                  color: name === 'Pro' ? '#818cf8' : name === 'Starter' ? '#38bdf8' : 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {name}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {comparisonFeatures.map((row, i) => (
              <div key={row.feature} style={{
                display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.8fr 0.8fr 0.8fr',
                padding: '0.7rem 1.25rem',
                borderBottom: i < comparisonFeatures.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                gap: '0.5rem',
                transition: 'background 150ms',
                minWidth: 650,
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {row.feature}
                </span>
                {[row.free, row.starter, row.pro, row.enterprise].map((val, j) => (
                  <span key={j} style={{
                    fontSize: '0.78rem', textAlign: 'center', fontWeight: 500,
                    color: val === '✓' || val?.toString().includes('✓') ? '#34d399' : val === '—' ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}>
                    {val}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's Included Strip ── */}
      <section style={{
        padding: '4rem 0',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div className="container-pad">
          <h2 style={{
            fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800,
            textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em',
          }}>
            Every plan includes
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}>
            {[
              { icon: <BarChart3 size={18} />, title: 'Real Lighthouse Scores', desc: 'Live PageSpeed Insights API — not synthetic simulations.', color: '#818cf8' },
              { icon: <Shield size={18} />, title: '8-Module Site Audit', desc: 'Security, accessibility, images, headings, meta tags, and more.', color: '#34d399' },
              { icon: <Code2 size={18} />, title: 'Code Snippet Library', desc: 'Production-ready fixes for LCP, CLS, INP, lazy loading.', color: '#60a5fa' },
              { icon: <Download size={18} />, title: 'Actionable Reports', desc: 'Every audit includes prioritized recommendations and fix guides.', color: '#fbbf24' },
            ].map(f => (
              <div key={f.title} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginBottom: '0.65rem',
                }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 7,
                    background: `${f.color}12`, color: f.color,
                  }}>
                    {f.icon}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{f.title}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container-pad">
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800,
            textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em',
          }}>
            Frequently asked questions
          </h2>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.9rem',
            textAlign: 'center', marginBottom: '3rem',
          }}>
            Can&apos;t find what you&apos;re looking for? <a href="mailto:hello@vitalfix.dev" style={{ color: 'var(--accent)', fontWeight: 600 }}>Email us</a>
          </p>

          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {faqs.map((f, i) => (
              <div key={i} style={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: openFaq === i ? 'var(--bg-card)' : 'transparent',
                transition: 'all 200ms',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '1rem 1.25rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {f.q}
                  </span>
                  {openFaq === i
                    ? <ChevronUp size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    : <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  }
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 1.25rem 1.25rem',
                    animation: 'fadeIn 200ms ease',
                  }}>
                    <p style={{
                      fontSize: '0.84rem', color: 'var(--text-secondary)',
                      lineHeight: 1.65,
                    }}>
                      {f.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{
        padding: '5rem 0',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
      }}>
        <div className="container-pad">
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800,
            letterSpacing: '-0.02em', marginBottom: '0.75rem',
          }}>
            Ready to fix your <span className="gradient-text">Core Web Vitals</span>?
          </h2>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.95rem',
            maxWidth: 440, margin: '0 auto 2rem', lineHeight: 1.7,
          }}>
            Start with a free audit. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn-primary" style={{
              textDecoration: 'none', padding: '0.75rem 2rem', fontSize: '0.9rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}>
              Start Free Audit <ArrowRight size={16} />
            </Link>
            <Link href="mailto:hello@vitalfix.dev" className="btn-secondary" style={{
              textDecoration: 'none', padding: '0.75rem 2rem', fontSize: '0.9rem',
            }}>
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ Structured Data ── */}
      <FAQJsonLd faqs={faqs} />

      {/* ── Auth Modal ── */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
