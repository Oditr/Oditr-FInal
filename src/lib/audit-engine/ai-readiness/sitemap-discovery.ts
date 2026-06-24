// ── Sitemap & Discoverability Analysis Service ──
import { AuditFinding } from '../types'

const FETCH_TIMEOUT = 5000
const MAX_SITEMAP_BYTES = 512 * 1024 // 500KB max read

const IMPORTANT_PAGES = [
  { pattern: '/pricing', label: 'Pricing' },
  { pattern: '/features', label: 'Features' },
  { pattern: '/about', label: 'About' },
  { pattern: '/contact', label: 'Contact' },
  { pattern: '/docs', label: 'Documentation' },
  { pattern: '/blog', label: 'Blog' },
  { pattern: '/products', label: 'Products' },
  { pattern: '/services', label: 'Services' },
  { pattern: '/signup', label: 'Sign Up' },
  { pattern: '/demo', label: 'Demo' },
]

export interface DiscoverabilityResult {
  sitemapExists: boolean
  sitemapStatusCode: number
  sitemapInRobots: boolean
  sitemapUrlCount: number
  importantPagesFound: string[]
  importantPagesMissing: string[]
}

export async function analyzeSitemapDiscoverability(
  origin: string,
  robotsHasSitemap: boolean,
  $: any // CheerioAPI for link discovery
): Promise<{ result: DiscoverabilityResult; findings: AuditFinding[] }> {
  const findings: AuditFinding[] = []
  const result: DiscoverabilityResult = {
    sitemapExists: false,
    sitemapStatusCode: 0,
    sitemapInRobots: robotsHasSitemap,
    sitemapUrlCount: 0,
    importantPagesFound: [],
    importantPagesMissing: [],
  }

  // Check sitemap.xml
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { 'User-Agent': 'Oditr-AuditBot/1.0' },
    })
    result.sitemapStatusCode = res.status

    if (res.ok) {
      result.sitemapExists = true

      // Read and count URLs (limited to MAX_SITEMAP_BYTES)
      const text = await res.text()
      const truncated = text.slice(0, MAX_SITEMAP_BYTES)
      const urlMatches = truncated.match(/<loc>/gi)
      result.sitemapUrlCount = urlMatches?.length || 0

      findings.push({
        id: 'ai-sitemap-found',
        title: 'Sitemap found',
        description: `Your sitemap.xml exists and contains approximately ${result.sitemapUrlCount} URL(s). This helps crawlers and AI agents discover your full site structure.`,
        severity: 'info',
        category: 'ai-readiness',
        value: `${result.sitemapUrlCount} URLs`,
      })

      // Check if important pages are in sitemap
      for (const page of IMPORTANT_PAGES) {
        if (truncated.includes(page.pattern)) {
          result.importantPagesFound.push(page.label)
        }
      }
    } else {
      findings.push({
        id: 'ai-sitemap-missing',
        title: 'Missing sitemap.xml',
        description: 'No sitemap.xml was found at the root of your domain. A sitemap helps search engines and AI agents discover all important pages on your site.',
        severity: 'high',
        category: 'ai-readiness',
        value: `Status: ${res.status}`,
        recommendation: {
          fix: 'Generate and deploy a sitemap.xml at the root of your domain. Most CMS and frameworks can generate one automatically.',
          estimatedImpact: 'high',
          fixDifficulty: 'easy',
        },
      })
    }
  } catch (err) {
    findings.push({
      id: 'ai-sitemap-error',
      title: 'Could not check sitemap.xml',
      description: 'The request to check sitemap.xml timed out or failed.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Error/Timeout',
    })
  }

  // Check important page discoverability via homepage links
  for (const page of IMPORTANT_PAGES) {
    const found = $(`a[href*="${page.pattern}"]`).length > 0 || result.importantPagesFound.includes(page.label)
    if (found) {
      if (!result.importantPagesFound.includes(page.label)) {
        result.importantPagesFound.push(page.label)
      }
    } else {
      result.importantPagesMissing.push(page.label)
    }
  }

  if (result.importantPagesMissing.length > 3) {
    findings.push({
      id: 'ai-important-pages-missing',
      title: `${result.importantPagesMissing.length} important pages not easily discoverable`,
      description: `AI agents and crawlers may have difficulty finding: ${result.importantPagesMissing.join(', ')}. These pages are not linked from the homepage and may not appear in the sitemap.`,
      severity: 'low',
      category: 'ai-readiness',
      value: result.importantPagesMissing.join(', '),
      recommendation: {
        fix: 'Add links to important pages (pricing, features, about, contact, docs) in your homepage navigation or footer.',
        estimatedImpact: 'medium',
        fixDifficulty: 'easy',
      },
    })
  }

  return { result, findings }
}
