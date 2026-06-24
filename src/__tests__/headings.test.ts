// ── Headings Audit Module Tests ──
// Tests heading hierarchy validation (H1-H6 structure)

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { checkHeadings } from '@/lib/audit-engine/headings'
import type { FetchResult } from '@/lib/audit-engine/types'

function makeFetched(html: string): FetchResult {
  return { html, headers: {}, statusCode: 200, url: 'https://example.com', timing: 100 }
}

function load(html: string) {
  return cheerio.load(html)
}

// ──────────────────────────────────────────────
describe('checkHeadings — valid structure', () => {
  it('scores 100 for proper H1 → H2 → H3 hierarchy', async () => {
    const html = `
      <html><body>
        <h1>Main Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
        <h2>Another Section</h2>
      </body></html>
    `
    const result = await checkHeadings(makeFetched(html), load(html))

    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────
describe('checkHeadings — missing H1', () => {
  it('flags missing H1 as critical', async () => {
    const html = `<html><body><h2>No H1 here</h2></body></html>`
    const result = await checkHeadings(makeFetched(html), load(html))

    const noH1 = result.findings.find(f => f.id === 'no-h1')
    expect(noH1).toBeDefined()
    expect(noH1!.severity).toBe('critical')
  })
})

// ──────────────────────────────────────────────
describe('checkHeadings — multiple H1s', () => {
  it('flags multiple H1s as medium', async () => {
    const html = `
      <html><body>
        <h1>First H1</h1>
        <h1>Second H1</h1>
      </body></html>
    `
    const result = await checkHeadings(makeFetched(html), load(html))

    const multi = result.findings.find(f => f.id === 'multiple-h1')
    expect(multi).toBeDefined()
    expect(multi!.severity).toBe('medium')
    expect(multi!.value).toBe('2')
  })
})

// ──────────────────────────────────────────────
describe('checkHeadings — skipped levels', () => {
  it('detects H1 → H3 skip (missing H2)', async () => {
    const html = `
      <html><body>
        <h1>Title</h1>
        <h3>Jumped to H3</h3>
      </body></html>
    `
    const result = await checkHeadings(makeFetched(html), load(html))

    const skip = result.findings.find(f => f.id?.startsWith('skipped-level'))
    expect(skip).toBeDefined()
    expect(skip!.severity).toBe('medium')
  })
})

// ──────────────────────────────────────────────
describe('checkHeadings — empty headings', () => {
  it('flags empty heading elements', async () => {
    const html = `
      <html><body>
        <h1>Good Title</h1>
        <h2></h2>
      </body></html>
    `
    const result = await checkHeadings(makeFetched(html), load(html))

    const empty = result.findings.find(f => f.id?.startsWith('empty-heading'))
    expect(empty).toBeDefined()
    expect(empty!.severity).toBe('medium')
  })
})

// ──────────────────────────────────────────────
describe('checkHeadings — no headings', () => {
  it('flags a page with zero headings as critical', async () => {
    const html = `<html><body><p>No headings at all</p></body></html>`
    const result = await checkHeadings(makeFetched(html), load(html))

    const noHeadings = result.findings.find(f => f.id === 'no-headings')
    expect(noHeadings).toBeDefined()
    expect(noHeadings!.severity).toBe('critical')
  })
})

// ──────────────────────────────────────────────
describe('checkHeadings — H1 not first', () => {
  it('flags when first heading is not H1', async () => {
    const html = `
      <html><body>
        <h2>Before H1</h2>
        <h1>After H2</h1>
      </body></html>
    `
    const result = await checkHeadings(makeFetched(html), load(html))

    const notFirst = result.findings.find(f => f.id === 'h1-not-first')
    expect(notFirst).toBeDefined()
  })
})
