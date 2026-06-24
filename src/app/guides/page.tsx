import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, Zap } from 'lucide-react'
import { guides, categoryColors, categoryLabels } from '@/data/guides'

export const metadata: Metadata = {
  title: 'Web Vitals Guides — Fix LCP, INP, CLS, TTFB | Øditr',
  description: 'Free, in-depth guides to fix Core Web Vitals issues. Learn how to optimize LCP, INP, CLS, and TTFB with production-ready code examples and best practices.',
  keywords: 'Core Web Vitals guide, fix LCP, fix CLS, fix INP, reduce TTFB, Lighthouse score, web performance',
  openGraph: {
    title: 'Web Vitals Guides — Øditr',
    description: 'In-depth guides to fix Core Web Vitals with code examples. Free.',
    type: 'website',
  },
}

const difficultyColors: Record<string, string> = {
  beginner: '#34d399',
  intermediate: '#fbbf24',
  advanced: '#f87171',
}

export default function GuidesPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <section style={{
        padding: '5rem 0 3rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 350, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(129,140,248,0.05), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className="container-pad" style={{ position: 'relative' }}>
          <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Learn</span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800,
            letterSpacing: '-0.03em', marginBottom: '0.75rem', lineHeight: 1.1,
          }}>
            Web Vitals <span className="gradient-text">Guides</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '1.05rem',
            maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7,
          }}>
            In-depth guides with production-ready code to fix LCP, INP, CLS, and TTFB.
            Written by performance engineers.
          </p>

          {/* Category pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <span key={key} style={{
                padding: '0.35rem 0.85rem', borderRadius: 8,
                border: `1px solid ${categoryColors[key]}20`,
                background: `${categoryColors[key]}06`,
                fontSize: '0.78rem', fontWeight: 600,
                color: categoryColors[key],
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guide Cards ── */}
      <section style={{ padding: '3rem 0' }}>
        <div className="container-pad">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}>
            {guides.map((guide, i) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card-interactive"
                  style={{
                    padding: '1.75rem', height: '100%',
                    animation: `fadeUpStagger 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s forwards`,
                    opacity: 0,
                  }}
                >
                  {/* Category + Difficulty */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem', borderRadius: 4, letterSpacing: '0.04em',
                      background: `${categoryColors[guide.category]}10`,
                      color: categoryColors[guide.category],
                      border: `1px solid ${categoryColors[guide.category]}20`,
                    }}>
                      {categoryLabels[guide.category]}
                    </span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600,
                      padding: '0.15rem 0.5rem', borderRadius: 4,
                      background: `${difficultyColors[guide.difficulty]}10`,
                      color: difficultyColors[guide.difficulty],
                    }}>
                      {guide.difficulty}
                    </span>
                    <span style={{
                      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.68rem', color: 'var(--text-muted)',
                    }}>
                      <Clock size={10} /> {guide.readingTime} min
                    </span>
                  </div>

                  {/* Title */}
                  <h2 style={{
                    fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)',
                    marginBottom: '0.5rem', lineHeight: 1.4,
                  }}>
                    {guide.title}
                  </h2>

                  {/* Description */}
                  <p style={{
                    fontSize: '0.82rem', color: 'var(--text-secondary)',
                    lineHeight: 1.6, marginBottom: '1rem',
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {guide.description}
                  </p>

                  {/* Read link */}
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 600,
                    color: categoryColors[guide.category],
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}>
                    Read Guide <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '4rem 0',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <div className="container-pad">
          <BookOpen size={28} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Ready to apply these fixes?
          </h2>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.9rem',
            maxWidth: 400, margin: '0 auto 1.5rem', lineHeight: 1.6,
          }}>
            Run a free audit to find exactly which fixes your site needs.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none', padding: '0.7rem 1.75rem' }}>
              Run Free Audit <ArrowRight size={16} />
            </Link>
            <Link href="/library" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.7rem 1.5rem' }}>
              Browse Code Library
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
