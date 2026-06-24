// ── Scorer Unit Tests ──
// Tests the scoring engine — the mathematical core of VitalFix

import { describe, it, expect } from 'vitest'
import {
  calculateHealthScore,
  countBySeverity,
  buildCustomAuditResult,
  calculateUnifiedScores
} from '@/lib/audit-engine/scorer'
import type { CategoryResult, AuditIssue } from '@/lib/audit-engine/types'

// ── Helper: build a minimal CategoryResult ──
function makeCat(
  category: string,
  score: number,
  findings: { severity: 'critical' | 'high' | 'medium' | 'low' }[] = []
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
// calculateUnifiedScores
// ──────────────────────────────────────────────

describe('calculateUnifiedScores', () => {
  it('deducts correctly based on severity', () => {
    const issues: AuditIssue[] = [
      {
        id: '1', title: 'Issue 1', description: '', category: 'security',
        severity: 'critical', affectedUrl: '', evidence: {}, impact: '',
        recommendation: '', fixDifficulty: 'unknown', revenueRelevant: false, createdAt: ''
      },
      {
        id: '2', title: 'Issue 2', description: '', category: 'security',
        severity: 'high', affectedUrl: '', evidence: {}, impact: '',
        recommendation: '', fixDifficulty: 'unknown', revenueRelevant: false, createdAt: ''
      }
    ]
    const { categoryScores } = calculateUnifiedScores(issues, { scores: { performance: 100 } })
    // Security starts at 100. Critical (-25) + High (-15) = -40 => 60
    expect(categoryScores.security.score).toBe(60)
  })
})

// ──────────────────────────────────────────────
// buildCustomAuditResult
// ──────────────────────────────────────────────

describe('buildCustomAuditResult', () => {
  it('builds a custom audit result correctly', () => {
    const cats = [
      makeCat('security', 50, [
        { severity: 'critical' },
        { severity: 'high' },
      ]),
      makeCat('images', 70, [
        { severity: 'medium' },
        { severity: 'low' },
      ]),
    ]
    const result = buildCustomAuditResult('https://example.com', cats, 1000)
    expect(result.totalFindings).toBe(4)
    expect(result.critical).toBe(1)
    expect(result.high).toBe(1)
    expect(result.medium).toBe(1)
    expect(result.low).toBe(1)
  })
})

// ──────────────────────────────────────────────
// calculateHealthScore
// ──────────────────────────────────────────────

describe('calculateHealthScore', () => {
  it('blends Lighthouse (60%) + custom audit (40%)', () => {
    // 100 * 0.6 + 100 * 0.4 = 100
    expect(calculateHealthScore(100, 100)).toBe(100)
  })

  it('returns 0 when both inputs are 0', () => {
    expect(calculateHealthScore(0, 0)).toBe(0)
  })

  it('weights Lighthouse more heavily', () => {
    // 100 * 0.6 + 0 * 0.4 = 60
    expect(calculateHealthScore(100, 0)).toBe(60)
    // 0 * 0.6 + 100 * 0.4 = 40
    expect(calculateHealthScore(0, 100)).toBe(40)
  })

  it('rounds the result', () => {
    // 33 * 0.6 + 77 * 0.4 = 19.8 + 30.8 = 50.6 → 51
    expect(calculateHealthScore(33, 77)).toBe(51)
  })
})

// ──────────────────────────────────────────────
// countBySeverity
// ──────────────────────────────────────────────

describe('countBySeverity', () => {
  it('returns zeros for no findings', () => {
    expect(countBySeverity([])).toEqual({ critical: 0, high: 0, medium: 0, low: 0 })
  })

  it('counts findings across multiple categories', () => {
    const cats = [
      makeCat('security', 50, [
        { severity: 'critical' },
        { severity: 'critical' },
      ]),
      makeCat('images', 70, [
        { severity: 'high' },
        { severity: 'low' },
      ]),
    ]
    expect(countBySeverity(cats)).toEqual({ critical: 2, high: 1, medium: 0, low: 1 })
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
    expect(countBySeverity([cat])).toEqual({ critical: 0, high: 0, medium: 0, low: 0 })
  })
})
