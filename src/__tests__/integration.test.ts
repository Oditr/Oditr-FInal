// ── Integration Tests: Audit Engine Orchestration ──
// Tests the full pipeline: multiple modules running together on a shared DOM

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import type { FetchResult } from '@/lib/audit-engine/types'
import { checkMetaTags } from '@/lib/audit-engine/meta-tags'
import { checkHeadings } from '@/lib/audit-engine/headings'
import { checkSecurity } from '@/lib/audit-engine/security'
import { checkMobile } from '@/lib/audit-engine/mobile'
import { checkAccessibility } from '@/lib/audit-engine/accessibility'
import { calculateOverallScore, countBySeverity } from '@/lib/audit-engine/scorer'

// ── Realistic test page ──
const REALISTIC_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Awesome Site — Build Better Products Faster Today</title>
  <meta name="description" content="My Awesome Site helps developers build better products faster with cutting-edge tools, comprehensive documentation, and a vibrant community of builders.">
  <meta property="og:title" content="My Awesome Site">
  <meta property="og:description" content="Build better products faster">
  <meta property="og:image" content="https://example.com/og.png">
  <meta property="og:url" content="https://example.com">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://example.com">
  <link rel="icon" href="/favicon.ico">
</head>
<body>
  <header>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
  </header>
  <main>
    <h1>Welcome to My Awesome Site</h1>
    <h2>Features</h2>
    <p>We offer great features</p>
    <h3>Speed</h3>
    <p>Very fast</p>
    <h3>Security</h3>
    <p>Very secure</p>
    <h2>Pricing</h2>
    <p>Affordable for everyone</p>
    <img src="https://example.com/hero.webp" alt="Hero image" width="1200" height="600">
    <button>Get Started</button>
    <form>
      <label for="email">Email</label>
      <input type="email" id="email">
    </form>
  </main>
  <footer>
    <p>&copy; 2026 My Awesome Site</p>
  </footer>
</body>
</html>
`

function makeFetched(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    html: REALISTIC_HTML,
    headers: {
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=()',
    },
    statusCode: 200,
    url: 'https://example.com',
    timing: 350,
    ...overrides,
  }
}

// ──────────────────────────────────────────────────
// Integration: Run multiple modules on the SAME DOM
// ──────────────────────────────────────────────────

describe('Integration: Multi-module audit on a well-formed page', () => {
  const fetched = makeFetched()
  const $ = cheerio.load(REALISTIC_HTML)

  it('all modules run without errors on the same DOM', async () => {
    const [meta, headings, security, mobile, a11y] = await Promise.all([
      checkMetaTags(fetched, $),
      checkHeadings(fetched, $),
      checkSecurity(fetched, $),
      checkMobile(fetched, $),
      checkAccessibility(fetched, $),
    ])

    // All modules should return valid category results
    expect(meta.category).toBe('meta-tags')
    expect(headings.category).toBe('headings')
    expect(security.category).toBe('security')
    expect(mobile.category).toBe('mobile')
    expect(a11y.category).toBe('accessibility')

    // All scores should be between 0-100
    for (const result of [meta, headings, security, mobile, a11y]) {
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('well-formed page scores high across all modules', async () => {
    const [meta, headings, security, mobile, a11y] = await Promise.all([
      checkMetaTags(fetched, $),
      checkHeadings(fetched, $),
      checkSecurity(fetched, $),
      checkMobile(fetched, $),
      checkAccessibility(fetched, $),
    ])

    // A well-formed page should score above 70 in all modules
    expect(meta.score).toBeGreaterThanOrEqual(90)
    expect(headings.score).toBe(100)
    expect(security.score).toBeGreaterThanOrEqual(85)
    expect(mobile.score).toBeGreaterThanOrEqual(70)
    expect(a11y.score).toBeGreaterThanOrEqual(70)
  })

  it('scorer aggregates multi-module results correctly', async () => {
    const categories = await Promise.all([
      checkMetaTags(fetched, $),
      checkHeadings(fetched, $),
      checkSecurity(fetched, $),
      checkMobile(fetched, $),
      checkAccessibility(fetched, $),
    ])

    const overallScore = calculateOverallScore(categories)
    expect(overallScore).toBeGreaterThanOrEqual(70)
    expect(overallScore).toBeLessThanOrEqual(100)

    const severity = countBySeverity(categories)
    expect(severity.critical).toBeGreaterThanOrEqual(0)
    expect(severity.moderate).toBeGreaterThanOrEqual(0)
  })
})

// ──────────────────────────────────────────────────
// Integration: Broken page scores low
// ──────────────────────────────────────────────────

describe('Integration: Broken page scores low', () => {
  const brokenHtml = `<html><head></head><body><div>No semantic structure</div></body></html>`
  const fetched = makeFetched({ html: brokenHtml, url: 'http://broken.example.com', headers: {} })
  const $ = cheerio.load(brokenHtml)

  it('all modules flag many issues on a broken page', async () => {
    const [meta, headings, security, mobile, a11y] = await Promise.all([
      checkMetaTags(fetched, $),
      checkHeadings(fetched, $),
      checkSecurity(fetched, $),
      checkMobile(fetched, $),
      checkAccessibility(fetched, $),
    ])

    // Broken page should get poor scores
    expect(meta.score).toBeLessThanOrEqual(20)
    expect(headings.score).toBeLessThanOrEqual(20)
    expect(security.score).toBeLessThanOrEqual(30)
    expect(a11y.score).toBeLessThanOrEqual(50)

    const categories = [meta, headings, security, mobile, a11y]
    const overall = calculateOverallScore(categories)
    expect(overall).toBeLessThan(40)

    const { critical } = countBySeverity(categories)
    expect(critical).toBeGreaterThanOrEqual(3) // missing title, no HTTPS, no H1, no lang, etc.
  })
})

// ──────────────────────────────────────────────────
// Integration: Cache + Scoring pipeline
// ──────────────────────────────────────────────────

describe('Integration: Cache stores and retrieves audit data', () => {
  it('caches a full result and retrieves it', async () => {
    const { cacheKey, setCache, getCached, clearCache } = await import('@/lib/audit-engine/cache')
    clearCache()

    const key = cacheKey('https://example.com', 'mobile')
    const mockResult = { healthScore: 85, overallScore: 90 }
    setCache(key, mockResult)

    const cached = getCached(key)
    expect(cached).toEqual(mockResult)

    clearCache()
  })
})
