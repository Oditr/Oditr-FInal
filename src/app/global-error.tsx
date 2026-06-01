'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Only load and report to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error)
      })
    } else {
      console.error('[GlobalError]', error)
    }
  }, [error])
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a12',
        color: '#e2e8f0',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          padding: '2.5rem',
          textAlign: 'center',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <AlertTriangle size={24} color="#f87171" />
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Application Error
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
            An unexpected error occurred. This has been logged and will be investigated.
          </p>

          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            color: '#64748b',
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '1.5rem',
            wordBreak: 'break-word',
            maxHeight: 80,
            overflow: 'auto',
          }}>
            {error.message || 'Unknown error'}
          </p>

          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.4rem', borderRadius: 8,
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
              border: 'none', cursor: 'pointer',
              transition: 'opacity 150ms',
            }}
          >
            <RefreshCw size={14} />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
