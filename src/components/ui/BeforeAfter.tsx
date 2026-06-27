'use client'
import CodeBlock from './CodeBlock'

interface BeforeAfterProps {
  title: string
  before: { code: string; language?: string; filename?: string }
  after: { code: string; language?: string; filename?: string }
  improvement?: string
}

export default function BeforeAfter({ title, before, after, improvement }: BeforeAfterProps) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            marginBottom: '0.5rem', padding: '0.25rem 0.65rem', borderRadius: 6,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ✗ Before
            </span>
          </div>
          <CodeBlock code={before.code} language={before.language || 'html'} filename={before.filename} />
        </div>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            marginBottom: '0.5rem', padding: '0.25rem 0.65rem', borderRadius: 6,
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ✓ After
            </span>
          </div>
          <CodeBlock code={after.code} language={after.language || 'html'} filename={after.filename} />
        </div>
      </div>
      {improvement && (
        <div style={{
          marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: 10,
          background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
        }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: '#34d399' }}>Impact:</strong> {improvement}
          </p>
        </div>
      )}
    </div>
  )
}
