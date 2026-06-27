import Link from 'next/link'
import { ArrowRight, Code2, CheckSquare, Gauge, TrendingUp, Search, Star, Activity } from 'lucide-react'
import BenchmarkSection from '@/components/BenchmarkSection'
import { WebApplicationJsonLd, OrganizationJsonLd } from '@/components/seo/JsonLd'
import ExitIntentWrapper from '@/components/ExitIntentWrapper'
import SocialProofWrapper from '@/components/SocialProofWrapper'

const stats = [
  { value: '53%', label: 'of users leave if load > 3s', color: 'var(--red)' },
  { value: '1s', label: 'LCP delay = 7% drop in conversions', color: 'var(--orange)' },
  { value: '90%', label: 'of pages fail Core Web Vitals', color: 'var(--accent)' },
  { value: '2×', label: 'better ranking with good CWV', color: 'var(--green)' },
]

const features = [
  {
    icon: <Code2 size={20} />,
    title: 'Code Library',
    desc: 'Production-ready snippets for LCP images, layout shift fixes, INP optimisation, lazy loading, and more.',
    href: '/library',
    color: '#818cf8',
  },
  {
    icon: <CheckSquare size={20} />,
    title: 'Audit Checklist',
    desc: 'Interactive 40-point checklist covering LCP, INP, CLS, TTFB with a real-time score tracker.',
    href: '/checklist',
    color: '#34d399',
  },
  {
    icon: <Gauge size={20} />,
    title: 'Interactive Tools',
    desc: 'Visual explainers — adjust sliders and instantly see how your changes affect CWV scores.',
    href: '/tools',
    color: '#60a5fa',
  },
]

const metrics = [
  { name: 'LCP', full: 'Largest Contentful Paint', good: '< 2.5s', bad: '> 4.0s', desc: 'Time for largest visible element to load. Affects perceived load speed most.', color: '#60a5fa' },
  { name: 'INP', full: 'Interaction to Next Paint', good: '< 200ms', bad: '> 500ms', desc: 'Responsiveness of the page to user interactions like clicks and taps.', color: '#34d399' },
  { name: 'CLS', full: 'Cumulative Layout Shift', good: '< 0.1', bad: '> 0.25', desc: 'Visual stability — measures unexpected layout shifts as page loads.', color: '#fbbf24' },
]

const steps = [
  {
    num: '01',
    icon: <Search size={20} />,
    title: 'Audit',
    desc: 'Run the dashboard audit or checklist to identify exactly which Core Web Vitals are failing and why.',
    color: '#818cf8',
  },
  {
    num: '02',
    icon: <Code2 size={20} />,
    title: 'Fix',
    desc: 'Grab the exact code snippet from the library — LCP preloads, INP debouncing, CLS reservations — and ship it.',
    color: '#60a5fa',
  },
  {
    num: '03',
    icon: <Activity size={20} />,
    title: 'Monitor',
    desc: 'Re-run the audit, track your score over time, and get alerts before regressions reach production.',
    color: '#34d399',
  },
]



