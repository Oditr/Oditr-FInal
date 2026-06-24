// ── Meta Tags Validation ──
// Checks title, description, OG tags, Twitter cards, canonical, favicon

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkMetaTags(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // ── Title ──
  const title = $('title').text().trim()
  if (!title) {
    failed++
    findings.push({
      id: 'missing-title',
      title: 'Missing <title> tag',
      description: 'Every page must have a title tag for SEO and browser tabs',
      severity: 'critical',
      category: 'meta-tags',
    })
  } else if (title.length < 30) {
    failed++
    findings.push({
      id: 'title-too-short',
      title: `Title too short (${title.length} chars)`,
      description: `Title should be 30–60 characters. Current: "${title}"`,
      severity: 'medium',
      category: 'meta-tags',
      value: `${title.length} chars`,
    })
  } else if (title.length > 60) {
    failed++
    findings.push({
      id: 'title-too-long',
      title: `Title too long (${title.length} chars)`,
      description: `Title may be truncated in search results. Keep under 60 characters.`,
      severity: 'low',
      category: 'meta-tags',
      value: `${title.length} chars`,
    })
  } else {
    passed++
  }

  // ── Meta Description ──
  const desc = $('meta[name="description"]').attr('content')?.trim()
  if (!desc) {
    failed++
    findings.push({
      id: 'missing-meta-desc',
      title: 'Missing meta description',
      description: 'Add a meta description for better search engine snippets',
      severity: 'critical',
      category: 'meta-tags',
    })
  } else if (desc.length < 120) {
    failed++
    findings.push({
      id: 'meta-desc-short',
      title: `Meta description short (${desc.length} chars)`,
      description: `Ideal length is 120–160 characters for full display in search results`,
      severity: 'low',
      category: 'meta-tags',
      value: `${desc.length} chars`,
    })
  } else if (desc.length > 160) {
    failed++
    findings.push({
      id: 'meta-desc-long',
      title: `Meta description long (${desc.length} chars)`,
      description: `Will be truncated in search results. Keep under 160 characters.`,
      severity: 'low',
      category: 'meta-tags',
      value: `${desc.length} chars`,
    })
  } else {
    passed++
  }

  // ── Open Graph ──
  const ogTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
  for (const tag of ogTags) {
    const val = $(`meta[property="${tag}"]`).attr('content')?.trim()
    if (!val) {
      failed++
      findings.push({
        id: `missing-${tag}`,
        title: `Missing ${tag}`,
        description: `Open Graph tag "${tag}" is missing. Important for social sharing.`,
        severity: tag === 'og:title' || tag === 'og:image' ? 'medium' : 'low',
        category: 'meta-tags',
      })
    } else {
      passed++
    }
  }

  // ── Twitter Card ──
  const twitterCard = $('meta[name="twitter:card"]').attr('content')
  if (!twitterCard) {
    failed++
    findings.push({
      id: 'missing-twitter-card',
      title: 'Missing twitter:card meta tag',
      description: 'Add twitter:card for rich Twitter/X sharing previews',
      severity: 'low',
      category: 'meta-tags',
    })
  } else {
    passed++
  }

  // ── Canonical URL ──
  const canonical = $('link[rel="canonical"]').attr('href')
  if (!canonical) {
    failed++
    findings.push({
      id: 'missing-canonical',
      title: 'Missing canonical URL',
      description: 'Add <link rel="canonical"> to prevent duplicate content issues',
      severity: 'medium',
      category: 'meta-tags',
    })
  } else {
    passed++
  }

  // ── Favicon ──
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0
  if (!favicon) {
    failed++
    findings.push({
      id: 'missing-favicon',
      title: 'Missing favicon',
      description: 'Add a favicon for browser tabs and bookmarks',
      severity: 'low',
      category: 'meta-tags',
    })
  } else {
    passed++
  }

  // ── Charset ──
  const charset = $('meta[charset]').length > 0 || $('meta[http-equiv="Content-Type"]').length > 0
  if (!charset) {
    failed++
    findings.push({
      id: 'missing-charset',
      title: 'Missing charset declaration',
      description: 'Add <meta charset="utf-8"> to prevent encoding issues',
      severity: 'medium',
      category: 'meta-tags',
    })
  } else {
    passed++
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'meta-tags',
    label: 'Meta Tags & SEO',
    score,
    passed,
    failed,
    findings,
  }
}
