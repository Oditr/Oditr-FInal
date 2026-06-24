// ── Sitemap Audit Module ──
// Fetches /sitemap.xml and /sitemap_index.xml from the domain root,
// validates their existence and basic XML structure.

import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkSitemap(fetched: FetchResult, _$: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // Resolve the root domain URL
  let rootUrl = ''
  try {
    const urlObj = new URL(fetched.url)
    rootUrl = `${urlObj.protocol}//${urlObj.host}`
  } catch {
    return {
      category: 'sitemap',
      label: 'Sitemap',
      score: 0,
      passed: 0,
      failed: 1,
      findings: [{
        id: 'sitemap-url-parse-error',
        title: 'Could not determine root URL',
        description: 'The audited URL could not be parsed to a valid domain root.',
        severity: 'minor',
        category: 'sitemap',
      }],
    }
  }

  // Common sitemap paths to try in order
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml']

  let foundSitemap = false
  let foundUrl = ''
  let urlCount = 0
  let isSitemapIndex = false

  for (const path of candidates) {
    try {
      const res = await fetch(`${rootUrl}${path}`, {
        headers: { 'User-Agent': 'Oditr-AuditBot/1.0' },
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const text = await res.text()
        // Basic XML validation — look for sitemap markers
        if (text.includes('<urlset') || text.includes('<sitemapindex')) {
          foundSitemap = true
          foundUrl = `${rootUrl}${path}`
          isSitemapIndex = text.includes('<sitemapindex')

          // Count URL entries (rough count via string matching, no XML parser needed)
          const urlMatches = text.match(/<url>/g) || []
          const sitemapMatches = text.match(/<sitemap>/g) || []
          urlCount = urlMatches.length + sitemapMatches.length
          break
        }
      }
    } catch {
      // Timeout or network error — continue to next candidate
    }
  }

  if (!foundSitemap) {
    failed++
    findings.push({
      id: 'sitemap-missing',
      title: 'No sitemap.xml found',
      description: `No sitemap was found at ${rootUrl}/sitemap.xml or common alternative paths. A sitemap helps search engines efficiently discover and index all pages on your site.`,
      severity: 'moderate',
      category: 'sitemap',
      recommendation: {
        fix: 'Generate a sitemap.xml and place it at your domain root. Most CMS platforms (WordPress, Shopify) and frameworks (Next.js with `next-sitemap`, Astro) can generate this automatically. Also reference it from your robots.txt using `Sitemap: https://yourdomain.com/sitemap.xml`.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
    findings.push({
      id: 'sitemap-found',
      title: `Sitemap found${isSitemapIndex ? ' (sitemap index)' : ''}`,
      description: `A valid sitemap was detected at \`${foundUrl}\`${urlCount > 0 ? ` with ${urlCount} ${isSitemapIndex ? 'child sitemaps' : 'URLs'} listed` : ''}.`,
      severity: 'info',
      category: 'sitemap',
      value: foundUrl,
    })
  }

  // Check robots.txt for Sitemap: directive
  try {
    const robotsRes = await fetch(`${rootUrl}/robots.txt`, {
      headers: { 'User-Agent': 'Oditr-AuditBot/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (robotsRes.ok) {
      const robotsText = await robotsRes.text()
      const hasSitemapDirective = /^Sitemap:/im.test(robotsText)

      if (hasSitemapDirective) {
        passed++
        findings.push({
          id: 'robots-sitemap-directive',
          title: 'Sitemap declared in robots.txt',
          description: 'Your robots.txt includes a `Sitemap:` directive, which helps all crawlers (not just Google) discover your sitemap.',
          severity: 'info',
          category: 'sitemap',
          value: 'Found',
        })
      } else {
        failed++
        findings.push({
          id: 'robots-missing-sitemap-directive',
          title: 'Sitemap not declared in robots.txt',
          description: 'Adding a `Sitemap:` directive to your robots.txt file ensures all crawlers can find your sitemap, not just those that check the standard path.',
          severity: 'minor',
          category: 'sitemap',
          recommendation: {
            fix: 'Add `Sitemap: https://yourdomain.com/sitemap.xml` at the end of your robots.txt file.',
            estimatedImpact: 'low',
          },
        })
      }
    }
  } catch {
    // robots.txt check is best-effort
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'sitemap',
    label: 'Sitemap',
    score,
    passed,
    failed,
    findings,
  }
}
