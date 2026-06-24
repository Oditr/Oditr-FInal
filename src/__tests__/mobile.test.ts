// ── Unit Tests: Mobile Responsiveness Audit ──

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { checkMobile } from '@/lib/audit-engine/mobile'
import type { FetchResult } from '@/lib/audit-engine/types'

function makeFetched(html: string): FetchResult {
  return { html, headers: {}, statusCode: 200, url: 'https://example.com', timing: 100 }
}

describe('checkMobile — viewport meta tag', () => {
  it('flags missing viewport meta tag as critical', async () => {
    const html = `<html><head></head><body></body></html>`
    const result = await checkMobile(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'missing-viewport')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('critical')
  })

  it('passes for correct viewport tag', async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>`
    const result = await checkMobile(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'missing-viewport')
    expect(finding).toBeUndefined()
  })

  it('flags viewport with zoom disabled', async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"></head><body></body></html>`
    const result = await checkMobile(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'viewport-zoom-disabled')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('medium')
  })
})

describe('checkMobile — fixed width elements', () => {
  it('flags elements with fixed widths > 999px', async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div style="width: 1200px"></div></body></html>`
    const result = await checkMobile(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'fixed-width-elements')
    expect(finding).toBeDefined()
  })

  it('ignores widths under 1000px', async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div style="width: 500px"></div></body></html>`
    const result = await checkMobile(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'fixed-width-elements')
    expect(finding).toBeUndefined()
  })
})
