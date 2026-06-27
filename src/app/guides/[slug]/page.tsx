import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Clock, BookOpen, Zap } from 'lucide-react'
import { guides, getGuideBySlug, getRelatedGuides, categoryColors, categoryLabels } from '@/data/guides'
import { ArticleJsonLd } from '@/components/seo/JsonLd'

// ── Static params for SSG ──
export async function generateStaticParams() {
  return guides.map(g => ({ slug: g.slug }))
}

// ── Dynamic metadata ──
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return { title: 'Guide Not Found — VitalFix' }

  return {
    title: `${guide.title} | VitalFix`,
    description: guide.description,
    keywords: `${categoryLabels[guide.category]}, Core Web Vitals, ${guide.title.toLowerCase()}, web performance`,
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      url: `https://vitalfix.dev/guides/${guide.slug}`,
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
    },
  }
}

// ── Render markdown-lite (bold, code, lists, code blocks) ──
function renderContent(content: string) {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g)

  return parts.map((part, i) => {
    // Code block
    if (part.startsWith('```')) {
      const lines = part.split('\n')
      const lang = lines[0].replace('```', '').trim()
      const code = lines.slice(1, -1).join('\n')
      return (
        <div key={i} style={{
          margin: '1rem 0', borderRadius: 10, overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          {lang && (
            <div style={{
              padding: '0.4rem 0.85rem', background: 'var(--bg-secondary)',
              fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)', textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {lang}
            </div>
          )}
          <pre style={{
            padding: '1rem', margin: 0,
            background: '#0d0d14', color: '#c9d1d9',
            fontSize: '0.8rem', lineHeight: 1.7,
            overflow: 'auto', fontFamily: "'JetBrains Mono', monospace",
          }}>
            <code>{code}</code>
          </pre>
        </div>
      )
    }

    // Regular text — process inline formatting
    const lines = part.split('\n')
    return lines.map((line, j) => {
      if (!line.trim()) return <br key={`${i}-${j}`} />

      // Table detection
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        return null // Skip tables for simplicity — they render as text
      }

      // Numbered list
      const numberedMatch = line.match(/^(\d+)\.\s\*\*(.*?)\*\*\s*[-—]*\s*(.*)/)
      if (numberedMatch) {
        return (
          <div key={`${i}-${j}`} style={{
            display: 'flex', gap: '0.6rem', marginBottom: '0.5rem',
            padding: '0.5rem 0.75rem', borderRadius: 8,
            background: 'var(--bg)', border: '1px solid var(--border)',
          }}>
            <span style={{
              fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent)',
              fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
            }}>
              {numberedMatch[1]}.
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{numberedMatch[2]}</strong>
              {numberedMatch[3] && ` — ${numberedMatch[3]}`}
            </span>
          </div>
        )
      }

      // Regular paragraph with inline formatting
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="padding:0.1rem 0.35rem;border-radius:4px;background:var(--bg-secondary);font-size:0.82em;font-family:JetBrains Mono,monospace;color:var(--accent)">$1</code>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

      return (
        <p
          key={`${i}-${j}`}
          style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '0.5rem' }}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    })
  })
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)

  if (!guide) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Guide Not Found</h1>
          <Link href="/guides" className="btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to Guides
          </Link>
        </div>
      </div>
    )
  }

  const related = getRelatedGuides(guide.slug)

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <section style={{
        padding: '4rem 0 2.5rem',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div className="container-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
          <Link href="/guides" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none',
            marginBottom: '1.25rem', fontWeight: 500,
          }}>
            <ArrowLeft size={13} /> All Guides
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
              padding: '0.15rem 0.5rem', borderRadius: 4, letterSpacing: '0.04em',
              background: `${categoryColors[guide.category]}10`,
              color: categoryColors[guide.category],
              border: `1px solid ${categoryColors[guide.category]}20`,
            }}>
              {categoryLabels[guide.category]}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Clock size={11} /> {guide.readingTime} min read
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              · Updated {new Date(guide.dateModified).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '0.75rem',
          }}>
            {guide.title}
          </h1>

          <p style={{
            fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 620,
          }}>
            {guide.description}
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="container-pad" style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Table of Contents */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <BookOpen size={14} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>In this guide</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {guide.sections.map((section, i) => (
              <a
                key={i}
                href={`#section-${i}`}
                style={{
                  fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none',
                  padding: '0.25rem 0', borderLeft: `2px solid var(--border)`, paddingLeft: '0.75rem',
                  transition: 'all 150ms',
                }}
              >
                {section.heading}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        {guide.sections.map((section, i) => (
          <section key={i} id={`section-${i}`} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em',
              marginBottom: '1rem', color: 'var(--text-primary)',
              paddingTop: '1rem',
            }}>
              {section.heading}
            </h2>
            <div>{renderContent(section.content)}</div>
          </section>
        ))}

        {/* ── Inline CTA ── */}
        <div style={{
          borderRadius: 16, padding: '2rem',
          background: 'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(52,211,153,0.04))',
          border: '1px solid rgba(129,140,248,0.15)',
          textAlign: 'center', marginBottom: '2rem',
        }}>
          <Zap size={24} color="var(--accent)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Test these fixes on your site
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Run a free audit to see your current {categoryLabels[guide.category]} score and get prioritized fix recommendations.
          </p>
          <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none', padding: '0.7rem 1.5rem' }}>
            Run Free Audit <ArrowRight size={16} />
          </Link>
        </div>

        {/* ── Related Guides ── */}
        {related.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Related Guides</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {related.map(r => (
                <Link key={r.slug} href={`/guides/${r.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card-interactive" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                        padding: '0.1rem 0.4rem', borderRadius: 3,
                        background: `${categoryColors[r.category]}10`,
                        color: categoryColors[r.category],
                      }}>
                        {categoryLabels[r.category]}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{r.readingTime} min</span>
                    </div>
                    <h4 style={{
                      fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}>
                      {r.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Structured Data ── */}
      <ArticleJsonLd
        title={guide.title}
        description={guide.description}
        datePublished={guide.datePublished}
        dateModified={guide.dateModified}
        url={`https://vitalfix.dev/guides/${guide.slug}`}
      />
    </div>
  )
}
