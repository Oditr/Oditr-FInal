// ── Scorer Unit Tests ──
// Tests the scoring engine — the mathematical core of Oditr

import { describe, it, expect } from 'vitest'
import {
  calculateOverallScore,
  countBySeverity,
} from '@/lib/audit-engine/scorer'
import type { CategoryResult } from '@/lib/audit-engine/types'

// ── Helper: build a minimal CategoryResult ──
function makeCat(
  category: string,
  score: number,
  findings: { severity: 'critical' | 'moderate' | 'minor' }[] = []
): CategoryResult {
  return {
    category: category as any,
    label: category,
    score,
    passed: 0,
    failed: findings.length,
    findings: findings.map((f, i) => ({
      id: `${category}-${i}`,
      title: `finding-${i}`,
      description: '',
      severity: f.severity,
      category: category as any,
    })),
  }
}

// ──────────────────────────────────────────────
// calculateOverallScore
// ──────────────────────────────────────────────

describe('calculateOverallScore', () => {
  it('returns 0 for empty categories', () => {
    expect(calculateOverallScore([])).toBe(0)
  })

  it('returns exact score for a single category', () => {
    const cats = [makeCat('images', 75)]
    expect(calculateOverallScore(cats)).toBe(75)
  })

  it('applies category weights correctly', () => {
    // security has weight 1.2, headings has weight 0.6
    const cats = [
      makeCat('security', 100),  // 100 * 1.2 = 120
      makeCat('headings', 0),    //   0 * 0.6 = 0
    ]
    // weighted avg = 120 / 1.8 = 66.67 → rounds to 67
    expect(calculateOverallScore(cats)).toBe(67)
  })

  it('returns 100 when all categories score 100', () => {
    const cats = [
      makeCat('broken-links', 100),
      makeCat('images', 100),
      makeCat('meta-tags', 100),
      makeCat('security', 100),
    ]
    expect(calculateOverallScore(cats)).toBe(100)
  })

  it('returns 0 when all categories score 0', () => {
    const cats = [
      makeCat('broken-links', 0),
      makeCat('images', 0),
    ]
    expect(calculateOverallScore(cats)).toBe(0)
  })

  it('uses default weight 1.0 for unknown categories', () => {
    const cats = [makeCat('unknown-category', 80)]
    expect(calculateOverallScore(cats)).toBe(80)
  })
})


// ──────────────────────────────────────────────
// countBySeverity
// ──────────────────────────────────────────────

describe('countBySeverity', () => {
  it('returns zeros for no findings', () => {
    expect(countBySeverity([])).toEqual({ critical: 0, moderate: 0, minor: 0 })
  })

  it('counts findings across multiple categories', () => {
    const cats = [
      makeCat('security', 50, [
        { severity: 'critical' },
        { severity: 'critical' },
      ]),
      makeCat('images', 70, [
        { severity: 'moderate' },
        { severity: 'minor' },
      ]),
    ]
    expect(countBySeverity(cats)).toEqual({ critical: 2, moderate: 1, minor: 1 })
  })

  it('ignores info-level findings in the count', () => {
    const cat: CategoryResult = {
      category: 'meta-tags',
      label: 'Meta Tags',
      score: 90,
      passed: 9,
      failed: 1,
      findings: [{
        id: 'info-1',
        title: 'Info finding',
        description: '',
        severity: 'info',
        category: 'meta-tags',
      }],
    }
    expect(countBySeverity([cat])).toEqual({ critical: 0, moderate: 0, minor: 0 })
  })
})
