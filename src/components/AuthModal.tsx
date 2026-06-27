'use client'

import { useState } from 'react'
import { X, Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from './providers/AuthProvider'

interface AuthModalProps {
  onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!email || !password) {
      setError('Email and password are required')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) { setError(error); setLoading(false) }
      else onClose()
    } else {
      const { error } = await signUp(email, password)
      if (error) { setError(error); setLoading(false) }
      else {
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setLoading(false)
      }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 200ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          animation: 'scaleIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {mode === 'signin'
            ? 'Sign in to sync your scan history across devices.'
            : 'Create an account to save your audits to the cloud.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.5rem',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-primary)',
                fontSize: '0.85rem', outline: 'none',
                transition: 'border-color 150ms ease',
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.5rem',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text-primary)',
                fontSize: '0.85rem', outline: 'none',
                transition: 'border-color 150ms ease',
              }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.75rem', borderRadius: 8,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171', fontSize: '0.78rem', fontWeight: 500,
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.75rem', borderRadius: 8,
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
              color: '#34d399', fontSize: '0.78rem', fontWeight: 500,
            }}>
              <CheckCircle size={14} /> {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%', padding: '0.75rem',
              borderRadius: 10, fontSize: '0.88rem', fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              marginTop: '0.25rem',
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)',
              textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
