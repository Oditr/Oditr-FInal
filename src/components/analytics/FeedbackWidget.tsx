'use client'

import { useState } from 'react'
import { MessageSquare, Bug, Lightbulb, X, Send, Star, ChevronDown } from 'lucide-react'

type FeedbackMode = 'general' | 'bug' | 'feature_request' | null

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<FeedbackMode>(null)
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bug report extra fields
  const [expectedBehavior, setExpectedBehavior] = useState('')

  // Feature request extra fields
  const [featureTitle, setFeatureTitle] = useState('')
  const [useCase, setUseCase] = useState('')

  const reset = () => {
    setMode(null)
    setMessage('')
    setRating(null)
    setExpectedBehavior('')
    setFeatureTitle('')
    setUseCase('')
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async () => {
    if (!message.trim() && mode !== 'feature_request') {
      setError('Please enter a message.')
      return
    }
    if (mode === 'feature_request' && !featureTitle.trim()) {
      setError('Please enter a feature title.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let endpoint = '/api/feedback'
      let body: any = {}

      if (mode === 'feature_request') {
        endpoint = '/api/feedback/feature-request'
        body = { title: featureTitle, description: message, useCase }
      } else if (mode === 'bug') {
        endpoint = '/api/feedback/bug-report'
        body = {
          whatHappened: message,
          expectedBehavior,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
          browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }
      } else {
        body = {
          type: 'general',
          message,
          rating: rating || undefined,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Submission failed')
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        reset()
      }, 2000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded Panel */}
      {open && (
        <div className="w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white">
              {mode === 'bug' ? '🐛 Report a Bug' : mode === 'feature_request' ? '💡 Feature Request' : '💬 Share Feedback'}
            </span>
            <button onClick={() => { setOpen(false); reset() }} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {success ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">🙌</div>
                <p className="text-sm text-zinc-300 font-medium">Thanks for your feedback!</p>
                <p className="text-xs text-zinc-500 mt-1">We read every submission.</p>
              </div>
            ) : (
              <>
                {/* Mode selection */}
                {!mode && (
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { m: 'general' as FeedbackMode, icon: <MessageSquare className="w-4 h-4" />, label: 'General' },
                      { m: 'bug'     as FeedbackMode, icon: <Bug           className="w-4 h-4" />, label: 'Bug' },
                      { m: 'feature_request' as FeedbackMode, icon: <Lightbulb  className="w-4 h-4" />, label: 'Request' },
                    ]).map(({ m, icon, label }) => (
                      <button
                        key={m!}
                        onClick={() => setMode(m)}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border border-zinc-700 hover:border-[#c0ff00] hover:bg-zinc-800 transition-all text-zinc-400 hover:text-[#c0ff00] text-xs font-medium"
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Bug Report */}
                {mode === 'bug' && (
                  <>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">What happened?</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Describe the issue..."
                        className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00] resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Expected behavior (optional)</label>
                      <textarea
                        value={expectedBehavior}
                        onChange={e => setExpectedBehavior(e.target.value)}
                        rows={2}
                        placeholder="What should have happened?"
                        className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00] resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Feature Request */}
                {mode === 'feature_request' && (
                  <>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Feature title *</label>
                      <input
                        value={featureTitle}
                        onChange={e => setFeatureTitle(e.target.value)}
                        placeholder="What feature do you want?"
                        className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Describe the feature and why it's useful..."
                        className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00] resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Your use case (optional)</label>
                      <input
                        value={useCase}
                        onChange={e => setUseCase(e.target.value)}
                        placeholder="How would you use this?"
                        className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00]"
                      />
                    </div>
                  </>
                )}

                {/* General */}
                {mode === 'general' && (
                  <>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Your feedback</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={4}
                        placeholder="What's on your mind?"
                        className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00] resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-2 block">How are things going? (optional)</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            onClick={() => setRating(rating === s ? null : s)}
                            className={`flex-1 py-1.5 rounded-lg text-sm transition-all ${
                              rating === s
                                ? 'bg-[#c0ff00] text-black font-bold'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {'★'.repeat(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {error && <p className="text-xs text-red-400">{error}</p>}

                {mode && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { reset() }}
                      className="flex-1 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 py-2 text-sm font-medium bg-[#c0ff00] text-black rounded-lg hover:bg-[#a0d000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <><Send className="w-3 h-3" /> Send</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        id="feedback-widget-toggle"
        onClick={() => { setOpen(!open); if (!open) reset() }}
        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-[#c0ff00] text-zinc-300 hover:text-[#c0ff00] rounded-full shadow-lg transition-all text-sm font-medium"
      >
        <MessageSquare className="w-4 h-4" />
        Feedback
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
