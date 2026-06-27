'use client'

interface ScoreRingProps {
  score: number       // 0–100
  size?: number
  strokeWidth?: number
  label?: string
  color?: string
}

export default function ScoreRing({ score, size = 120, strokeWidth = 6, label, color }: ScoreRingProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const autoColor = score >= 90 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
  const ringColor = color || autoColor

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
          opacity={0.5}
        />
        {/* Score ring */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={ringColor} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease',
            filter: `drop-shadow(0 0 6px ${ringColor}40)`,
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: size * 0.24,
          fontWeight: 800,
          color: ringColor,
          lineHeight: 1,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {score}
        </span>
        {label && (
          <span style={{ fontSize: size * 0.09, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500, letterSpacing: '0.02em' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
