'use client'
import { useState } from 'react'
import { BookOpen, Zap, MousePointer, Layers, ArrowRight, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import BeforeAfter from '@/components/ui/BeforeAfter'
import Link from 'next/link'

const guides = [
  {
    id: 'lcp',
    icon: <Zap size={20} />,
    title: 'Largest Contentful Paint (LCP)',
    color: '#60a5fa',
    tagline: 'Measures loading performance — how fast the largest element renders.',
    threshold: '≤ 2.5s is Good, > 4.0s is Poor',
    causes: [
      'Slow server response time (TTFB > 600ms)',
      'Render-blocking CSS or JavaScript',
      'Unoptimised hero images (wrong format, no srcset)',
      'Missing resource hints (preload, preconnect)',
      'Client-side rendering with no SSR/SSG',
    ],
    fixes: [
      'Preload the LCP image with <link rel="preload"> and fetchpriority="high"',
      'Serve images in WebP/AVIF with responsive srcset',
      'Inline critical CSS and defer non-critical stylesheets',
      'Use a CDN for static assets (Vercel Edge, Cloudflare)',
      'Enable stale-while-revalidate caching on HTML',
    ],
    before: {
      code: `<!-- No preload, no priority, huge PNG -->
<img src="/hero-banner.png" alt="Hero">

<!-- Render-blocking stylesheet -->
<link rel="stylesheet" href="/heavy-theme.css">`,
      language: 'html',
      filename: 'slow-page.html',
    },
    after: {
      code: `<!-- Preload LCP image with priority -->
<link rel="preload" as="image" href="/hero.webp"
  fetchpriority="high"
  imagesrcset="/hero-480.webp 480w,
               /hero-800.webp 800w,
               /hero-1200.webp 1200w"
  imagesizes="100vw" />

<img src="/hero.webp" alt="Hero"
  width="1200" height="600"
  fetchpriority="high" decoding="async" />

<!-- Defer non-critical CSS -->
<link rel="preload" href="/theme.css"
  as="style" onload="this.rel='stylesheet'" />`,
      language: 'html',
      filename: 'optimised-page.html',
    },
    improvement: 'LCP improved from ~4.2s to ~1.8s by preloading the hero image, serving WebP, and deferring non-critical CSS.',
  },
  {
    id: 'inp',
    icon: <MousePointer size={20} />,
    title: 'Interaction to Next Paint (INP)',
    color: '#34d399',
    tagline: 'Measures responsiveness — how quickly the page reacts to user input.',
    threshold: '≤ 200ms is Good, > 500ms is Poor',
    causes: [
      'Long JavaScript tasks blocking the main thread (>50ms)',
      'Expensive event handlers (complex DOM manipulation on every keystroke)',
      'Third-party scripts (analytics, chat widgets, ads)',
      'Large component re-renders on interaction',
      'Layout thrashing (interleaved DOM reads and writes)',
    ],
    fixes: [
      'Break long tasks with yield-to-main patterns (setTimeout(0) or scheduler.yield())',
      'Debounce search inputs and throttle scroll/resize handlers',
      'Move heavy computation to Web Workers',
      'Use event delegation instead of per-element listeners',
      'Batch DOM reads/writes using requestAnimationFrame',
    ],
    before: {
      code: `// Expensive handler runs on every keystroke
searchInput.addEventListener('input', (e) => {
  const results = database.filter(item =>
    item.name.includes(e.target.value)
  )
  // Synchronous DOM update with 10,000 items
  resultsContainer.innerHTML = results
    .map(r => \`<div class="result">\${r.name}</div>\`)
    .join('')
})`,
      language: 'javascript',
      filename: 'slow-search.js',
    },
    after: {
      code: `// Debounced handler + yielding
function debounce(fn, ms = 200) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

searchInput.addEventListener('input', debounce(async (e) => {
  const results = database.filter(item =>
    item.name.includes(e.target.value)
  )
  // Yield to browser between chunks
  await scheduler.yield()
  requestAnimationFrame(() => {
    resultsContainer.innerHTML = results
      .slice(0, 50)
      .map(r => \`<div class="result">\${r.name}</div>\`)
      .join('')
  })
}))`,
      language: 'javascript',
      filename: 'fast-search.js',
    },
    improvement: 'INP reduced from ~450ms to ~80ms by debouncing input, limiting rendered results, and yielding to the browser.',
  },
  {
    id: 'cls',
    icon: <Layers size={20} />,
    title: 'Cumulative Layout Shift (CLS)',
    color: '#fbbf24',
    tagline: 'Measures visual stability — unexpected layout shifts frustrate users.',
    threshold: '≤ 0.1 is Good, > 0.25 is Poor',
    causes: [
      'Images and videos without explicit width/height',
      'Fonts loading and causing text reflow (FOUT)',
      'Dynamic content injected above existing content (banners, ads)',
      'Late-loading embeds (iframes, maps) without reserved space',
      'CSS animations using top/left/width instead of transform',
    ],
    fixes: [
      'Always set width and height on <img> and <video> elements',
      'Use aspect-ratio CSS property for responsive containers',
      'Use font-display: optional or size-adjusted font fallbacks',
      'Reserve min-height for ad slots, banners, and dynamic content',
      'Animate only transform and opacity (compositor-friendly properties)',
    ],
    before: {
      code: `<!-- No dimensions — browser can't reserve space -->
<img src="/photo.jpg" alt="Product">

<!-- Font causes reflow -->
<style>
  body { font-family: 'CustomFont', sans-serif; }
</style>

<!-- Banner injected mid-page -->
<div class="late-banner" style="display:none">
  Sale ends today!
</div>`,
      language: 'html',
      filename: 'unstable-layout.html',
    },
    after: {
      code: `<!-- Explicit dimensions prevent layout shift -->
<img src="/photo.jpg" alt="Product"
  width="800" height="600"
  style="aspect-ratio: 4/3; width: 100%; height: auto;">

<!-- Size-adjusted fallback matches custom font -->
<style>
  @font-face {
    font-family: 'CustomFont Fallback';
    src: local('Arial');
    size-adjust: 105%;
    ascent-override: 92%;
  }
  body {
    font-family: 'CustomFont', 'CustomFont Fallback', sans-serif;
  }
</style>

<!-- Banner has reserved space -->
<div class="banner" style="min-height: 48px;">
  Sale ends today!
</div>`,
      language: 'html',
      filename: 'stable-layout.html',
    },
    improvement: 'CLS reduced from 0.32 to 0.02 by adding image dimensions, font fallback matching, and reserving space for dynamic content.',
  },
]

const toolLinks = [
  { href: 'https://pagespeed.web.dev/', label: 'PageSpeed Insights', desc: 'Google\'s official field + lab data tool' },
  { href: 'https://web.dev/articles/vitals', label: 'web.dev/vitals', desc: 'Comprehensive docs on Core Web Vitals' },
  { href: 'https://www.webpagetest.org/', label: 'WebPageTest', desc: 'Detailed waterfall and filmstrip analysis' },
  { href: 'https://developer.chrome.com/docs/lighthouse/', label: 'Lighthouse', desc: 'Lab-based audit in Chrome DevTools' },
]

export default function DocsPage() {
  const [expanded, setExpanded] = useState<string | null>('lcp')

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Learning Hub</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Core Web Vitals <span className="gradient-text">Deep Dive</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 580, lineHeight: 1.7 }}>
            Understand what each metric measures, what causes poor scores, and how to fix them with production-ready code examples.
          </p>
        </div>
      </section>

      <div className="container-pad" style={{ padding: '3rem 1.5rem' }}>
        {/* Quick jump */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          {guides.map(g => (
            <button key={g.id} onClick={() => setExpanded(g.id)} style={{
              padding: '0.6rem 1.25rem', borderRadius: 10, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
              background: expanded === g.id ? `${g.color}20` : 'var(--bg-card)',
              color: expanded === g.id ? g.color : 'var(--text-secondary)',
              border: expanded === g.id ? `1px solid ${g.color}44` : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              {g.icon} {g.id.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Guides */}
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {guides.map(guide => {
            const isOpen = expanded === guide.id
            return (
              <div key={guide.id} id={guide.id} className="glass-card" style={{
                overflow: 'hidden',
                borderColor: isOpen ? `${guide.color}40` : 'var(--border)',
                transition: 'border-color 0.3s ease',
              }}>
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : guide.id)}
                  style={{
                    width: '100%', border: 'none', cursor: 'pointer',
                    padding: '1.5rem 2rem', background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '1rem', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: `${guide.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: guide.color,
                    }}>
                      {guide.icon}
                    </div>
                    <div>
                      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                        {guide.title}
                      </h2>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                        {guide.tagline}
                      </p>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: '0 2rem 2rem' }}>
                    {/* Threshold */}
                    <div style={{
                      padding: '0.6rem 1rem', borderRadius: 8, marginBottom: '1.75rem',
                      background: `${guide.color}08`, border: `1px solid ${guide.color}22`,
                    }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: guide.color }}>
                        Threshold: {guide.threshold}
                      </span>
                    </div>

                    {/* Causes & Fixes columns */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.5rem', marginBottom: '2rem',
                    }}>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f87171', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          ✗ Common Causes
                        </h4>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {guide.causes.map((c, i) => (
                            <li key={i} style={{
                              fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55,
                              paddingLeft: '1rem', borderLeft: '2px solid rgba(248,113,113,0.25)',
                            }}>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: '#34d399', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          ✓ How to Fix
                        </h4>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {guide.fixes.map((f, i) => (
                            <li key={i} style={{
                              fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55,
                              paddingLeft: '1rem', borderLeft: '2px solid rgba(52,211,153,0.25)',
                            }}>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Before / After */}
                    <BeforeAfter
                      title={`${guide.id.toUpperCase()} Optimisation — Before vs After`}
                      before={guide.before}
                      after={guide.after}
                      improvement={guide.improvement}
                    />

                    <div style={{ marginTop: '1rem' }}>
                      <Link href="/library" style={{
                        fontSize: '0.88rem', fontWeight: 600, color: guide.color,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      }}>
                        More {guide.id.toUpperCase()} code snippets <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* External tools */}
        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Measurement Tools
          </h2>
          <div className="stagger" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}>
            {toolLinks.map(t => (
              <a key={t.label} href={t.href} target="_blank" rel="noreferrer" className="glass-card" style={{
                padding: '1.25rem', textDecoration: 'none', display: 'block',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <ExternalLink size={14} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t.label}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
