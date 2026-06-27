'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Zap, Menu, X, User, LogOut } from 'lucide-react'
import ThemeToggle from '../ui/ThemeToggle'
import { useAuth } from '../providers/AuthProvider'
import AuthModal from '../AuthModal'

const links = [
  { href: '/', label: 'Home' },
  { href: '/library', label: 'Code Library' },
  { href: '/checklist', label: 'Audit Checklist' },
  { href: '/tools', label: 'Tools' },
  { href: '/guides', label: 'Guides' },
  { href: '/docs', label: 'Docs' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/monitoring', label: 'Monitoring' },
  { href: '/pricing', label: 'Pricing' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const { user, signOut, isConfigured } = useAuth()

  return (
    <>
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg-nav)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div className="container-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            VitalFix
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }} className="desktop-nav">
          {links.map(l => {
            const isActive = pathname === l.href
            return (
              <Link key={l.href} href={l.href} style={{
                padding: '0.35rem 0.75rem', borderRadius: 6, textDecoration: 'none',
                fontSize: '0.82rem', fontWeight: isActive ? 600 : 450,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'transparent',
                transition: 'color 150ms ease',
                position: 'relative',
              }}>
                {l.label}
              </Link>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ThemeToggle />
          {isConfigured && (
            user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)',
                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem',
                    fontSize: '0.72rem', fontWeight: 600, transition: 'all 150ms ease',
                  }}
                >
                  <LogOut size={12} /> Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 100, padding: '0.35rem 0.85rem', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  transition: 'all 150ms ease',
                }}
              >
                <User size={13} /> Sign In
              </button>
            )
          )}
          <Link href="/pricing" className="btn-primary" style={{
            fontSize: '0.78rem', padding: '0.4rem 1rem', borderRadius: 100,
            textDecoration: 'none',
          }}>
            Get Pro
          </Link>
          <button
            onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'none' }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '400px' : '0',
        transition: 'max-height 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        borderTop: open ? '1px solid var(--border-subtle)' : 'none',
        background: 'var(--bg)',
      }}>
        <div className="container-pad" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
              padding: '0.5rem 0.75rem', borderRadius: 6, textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: 500,
              color: pathname === l.href ? 'var(--text-primary)' : 'var(--text-muted)',
              background: pathname === l.href ? 'var(--accent-glow)' : 'transparent',
            }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
