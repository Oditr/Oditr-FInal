// ── Broken Link Detection ──
// Crawls all <a href> links, HEAD-checks internal links

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import { headRequest, resolveUrl } from './fetcher'
import type { CheerioAPI } from './index'

const MAX_LINKS = 50
const CONCURRENCY = 10

export async function checkBrokenLinks(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const baseUrl = fetched.url
  const baseHost = new URL(baseUrl).hostname

  // Collect unique links
  const seen = new Set<string>()
  const links: { href: string; text: string; isInternal: boolean }[] = []

  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href')?.trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return
    const resolved = resolveUrl(raw, baseUrl)
    if (!resolved || seen.has(resolved)) return
    seen.add(resolved)
    const isInternal = (() => {
      try { return new URL(resolved).hostname === baseHost } catch { return false }
    })()
    links.push({ href: resolved, text: $(el).text().trim().slice(0, 80) || raw, isInternal })
  })

  // HEAD-check internal links (limit to MAX_LINKS)
  const toCheck = links.filter(l => l.isInternal).slice(0, MAX_LINKS)
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // Process in batches of CONCURRENCY
  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const batch = toCheck.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (link) => {
        const res = await headRequest(link.href)
        return { link, res }
      })
    )

    for (let j = 0; j < results.length; j++) {
      const r = results[j]
      if (r.status === 'fulfilled') {
        const { link, res } = r.value
        if (!res.ok) {
          // 403/401 are often false positives — servers reject HEAD but serve GET fine
          const isAuthReject = res.status === 403 || res.status === 401
          if (!isAuthReject) failed++
          findings.push({
            id: `broken-link-${i + j + 1}`,
            title: `Broken link: ${res.status || 'timeout'}`,
            description: `"${link.text}" → ${link.href}`,
            severity: isAuthReject ? 'info' : res.status >= 500 ? 'critical' : res.status === 404 ? 'medium' : 'low',
            category: 'broken-links',
            value: String(res.status || 'timeout'),
            element: `<a href="${link.href}">${link.text}</a>`,
          })
          if (isAuthReject) passed++ // Don't penalize score for auth rejections
        } else {
          passed++
        }
      } else {
        failed++
        const link = batch[j]
        findings.push({
          id: `broken-link-${failed}`,
          title: 'Link check failed (timeout)',
          description: `Could not reach: ${link.href}`,
          severity: 'low',
          category: 'broken-links',
          value: 'timeout',
        })
      }
    }
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'broken-links',
    label: 'Broken Links',
    score,
    passed,
    failed,
    findings,
  }
}
