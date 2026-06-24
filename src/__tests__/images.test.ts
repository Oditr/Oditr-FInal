// ── Unit Tests: Images Audit (DOM-only checks, no network) ──

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { checkImages } from '@/lib/audit-engine/images'
import type { FetchResult } from '@/lib/audit-engine/types'

function makeFetched(html: string): FetchResult {
  return { html, headers: {}, statusCode: 200, url: 'https://example.com', timing: 100 }
}

describe('checkImages — alt text', () => {
  it('flags images without alt attribute', async () => {
    const html = `<html><body><img src="test.jpg"></body></html>`
    const result = await checkImages(makeFetched(html), cheerio.load(html))
    const altFinding = result.findings.find(f => f.id?.includes('img-no-alt'))
    expect(altFinding).toBeDefined()
    expect(altFinding!.severity).toBe('medium')
  })

  it('accepts alt="" for decorative images', async () => {
    const html = `<html><body><img src="divider.png" alt=""></body></html>`
    const result = await checkImages(makeFetched(html), cheerio.load(html))
    const altFinding = result.findings.find(f => f.id?.includes('img-no-alt'))
    expect(altFinding).toBeUndefined()
  })
})

describe('checkImages — lazy loading', () => {
  it('skips first 2 images (above the fold)', async () => {
    const html = `<html><body>
      <img src="hero.jpg" alt="hero">
      <img src="logo.png" alt="logo">
      <img src="below.jpg" alt="below">
    </body></html>`
    const result = await checkImages(makeFetched(html), cheerio.load(html))
    // Only the 3rd image (index 2) should be flagged for no lazy loading
    const lazyFindings = result.findings.filter(f => f.id?.includes('img-no-lazy'))
    expect(lazyFindings).toHaveLength(1)
  })

  it('passes when below-fold images have loading=lazy', async () => {
    const html = `<html><body>
      <img src="hero.jpg" alt="hero">
      <img src="logo.png" alt="logo">
      <img src="below.jpg" alt="below" loading="lazy">
    </body></html>`
    const result = await checkImages(makeFetched(html), cheerio.load(html))
    const lazyFindings = result.findings.filter(f => f.id?.includes('img-no-lazy'))
    expect(lazyFindings).toHaveLength(0)
  })
})

describe('checkImages — dimensions', () => {
  it('flags images without width/height attributes', async () => {
    const html = `<html><body><img src="test.jpg" alt="test"></body></html>`
    const result = await checkImages(makeFetched(html), cheerio.load(html))
    const dimFinding = result.findings.find(f => f.id?.includes('img-no-dims'))
    expect(dimFinding).toBeDefined()
  })

  it('passes when width and height are set', async () => {
    const html = `<html><body><img src="test.jpg" alt="test" width="300" height="200"></body></html>`
    const result = await checkImages(makeFetched(html), cheerio.load(html))
    const dimFinding = result.findings.find(f => f.id?.includes('img-no-dims'))
    expect(dimFinding).toBeUndefined()
  })
})