const testimonials = [
  {
    quote: 'VitalFix cut our LCP from 4.1s to 1.8s in a single afternoon. The code snippets are battle-tested and just work.',
    name: 'Alex M.',
    role: 'Frontend Engineer',
    initials: 'AM',
    color: '#818cf8',
    improvement: 'LCP ↓ 56%',
  },
  {
    quote: 'The audit checklist caught 12 CLS issues we had no idea about. Our PageSpeed score went from 61 to 94.',
    name: 'Priya R.',
    role: 'Full-Stack Dev',
    initials: 'PR',
    color: '#34d399',
    improvement: 'Score +33pts',
  },
  {
    quote: "Finally a tool that explains WHY each fix matters. The INP breakdown simulator is genius — I've shared it with my whole team.",
    name: 'Jordan K.',
    role: 'Performance Lead',
    initials: 'JK',
    color: '#60a5fa',
    improvement: 'INP ↓ 68%',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '8rem 0 5rem', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        {/* CSS grid background */}
        <div className="hero-grid-bg" />
        {/* Gradient orbs */}
        <div className="hero-glow" style={{ width: 500, height: 500, background: '#818cf8', top: -200, left: -100 }} />
        <div className="hero-glow" style={{ width: 350, height: 350, background: '#60a5fa', top: 80, right: -80 }} />
        <div className="hero-glow" style={{ width: 250, height: 250, background: '#34d399', bottom: -50, left: '35%' }} />

        <div className="container-pad" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Pill badge */}
          <div className="animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.8rem', borderRadius: 100,
              border: '1px solid rgba(129,140,248,0.2)', background: 'rgba(129,140,248,0.05)',
              marginBottom: '1.75rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
              Core Web Vitals Toolkit — Free & Open Source
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
            <h1 className="text-display" style={{ marginBottom: '1.25rem', maxWidth: 700, margin: '0 auto 1.25rem' }}>
              fastest way to understand and fix performance
              <br />
              <span className="gradient-text">Ship Faster.</span>
            </h1>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7 }}>
              Production-ready code snippets, audit checklists, and developer tools to improve LCP, INP, and CLS.
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <Link href="/library" className="btn-primary" style={{ textDecoration: 'none', padding: '0.7rem 1.75rem' }}>
                Browse Code Library <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.7rem 1.75rem' }}>
                Audit Your Site Free — 30 Seconds
              </Link>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, marginBottom: '3rem' }}>
              No credit card · No sign-up required
            </p>
          </div>

          {/* Metric pills */}
          <div className="animate-fade-up" style={{ animationDelay: '0.45s', opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {[
                { label: 'LCP', score: 'Good', color: '#60a5fa' },
                { label: 'INP', score: 'Optimised', color: '#34d399' },
                { label: 'CLS', score: 'Stable', color: '#fbbf24' },
                { label: 'TTFB', score: '< 200ms', color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '0.45rem 0.9rem', borderRadius: 8,
                  border: `1px solid ${s.color}20`, background: `${s.color}06`,
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: '3rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="container-pad">
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, letterSpacing: '-0.03em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.3rem' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-pad">
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-accent" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>The Process</span>
            <h2 className="text-h1" style={{ marginTop: '0.5rem' }}>
              Audit → Fix → <span className="gradient-text">Monitor</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', maxWidth: 440, margin: '0.75rem auto 0', fontSize: '0.9rem' }}>
              The same 3-step workflow used by performance engineers at top teams.
            </p>
          </div>

          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {steps.map(step => (
              <div key={step.num} className="glass-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -8, right: 12, fontSize: '4.5rem', fontWeight: 900, color: `${step.color}08`, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, pointerEvents: 'none' }}>
                  {step.num}
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${step.color}10`, color: step.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', border: `1px solid ${step.color}20`,
                }}>
                  {step.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: step.color, fontWeight: 600 }}>{step.num}</span>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{step.title}</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Web Vitals explainer ── */}
      <section style={{ padding: '4rem 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>The Three Pillars</span>
            <h2 className="text-h1" style={{ marginTop: '0.5rem' }}>What Are Core Web Vitals?</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', maxWidth: 480, margin: '0.75rem auto 0', fontSize: '0.9rem' }}>
              Google&apos;s three key metrics that define real-world user experience — and directly impact your search ranking.
            </p>
          </div>

          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {metrics.map(m => (
              <div key={m.name} className="glass-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontWeight: 800, fontSize: '0.95rem', color: m.color,
                    width: 40, height: 40, borderRadius: 10,
                    background: `${m.color}10`, border: `1px solid ${m.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{m.name}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.full}</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>{m.desc}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 5, background: 'rgba(52,211,153,0.08)', color: '#34d399', fontWeight: 600 }}>✓ Good: {m.good}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 5, background: 'rgba(248,113,113,0.08)', color: '#f87171', fontWeight: 600 }}>✗ Poor: {m.bad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section-pad">
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-accent" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>Everything You Need</span>
            <h2 className="text-h1" style={{ marginTop: '0.5rem' }}>Built for Working Developers</h2>
          </div>

          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {features.map(f => (
              <Link key={f.title} href={f.href} style={{ textDecoration: 'none' }}>
                <div className="card-interactive" style={{ padding: '1.75rem', height: '100%' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${f.color}10`, color: f.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem', border: `1px solid ${f.color}20`,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.45rem', color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>{f.desc}</p>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: f.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Explore <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry Benchmarks (interactive — with slide-over drawer) ── */}
      <BenchmarkSection />

      {/* ── Testimonials ── */}
      <section className="section-pad">
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-green" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>Developer Stories</span>
            <h2 className="text-h1" style={{ marginTop: '0.5rem' }}>
              Trusted by <span className="gradient-text">Performance Engineers</span>
            </h2>
          </div>

          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {testimonials.map(t => (
              <div key={t.name} className="testimonial-card">
                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.75rem' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={13} color="#fbbf24" fill="#fbbf24" />)}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                  {t.quote}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${t.color}15`, border: `1px solid ${t.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.72rem', color: t.color, flexShrink: 0,
                  }}>
                    {t.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600,
                    padding: '0.15rem 0.5rem', borderRadius: 5,
                    background: `${t.color}10`, color: t.color, border: `1px solid ${t.color}20`,
                  }}>
                    {t.improvement}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '4rem 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        <div className="container-pad">
          <div style={{
            borderRadius: 20, padding: 'clamp(2rem, 4vw, 3.5rem)',
            background: 'linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(96,165,250,0.04) 50%, rgba(52,211,153,0.03) 100%)',
            border: '1px solid rgba(129,140,248,0.15)',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(129,140,248,0.06)', top: -120, right: -80, filter: 'blur(80px)', pointerEvents: 'none' }} />
            <TrendingUp size={32} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h2 className="text-h1" style={{ marginBottom: '0.75rem' }}>
              Start Fixing Your Web Vitals Today
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 1.75rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Join developers who&apos;ve improved their Core Web Vitals scores and boosted their site rankings — 100% free.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/library" className="btn-primary" style={{ textDecoration: 'none', padding: '0.7rem 1.75rem' }}>
                Get the Code Snippets <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.7rem 1.75rem' }}>
                Run Free Audit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Powered By ── */}
      <section style={{ padding: '2rem 0', borderTop: '1px solid var(--border)' }}>
        <div className="container-pad" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.75rem' }}>
            Powered by
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', opacity: 0.5 }}>
            {['Google Lighthouse', 'PageSpeed Insights', 'Chrome UX Report', 'Next.js'].map(name => (
              <span key={name} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Growth Components ── */}
      <ExitIntentWrapper />
      <SocialProofWrapper />

      {/* ── Structured Data ── */}
      <WebApplicationJsonLd />
      <OrganizationJsonLd />
    </>
  )
}
