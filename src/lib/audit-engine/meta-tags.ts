// ── Meta Tags & Deep SEO Validation ──
// Checks title, description, OG tags, Twitter cards, canonical, favicon,
// indexability, duplicate metadata, and canonical URL accuracy.

import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkMetaTags(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // ── Title ──
  const titleTags = $('title')
  const titleCount = titleTags.length
  const title = titleTags.first().text().trim()

  if (titleCount > 1) {
    failed++
    findings.push({
      id: 'duplicate-title',
      title: `Duplicate <title> tags found (${titleCount})`,
      description: 'Multiple title tags confuse search engines. Only one should exist per page.',
      severity: 'critical',
      category: 'meta-tags',
      value: `${titleCount} found`,
      recommendation: {
        fix: 'Remove all but one `<title>` tag. Search engines will use the last one, which may not be what you intended.',
        estimatedImpact: 'high',
      },
    })
  } else if (!title) {
    failed++
    findings.push({
      id: 'missing-title',
      title: 'Missing <title> tag',
      description: 'Every page must have a title tag for SEO and browser tabs.',
      severity: 'critical',
      category: 'meta-tags',
      recommendation: {
        fix: 'Add a `<title>` tag within your `<head>` element. Keep it 30–60 characters and include your main keyword.',
        estimatedImpact: 'high',
      },
    })
  } else if (title.length < 30) {
    failed++
    findings.push({
      id: 'title-too-short',
      title: `Title too short (${title.length} chars)`,
      description: `Title should be 30–60 characters for optimal search snippet display. Current: "${title}"`,
      severity: 'moderate',
      category: 'meta-tags',
      value: `${title.length} chars`,
      recommendation: {
        fix: 'Expand the title to at least 30 characters, incorporating a primary keyword and your brand name.',
        estimatedImpact: 'medium',
      },
    })
  } else if (title.length > 60) {
    failed++
    findings.push({
      id: 'title-too-long',
      title: `Title too long (${title.length} chars)`,
      description: 'Title will be truncated in search results (typically ~600px, ~60 chars).',
      severity: 'minor',
      category: 'meta-tags',
      value: `${title.length} chars`,
      recommendation: {
        fix: 'Shorten the title to under 60 characters. Prioritise the most important keyword at the start.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  // ── Meta Description ──
  const descTags = $('meta[name="description"]')
  const descCount = descTags.length
  const desc = descTags.first().attr('content')?.trim()

  if (descCount > 1) {
    failed++
    findings.push({
      id: 'duplicate-meta-desc',
      title: `Duplicate meta description tags (${descCount})`,
      description: 'Multiple meta description tags confuse crawlers. Only one should exist per page.',
      severity: 'moderate',
      category: 'meta-tags',
      value: `${descCount} found`,
      recommendation: {
        fix: 'Remove all but one `<meta name="description">` tag.',
        estimatedImpact: 'medium',
      },
    })
  } else if (!desc) {
    failed++
    findings.push({
      id: 'missing-meta-desc',
      title: 'Missing meta description',
      description: 'A meta description improves click-through rate in search results. While not a ranking factor, it is displayed as the snippet under your title.',
      severity: 'critical',
      category: 'meta-tags',
      recommendation: {
        fix: 'Add `<meta name="description" content="Your summary here…">` with 120–160 characters that accurately describes the page content.',
        estimatedImpact: 'high',
      },
    })
  } else if (desc.length < 120) {
    failed++
    findings.push({
      id: 'meta-desc-short',
      title: `Meta description short (${desc.length} chars)`,
      description: 'Ideal length is 120–160 characters for full display in Google search results. Shorter descriptions may be auto-expanded with unrelated content.',
      severity: 'minor',
      category: 'meta-tags',
      value: `${desc.length} chars`,
      recommendation: {
        fix: 'Expand the description to 120–160 characters. Include a call-to-action and primary keyword.',
        estimatedImpact: 'low',
      },
    })
  } else if (desc.length > 160) {
    failed++
    findings.push({
      id: 'meta-desc-long',
      title: `Meta description long (${desc.length} chars)`,
      description: 'Will be truncated in search results. Keep under 160 characters.',
      severity: 'minor',
      category: 'meta-tags',
      value: `${desc.length} chars`,
      recommendation: {
        fix: 'Trim the description to 160 characters or fewer, placing the most important information first.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  // ── Indexability ──
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? ''
  const xRobotsHeader = (fetched.headers?.['x-robots-tag'] ?? '').toLowerCase()

  if (robotsMeta.includes('noindex') || xRobotsHeader.includes('noindex')) {
    failed++
    const source = robotsMeta.includes('noindex') ? '<meta name="robots">' : 'X-Robots-Tag header'
    findings.push({
      id: 'noindex-detected',
      title: 'Page is marked as noindex',
      description: `This page has \`noindex\` set via ${source}. Search engines will not include this page in their index. This is intentional on some pages but critical to verify.`,
      severity: 'critical',
      category: 'meta-tags',
      value: `Source: ${source}`,
      recommendation: {
        fix: 'If this page should be indexed, remove the `noindex` directive. If it is intentional (e.g. admin pages, thank-you pages), this can be safely ignored.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ── Open Graph ──
  const ogChecks = [
    { tag: 'og:title', severity: 'moderate' as const },
    { tag: 'og:description', severity: 'minor' as const },
    { tag: 'og:image', severity: 'moderate' as const },
    { tag: 'og:url', severity: 'minor' as const },
    { tag: 'og:type', severity: 'minor' as const },
  ]
  for (const { tag, severity } of ogChecks) {
    const val = $(`meta[property="${tag}"]`).attr('content')?.trim()
    if (!val) {
      failed++
      findings.push({
        id: `missing-${tag}`,
        title: `Missing ${tag}`,
        description: `Open Graph tag \`${tag}\` is missing. This affects how your page appears when shared on social platforms (Facebook, LinkedIn, Slack).`,
        severity,
        category: 'meta-tags',
        recommendation: {
          fix: `Add \`<meta property="${tag}" content="…">\` to your page head.`,
          estimatedImpact: severity === 'moderate' ? 'medium' : 'low',
        },
      })
    } else {
      passed++
    }
  }

  // ── Twitter Card ──
  const twitterChecks = [
    { tag: 'twitter:card', severity: 'moderate' as const },
    { tag: 'twitter:title', severity: 'minor' as const },
    { tag: 'twitter:description', severity: 'minor' as const },
    { tag: 'twitter:image', severity: 'minor' as const },
  ]
  for (const { tag, severity } of twitterChecks) {
    const val = $(`meta[name="${tag}"]`).attr('content')?.trim()
    if (!val) {
      failed++
      findings.push({
        id: `missing-${tag.replace(':', '-')}`,
        title: `Missing ${tag}`,
        description: `The \`${tag}\` meta tag is missing. Without it, Twitter/X will generate a plain link card instead of a rich preview when your content is shared.`,
        severity,
        category: 'meta-tags',
        recommendation: {
          fix: `Add \`<meta name="${tag}" content="…">\`. For twitter:card, use \`summary_large_image\` for best results.`,
          estimatedImpact: 'low',
        },
      })
    } else {
      passed++
    }
  }

  // ── Canonical URL ──
  const canonicalLinks = $('link[rel="canonical"]')
  const canonicalCount = canonicalLinks.length

  if (canonicalCount === 0) {
    failed++
    findings.push({
      id: 'missing-canonical',
      title: 'Missing canonical URL',
      description: 'Without a canonical tag, search engines may index multiple versions of the same page (with/without www, trailing slashes, query params), causing duplicate content penalties.',
      severity: 'moderate',
      category: 'meta-tags',
      recommendation: {
        fix: 'Add `<link rel="canonical" href="https://yourdomain.com/this-page/">` to the `<head>` of every page.',
        estimatedImpact: 'high',
      },
    })
  } else if (canonicalCount > 1) {
    failed++
    findings.push({
      id: 'duplicate-canonical',
      title: `Multiple canonical tags detected (${canonicalCount})`,
      description: 'Only one canonical tag should exist per page. Multiple canonicals are treated as an error by Google and will be ignored.',
      severity: 'critical',
      category: 'meta-tags',
      value: `${canonicalCount} found`,
      recommendation: {
        fix: 'Remove all but one `<link rel="canonical">` tag.',
        estimatedImpact: 'high',
      },
    })
  } else {
    const canonicalHref = canonicalLinks.first().attr('href')?.trim() ?? ''
    // Normalize both URLs for comparison (remove trailing slash, lowercase)
    try {
      const canonicalUrl = new URL(canonicalHref, fetched.url)
      const fetchedUrl = new URL(fetched.url)
      const canonNorm = canonicalUrl.href.replace(/\/$/, '').toLowerCase()
      const fetchNorm = fetchedUrl.href.replace(/\/$/, '').toLowerCase()
      if (canonNorm !== fetchNorm) {
        failed++
        findings.push({
          id: 'canonical-mismatch',
          title: 'Canonical URL does not match the page URL',
          description: `The canonical tag points to \`${canonicalHref}\`, but the audited URL is \`${fetched.url}\`. This signals to search engines that this page is a duplicate of the canonical.`,
          severity: 'moderate',
          category: 'meta-tags',
          value: canonicalHref,
          recommendation: {
            fix: `If this page is the original, update the canonical to match the actual URL. If it is intentionally a duplicate, this is correct.`,
            estimatedImpact: 'high',
          },
        })
      } else {
        passed++
      }
    } catch {
      passed++
    }
  }

  // ── Favicon ──
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').length > 0
  if (!favicon) {
    failed++
    findings.push({
      id: 'missing-favicon',
      title: 'Missing favicon',
      description: 'A favicon improves brand recognition in browser tabs, bookmarks, and search results.',
      severity: 'minor',
      category: 'meta-tags',
      recommendation: {
        fix: 'Add `<link rel="icon" href="/favicon.ico">` and consider providing an `apple-touch-icon` as well.',
        estimatedImpact: 'low',
      },
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
      description: 'Without a charset declaration, browsers may render text incorrectly on some systems, especially with non-ASCII characters.',
      severity: 'moderate',
      category: 'meta-tags',
      recommendation: {
        fix: 'Add `<meta charset="utf-8">` as the first tag inside `<head>`.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  // ── Viewport ──
  const viewport = $('meta[name="viewport"]').attr('content')
  if (!viewport) {
    failed++
    findings.push({
      id: 'missing-viewport',
      title: 'Missing viewport meta tag',
      description: 'Without a viewport tag, the page will not render correctly on mobile devices. Google also uses this as a mobile-friendliness signal.',
      severity: 'critical',
      category: 'meta-tags',
      recommendation: {
        fix: 'Add `<meta name="viewport" content="width=device-width, initial-scale=1">` inside `<head>`.',
        estimatedImpact: 'high',
      },
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
