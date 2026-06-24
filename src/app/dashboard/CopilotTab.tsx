'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, Send, Sparkles, User, AlertTriangle, Copy, CheckCircle,
  RefreshCw, Trash2, MessageSquare,
} from 'lucide-react'
import type { AuditResult, IntelligenceReport } from './types'

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// ═══════════════════════════════════════════════
// SUGGESTED PROMPTS
// ═══════════════════════════════════════════════

const SUGGESTED_PROMPTS = [
  'What is the biggest issue hurting my performance?',
  'Why is my LCP score slow?',
  'Give me the top 3 fixes ranked by impact.',
  'Explain my Health Score breakdown.',
  'How do I fix render-blocking resources?',
  'What does my CLS score mean for users?',
]

// ═══════════════════════════════════════════════
// HELPER: Build context payload
// ═══════════════════════════════════════════════

function buildContext(result: AuditResult) {
  const intel = result.intelligence
  if (!intel) return null

  return {
    url: result.url,
    strategy: result.strategy,
    healthScore: result.healthScore,
    scores: result.scores,
    cwv: result.cwv,
    fieldData: result.fieldData,
    intelligence: {
      version: intel.version,
      generatedAt: intel.generatedAt,
      totalIssues: intel.totalIssues,
      fixFirst: intel.fixFirst.map(i => ({
        id: i.id,
        title: i.title,
        priorityScore: i.priorityScore,
        impactScore: i.impactScore,
        effortScore: i.effortScore,
        confidenceScore: i.confidenceScore,
        businessNarrative: i.businessNarrative,
        whyItMatters: i.whyItMatters,
        expectedBenefit: i.expectedBenefit,
        estimatedImprovement: i.estimatedImprovement,
        affectedMetrics: i.affectedMetrics,
        frameworkHint: i.frameworkHint,
      })),
      fixNext: intel.fixNext.map(i => ({
        id: i.id,
        title: i.title,
        priorityScore: i.priorityScore,
        impactScore: i.impactScore,
        businessNarrative: i.businessNarrative,
        affectedMetrics: i.affectedMetrics,
      })),
      optionalCount: intel.optional.length,
      businessSummary: intel.businessSummary,
      oditrScore: intel.oditrScore,
      detectedFramework: intel.detectedFramework,
      siteContext: intel.siteContext,
      trust: intel.trust,
    },
  }
}

// ═══════════════════════════════════════════════
// MARKDOWN RENDERER (simple)
// ═══════════════════════════════════════════════

function renderMarkdown(text: string) {
  // Split into blocks: code blocks and everything else
  const parts: { type: 'text' | 'code'; content: string; lang?: string }[] = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  let lastIdx = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', content: text.slice(lastIdx, match.index) })
    }
    parts.push({ type: 'code', content: match[2], lang: match[1] || 'text' })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIdx) })
  }

  return parts.map((part, i) => {
    if (part.type === 'code') {
      return <CodeBlock key={i} code={part.content} lang={part.lang || 'text'} />
    }
    // Simple inline markdown
    const html = part.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(129,140,248,0.12);padding:0.1rem 0.3rem;border-radius:3px;font-size:0.78rem;font-family:JetBrains Mono,monospace;color:#a78bfa">$1</code>')
      .replace(/^### (.*$)/gm, '<h3 style="font-size:0.88rem;font-weight:700;margin:0.75rem 0 0.3rem;color:var(--text-primary)">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="font-size:0.95rem;font-weight:700;margin:0.85rem 0 0.35rem;color:var(--text-primary)">$1</h2>')
      .replace(/^- (.*$)/gm, '<li style="margin-left:1rem;margin-bottom:0.2rem;list-style:disc">$1</li>')
      .replace(/\n/g, '<br/>')

    return (
      <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
    )
  })
}

// ═══════════════════════════════════════════════
// CODE BLOCK COMPONENT
// ═══════════════════════════════════════════════

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative', margin: '0.5rem 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.35rem 0.75rem', borderRadius: '6px 6px 0 0',
        background: '#161622', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang}</span>
        <button
          onClick={copy}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.2rem',
            padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.6rem',
            fontWeight: 600, cursor: 'pointer', border: 'none',
            background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
            color: copied ? '#34d399' : '#94a3b8',
            transition: 'all 150ms',
          }}
        >
          {copied ? <><CheckCircle size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
        </button>
      </div>
      <pre style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
        padding: '0.75rem', borderRadius: '0 0 6px 6px',
        background: '#0d0d14', color: '#c9d1d9',
        lineHeight: 1.6, overflow: 'auto', maxHeight: 250,
        margin: 0,
      }}>
        {code.trim()}
      </pre>
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN COPILOT TAB
// ═══════════════════════════════════════════════

