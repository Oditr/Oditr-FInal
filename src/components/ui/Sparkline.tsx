'use client'

import { useState, useRef, useCallback } from 'react'

interface SparklineProps {
  data: number[]           // array of values (0–100 expected for scores)
  width?: number
  height?: number
  color?: string
  showDots?: boolean
  showArea?: boolean
  labels?: string[]        // optional labels for tooltip (e.g. dates)
  animate?: boolean
}

export default function Sparkline({
  data,
  width = 280,
  height = 60,
  color = '#818cf8',
  showDots = true,
  showArea = true,
  labels,
  animate = true,
}: SparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const padding = { top: 8, right: 8, bottom: 8, left: 8 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const min = data.length >= 2 ? Math.min(...data) - 5 : 0
  const max = data.length >= 2 ? Math.max(...data) + 5 : 100
  const range = max - min || 1

  const points = data.length >= 2
    ? data.map((v, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartW,
        y: padding.top + chartH - ((v - min) / range) * chartH,
        value: v,
      }))
    : []

  // Build SVG path with smooth curves (catmull-rom → cubic bezier)
  const linePath = points.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`

    const prev = points[i - 1]
    const cp1x = prev.x + (p.x - prev.x) * 0.4
    const cp2x = prev.x + (p.x - prev.x) * 0.6
    return `${path} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`
  }, '')

  // Area path (closed below the line)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : ''

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    // Find closest point
    let closestIdx = 0
    let closestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX)
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    }
    setHoveredIndex(closestIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height])

  if (data.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Need 2+ data points</span>
      </div>
    )
  }

  const gradientId = `sparkline-grad-${color.replace('#', '')}`

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
        style={{ cursor: 'crosshair', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {showArea && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            style={{
              opacity: animate ? undefined : 1,
              animation: animate ? 'fadeIn 0.6s ease forwards' : undefined,
            }}
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 1px 3px ${color}40)`,
            strokeDasharray: animate ? 1000 : undefined,
            strokeDashoffset: animate ? 1000 : undefined,
            animation: animate ? 'sparkline-draw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' : undefined,
          }}
        />

        {/* Dots */}
        {showDots && points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredIndex === i ? 4.5 : 2.5}
            fill={hoveredIndex === i ? color : 'var(--bg-card)'}
            stroke={color}
            strokeWidth={hoveredIndex === i ? 2 : 1.5}
            style={{
              transition: 'r 150ms ease, fill 150ms ease',
              opacity: animate ? 0 : 1,
              animation: animate ? `fadeIn 0.3s ease ${0.8 + i * 0.05}s forwards` : undefined,
            }}
          />
        ))}

        {/* Hover vertical line */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex].x}
            y1={padding.top}
            x2={points[hoveredIndex].x}
            y2={height - padding.bottom}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(points[hoveredIndex].x - 30, width - 72),
            top: -32,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '0.2rem 0.5rem',
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ color }}>{data[hoveredIndex]}</span>
          {labels?.[hoveredIndex] && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
              {labels[hoveredIndex]}
            </span>
          )}
        </div>
      )}

      {/* Inject sparkline-draw keyframe if not in global CSS */}
      <style>{`
        @keyframes sparkline-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
