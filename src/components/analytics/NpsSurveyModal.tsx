'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface NpsSurveyModalProps {
  onClose: () => void
  workspaceId?: string
}

export function NpsSurveyModal({ onClose, workspaceId }: NpsSurveyModalProps) {
  const [score, setScore] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (score === null) {
      setError('Please select a score.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/feedback/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, reason, workspaceId }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Submission failed')
      }

      setSuccess(true)
      setTimeout(onClose, 2500)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getScoreLabel = (s: number) => {
    if (s <= 6) return 'Not likely'
    if (s <= 8) return 'Neutral'
    return 'Very likely'
  }

  const getScoreColor = (s: number, selected: number | null) => {
    const isSelected = selected === s
    if (!isSelected) return 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
    if (s <= 6) return 'bg-red-500/20 border-red-500 text-red-400'
    if (s <= 8) return 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
    return 'bg-[#c0ff00]/20 border-[#c0ff00] text-[#c0ff00]'
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-white font-semibold">How are we doing?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Takes 10 seconds. Helps us a lot.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🙏</div>
              <p className="text-white font-medium">Thank you!</p>
              <p className="text-zinc-400 text-sm mt-1">Your feedback shapes Øditr&apos;s future.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-zinc-300 mb-4">
                  How likely are you to recommend <span className="text-white font-medium">Øditr</span> to a colleague?
                </p>

                <div className="grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setScore(i)}
                      className={`aspect-square rounded-lg border text-xs font-semibold transition-all ${getScoreColor(i, score)}`}
                    >
                      {i}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between text-xs text-zinc-500 mt-2">
                  <span>Not at all likely</span>
                  <span>Extremely likely</span>
                </div>

                {score !== null && (
                  <p className="text-center text-xs mt-2 text-zinc-400">
                    You selected <span className="text-white font-medium">{score}/10</span> — {getScoreLabel(score)}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">
                  What&apos;s the main reason? <span className="text-zinc-600">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us more..."
                  className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#c0ff00] resize-none transition-colors"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || score === null}
                  className="flex-1 py-2.5 text-sm font-semibold bg-[#c0ff00] text-black rounded-lg hover:bg-[#a0d000] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Hook to trigger NPS after meaningful usage ──
export function useNpsTrigger() {
  const [showNps, setShowNps] = useState(false)

  const maybeShowNps = (auditCount: number) => {
    // Show NPS after 3 audits, only once per session
    if (auditCount >= 3) {
      const shownAt = localStorage.getItem('oditr_nps_shown')
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      if (!shownAt || Number(shownAt) < thirtyDaysAgo) {
        setShowNps(true)
        localStorage.setItem('oditr_nps_shown', String(Date.now()))
      }
    }
  }

  return { showNps, setShowNps, maybeShowNps }
}
