import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: '4rem' }}>
      <div className="container-pad" style={{ padding: '2.5rem 1.5rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem' }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', marginBottom: '0.6rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={13} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>VitalFix</span>
            </Link>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 220 }}>
              Production-ready tools to fix Core Web Vitals and ship faster websites.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-label" style={{ marginBottom: '0.6rem' }}>Product</p>
            {[
              { href: '/library', label: 'Code Library' },
              { href: '/checklist', label: 'Audit Checklist' },
              { href: '/tools', label: 'Interactive Tools' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/pricing', label: 'Pricing' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.35rem', transition: 'color 150ms' }}>{l.label}</Link>
            ))}
          </div>

          {/* Learn */}
          <div>
            <p className="text-label" style={{ marginBottom: '0.6rem' }}>Learn</p>
            {[
              { href: '/guides', label: 'Guides' },
              { href: '/docs', label: 'Documentation' },
              { href: 'https://web.dev/vitals/', label: 'web.dev/vitals ↗' },
              { href: 'https://pagespeed.web.dev/', label: 'PageSpeed Insights ↗' },
            ].map(l => (
              <a key={l.href} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noreferrer' : undefined} style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.35rem' }}>{l.label}</a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: '2rem', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>© {new Date().getFullYear()} VitalFix</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Built for developers, by developers</p>
        </div>
      </div>
    </footer>
  )
}
