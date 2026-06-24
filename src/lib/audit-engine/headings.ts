// ── Heading Hierarchy Validation ──
// Checks H1-H6 structure: single H1, proper nesting, no skipped levels

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkHeadings(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // Collect all headings in order
  const headings: { level: number; text: string }[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase() || ''
    const level = parseInt(tag.replace('h', ''), 10)
    const text = $(el).text().trim().slice(0, 100)
    headings.push({ level, text })
  })

  // ── Check: exactly one H1 ──
  const h1Count = headings.filter(h => h.level === 1).length
  if (h1Count === 0) {
    failed++
    findings.push({
      id: 'no-h1',
      title: 'Missing H1 heading',
      description: 'Every page should have exactly one H1 element as the main heading',
      severity: 'critical',
      category: 'headings',
    })
  } else if (h1Count > 1) {
    failed++
    findings.push({
      id: 'multiple-h1',
      title: `Multiple H1 headings (${h1Count})`,
      description: 'Only one H1 should exist per page. Use H2-H6 for sub-sections.',
      severity: 'medium',
      category: 'headings',
      value: String(h1Count),
    })
  } else {
    passed++
  }

  // ── Check: proper nesting (no skipped levels) ──
  let prevLevel = 0
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      failed++
      findings.push({
        id: `skipped-level-h${prevLevel}-h${h.level}`,
        title: `Skipped heading level: H${prevLevel} → H${h.level}`,
        description: `Heading levels should not skip. After H${prevLevel}, the next heading should be H${prevLevel} or H${prevLevel + 1}.`,
        severity: 'medium',
        category: 'headings',
        value: `H${prevLevel} → H${h.level}`,
        element: `<h${h.level}>${h.text}</h${h.level}>`,
      })
    } else {
      passed++
    }
    prevLevel = h.level
  }

  // ── Check: H1 is the first heading ──
  if (headings.length > 0 && headings[0].level !== 1) {
    failed++
    findings.push({
      id: 'h1-not-first',
      title: `First heading is H${headings[0].level}, not H1`,
      description: 'The first heading on the page should be an H1 element',
      severity: 'low',
      category: 'headings',
      element: `<h${headings[0].level}>${headings[0].text}</h${headings[0].level}>`,
    })
  } else if (headings.length > 0) {
    passed++
  }

  // ── Check: empty headings ──
  let emptyCount = 0
  for (const h of headings) {
    if (!h.text) {
      emptyCount++
      failed++
      findings.push({
        id: `empty-heading-${emptyCount}`,
        title: `Empty H${h.level} heading`,
        description: 'Headings should contain descriptive text for SEO and accessibility',
        severity: 'medium',
        category: 'headings',
        element: `<h${h.level}></h${h.level}>`,
      })
    }
  }

  // ── Check: no headings at all ──
  if (headings.length === 0) {
    failed++
    findings.push({
      id: 'no-headings',
      title: 'No headings found on page',
      description: 'Pages should use heading elements (H1-H6) to structure content',
      severity: 'critical',
      category: 'headings',
    })
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'headings',
    label: 'Heading Structure',
    score,
    passed,
    failed,
    findings,
  }
}
