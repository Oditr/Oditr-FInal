// ── Meta Tags Audit Module Tests ──
// Tests SEO meta tag validation against realistic HTML

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { checkMetaTags } from '@/lib/audit-engine/meta-tags'
import type { FetchResult } from '@/lib/audit-engine/types'

// ── Helper: build test fixtures ──

function makeFetched(html: string): FetchResult {
  return {
    html,
    headers: {},
    statusCode: 200,
    url: 'https://example.com',
    timing: 100,
  }
}

function load(html: string) {
  return cheerio.load(html)
}

// ──────────────────────────────────────────────
// Perfect page — all meta tags present
// ──────────────────────────────────────────────

const PERFECT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VitalFix — Website Health Analyzer (45 chars)</title>
  <meta name="description" content="VitalFix analyzes your website performance, security, accessibility, and SEO. Get actionable recommendations to improve your site health score instantly.">
  <meta property="og:title" content="VitalFix">
  <meta property="og:description" content="Website health analysis">
  <meta property="og:image" content="https://vitalfix.dev/og.png">
  <meta property="og:url" content="https://vitalfix.dev">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://vitalfix.dev">
  <link rel="icon" href="/favicon.ico">
</head>
<body><h1>Hello</h1></body>
</html>
`

describe('checkMetaTags — perfect page', () => {
  it('scores 100 with all tags present', async () => {
    const fetched = makeFetched(PERFECT_HTML)
    const result = await checkMetaTags(fetched, load(PERFECT_HTML))

    expect(result.category).toBe('meta-tags')
    expect(result.label).toBe('Meta Tags & SEO')
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
    expect(result.failed).toBe(0)
  })
})

// ──────────────────────────────────────────────
// Empty page — all tags missing
// ──────────────────────────────────────────────

const EMPTY_HTML = `<!DOCTYPE html><html><head></head><body></body></html>`

describe('checkMetaTags — empty page', () => {
  it('flags all missing tags', async () => {
    const fetched = makeFetched(EMPTY_HTML)
    const result = await checkMetaTags(fetched, load(EMPTY_HTML))

    expect(result.score).toBeLessThan(20)
    expect(result.failed).toBeGreaterThan(5)
    expect(result.passed).toBe(0)

    // Should have critical findings for title and description
    const criticals = result.findings.filter(f => f.severity === 'critical')
    expect(criticals.length).toBeGreaterThanOrEqual(2)

    const ids = result.findings.map(f => f.id)
    expect(ids).toContain('missing-title')
    expect(ids).toContain('missing-meta-desc')
    expect(ids).toContain('missing-canonical')
    expect(ids).toContain('missing-favicon')
    expect(ids).toContain('missing-charset')
  })
})

// ──────────────────────────────────────────────
// Edge cases — boundary values
// ──────────────────────────────────────────────

describe('checkMetaTags — edge cases', () => {
  it('flags title shorter than 30 chars', async () => {
    const html = `<html><head><title>Short</title></head><body></body></html>`
    const fetched = makeFetched(html)
    const result = await checkMetaTags(fetched, load(html))

    const finding = result.findings.find(f => f.id === 'title-too-short')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('medium')
  })

  it('flags title longer than 60 chars', async () => {
    const longTitle = 'A'.repeat(65)
    const html = `<html><head><title>${longTitle}</title></head><body></body></html>`
    const fetched = makeFetched(html)
    const result = await checkMetaTags(fetched, load(html))

    const finding = result.findings.find(f => f.id === 'title-too-long')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('low')
  })

  it('flags meta description shorter than 120 chars', async () => {
    const html = `<html><head><meta name="description" content="Too short desc"></head><body></body></html>`
    const fetched = makeFetched(html)
    const result = await checkMetaTags(fetched, load(html))

    const finding = result.findings.find(f => f.id === 'meta-desc-short')
    expect(finding).toBeDefined()
  })

  it('flags meta description longer than 160 chars', async () => {
    const longDesc = 'X'.repeat(170)
    const html = `<html><head><meta name="description" content="${longDesc}"></head><body></body></html>`
    const fetched = makeFetched(html)
    const result = await checkMetaTags(fetched, load(html))

    const finding = result.findings.find(f => f.id === 'meta-desc-long')
    expect(finding).toBeDefined()
  })

  it('detects charset via http-equiv', async () => {
    const html = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body></body></html>`
    const fetched = makeFetched(html)
    const result = await checkMetaTags(fetched, load(html))

    const charsetMissing = result.findings.find(f => f.id === 'missing-charset')
    expect(charsetMissing).toBeUndefined()
  })
})
