'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      title="Toggle theme"
      style={{
        width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--bg-card)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-secondary)', transition: 'all 0.2s',
      }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