export default function CopilotTab({ result }: { result: AuditResult }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const intel = result.intelligence

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isLoading) return

    setInput('')
    setError(null)
    if (inputRef.current) inputRef.current.style.height = 'auto'

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsLoading(true)

    try {
      const context = buildContext(result)
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText }
          return updated
        })
      }

      // If we got nothing, show a fallback
      if (!fullText) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'I received your message but couldn\'t generate a response. Please try again.',
          }
          return updated
        })
      }
    } catch (err: any) {
      setError(err.message)
      // Remove the empty assistant message
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, result])

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  // ── No intelligence data ──
  if (!intel) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Bot size={28} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Copilot Unavailable</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          The AI Copilot requires intelligence data from a completed audit. Run an audit first.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 420px)', minHeight: 400 }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.85rem 1.15rem', marginBottom: '0.75rem',
        borderRadius: 12, background: 'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(52,211,153,0.06))',
        border: '1px solid rgba(129,140,248,0.2)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(129,140,248,0.15)',
        }}>
          <Sparkles size={16} color="#818cf8" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>Øditr Copilot</span>
          <span style={{
            fontSize: '0.62rem', fontWeight: 600, marginLeft: '0.5rem',
            padding: '0.1rem 0.4rem', borderRadius: 4,
            background: 'rgba(52,211,153,0.12)', color: '#34d399',
            border: '1px solid rgba(52,211,153,0.25)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            AI-Powered
          </span>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.15rem' }}>
            Ask anything about your audit for <strong style={{ color: '#60a5fa' }}>{result.url}</strong>
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.6rem', borderRadius: 6, fontSize: '0.68rem',
              fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-muted)',
              transition: 'all 150ms',
            }}
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* ── Chat Area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '0.5rem',
          borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}
      >
        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(129,140,248,0.1)', marginBottom: '1rem',
            }}>
              <MessageSquare size={22} color="#818cf8" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Ask me about your audit
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380, lineHeight: 1.6, marginBottom: '1.25rem' }}>
              I've analyzed the intelligence report for <strong style={{ color: '#60a5fa' }}>{result.url}</strong>.
              Ask me anything about performance issues, fixes, or what to prioritize.
            </p>

            {/* Suggested prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', maxWidth: 500 }}>
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.72rem',
                    fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(129,140,248,0.08)', color: '#818cf8',
                    border: '1px solid rgba(129,140,248,0.2)',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'rgba(129,140,248,0.15)'
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'rgba(129,140,248,0.08)'
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex', gap: '0.6rem',
              alignItems: 'flex-start',
              padding: '0.75rem',
              borderRadius: 10,
              background: msg.role === 'user' ? 'rgba(96,165,250,0.06)' : 'rgba(129,140,248,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(96,165,250,0.15)' : 'rgba(129,140,248,0.1)'}`,
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: msg.role === 'user' ? 'rgba(96,165,250,0.15)' : 'rgba(129,140,248,0.15)',
            }}>
              {msg.role === 'user'
                ? <User size={13} color="#60a5fa" />
                : <Bot size={13} color="#818cf8" />}
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {msg.role === 'assistant' && msg.content === '' && isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.78rem' }}>Analyzing your audit data…</span>
                </div>
              ) : msg.role === 'assistant' ? (
                <div>{renderMarkdown(msg.content)}</div>
              ) : (
                <p style={{ margin: 0 }}>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 0.85rem', marginTop: '0.5rem',
          borderRadius: 8, background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
        }}>
          <AlertTriangle size={13} color="#f87171" />
          <span style={{ fontSize: '0.75rem', color: '#f87171', flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.65rem',
              cursor: 'pointer', border: 'none',
              background: 'rgba(248,113,113,0.15)', color: '#f87171',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Input Area ── */}
      <div style={{
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
        padding: '0.65rem', marginTop: '0.5rem',
        borderRadius: 12, border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        transition: 'border-color 200ms',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); resizeTextarea() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          disabled={isLoading}
          placeholder="Ask about your performance audit…"
          rows={1}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', color: 'var(--text-primary)',
            fontSize: '0.82rem', fontFamily: 'inherit', lineHeight: 1.5,
            padding: '0.3rem 0.4rem', minHeight: '1.5rem', maxHeight: 120,
            opacity: isLoading ? 0.5 : 1,
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            border: 'none',
            background: input.trim() && !isLoading
              ? 'linear-gradient(135deg, #818cf8, #60a5fa)'
              : 'var(--border)',
            color: '#fff',
            transition: 'all 200ms',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
          }}
        >
          {isLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
