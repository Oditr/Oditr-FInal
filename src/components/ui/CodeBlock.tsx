'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  code: string
  language?: string
  filename?: string
}

export default function CodeBlock({ code, language = 'javascript', filename }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple syntax highlighting via CSS
  return (
    <div style={{
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      background: '#0d0d14',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 1rem',
        background: '#0a0a11',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          {filename && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {filename}
            </span>
          )}
          {!filename && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language}
            </span>
          )}
        </div>
        <button
          id={`copy-${filename || language}`}
          onClick={copy}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.65rem', borderRadius: 6,
            border: '1px solid var(--border)',
            background: copied ? 'var(--green-glow)' : 'transparent',
            color: copied ? 'var(--green)' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div style={{ overflowX: 'auto' }}>
        <pre style={{
          margin: 0, padding: '1.25rem 1.25rem',
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          fontSize: '0.82rem', lineHeight: 1.75,
          color: '#c9d1d9',
          whiteSpace: 'pre',
          tabSize: 2,
        }}>
          <code dangerouslySetInnerHTML={{ __html: highlight(code, language) }} />
        </pre>
      </div>
    </div>
  )
}

function highlight(code: string, lang: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Comments
  html = html.replace(/(\/\/[^\n]*)/g, '<span style="color:#6a737d;font-style:italic">$1</span>')
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a737d;font-style:italic">$1</span>')

  // Strings
  html = html.replace(/(&apos;|&#39;|`[^`]*`|'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g,
    '<span style="color:#a8d8a8">$1</span>')

  // Keywords
  const kw = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'default', 'from', 'async', 'await', 'new', 'class', 'extends', 'typeof', 'null', 'undefined', 'true', 'false', 'try', 'catch', 'finally', 'throw']
  kw.forEach(k => {
    html = html.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span style="color:#ff79c6">$1</span>')
  })

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#bd93f9">$1</span>')

  // Functions
  html = html.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span style="color:#8be9fd">$1</span>')

  return html
}
