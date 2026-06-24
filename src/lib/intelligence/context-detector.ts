// ── Oditr Intelligence Engine — Context Detector ──
// Identifies website category (ecommerce, SaaS, blog, etc.) from URL, HTML, and meta signals.
// Category determines which metrics are prioritized in recommendations.

import type { SiteCategory, SiteContext } from './types'
import { createLogger } from './logger'

const log = createLogger('intelligence:context')

// ═══════════════════════════════════════════════
// CATEGORY SIGNALS
// ═══════════════════════════════════════════════

interface CategorySignal {
  category: SiteCategory
  label: string
  /** Patterns to test against the full HTML */
  htmlPatterns?: RegExp[]
  /** Patterns to test against the URL (path + hostname) */
  urlPatterns?: RegExp[]
  /** Meta keywords / og:type patterns */
  metaPatterns?: RegExp[]
  /** Base confidence on first match */
  baseConfidence: number
  perSignalBonus: number
  /** Ordered list of metrics that matter most for this category */
  priorityMetrics: string[]
}

const CATEGORY_SIGNALS: CategorySignal[] = [
  // ── Ecommerce ──
  {
    category: 'ecommerce',
    label: 'E-commerce',
    htmlPatterns: [
      /add.to.cart/i,
      /product-price/i,
      /shopping.cart/i,
      /checkout/i,
      /woocommerce/i,
      /shopify/i,
      /product-card/i,
      /buy.now/i,
      /"@type"\s*:\s*"Product"/,
      /schema\.org\/Product/,
      /price-amount/i,
    ],
    urlPatterns: [
      /\/shop\b/i,
      /\/store\b/i,
      /\/product/i,
      /\/cart/i,
      /\/checkout/i,
      /\/collections?\b/i,
    ],
    baseConfidence: 50,
    perSignalBonus: 10,
    priorityMetrics: ['lcp', 'cls', 'inp', 'fcp', 'ttfb'],
  },

  // ── SaaS ──
  {
    category: 'saas',
    label: 'SaaS Application',
    htmlPatterns: [
      /sign.?up/i,
      /log.?in/i,
      /dashboard/i,
      /free.trial/i,
      /get.started/i,
      /pricing.plan/i,
      /subscription/i,
      /api.key/i,
      /integrations?/i,
    ],
    urlPatterns: [
      /\/app\b/i,
      /\/dashboard/i,
      /\/pricing/i,
      /\/signup/i,
      /\/login/i,
      /app\./i,
    ],
    baseConfidence: 40,
    perSignalBonus: 10,
    priorityMetrics: ['inp', 'tbt', 'lcp', 'fcp', 'cls'],
  },

  // ── Blog / Content ──
  {
    category: 'blog',
    label: 'Blog / Content Site',
    htmlPatterns: [
      /<article/i,
      /blog-post/i,
      /post-content/i,
      /reading.time/i,
      /author-bio/i,
      /published.?date/i,
      /"@type"\s*:\s*"(Blog|Article|NewsArticle)"/i,
      /schema\.org\/(Blog|Article)/,
      /comment-section/i,
    ],
    urlPatterns: [
      /\/blog\b/i,
      /\/post/i,
      /\/article/i,
      /\/news\b/i,
      /\/category\//i,
      /\/tag\//i,
    ],
    baseConfidence: 45,
    perSignalBonus: 10,
    priorityMetrics: ['lcp', 'fcp', 'cls', 'ttfb', 'tbt'],
  },

  // ── News ──
  {
    category: 'news',
    label: 'News / Media',
    htmlPatterns: [
      /breaking.news/i,
      /latest.stories/i,
      /news-feed/i,
      /headline/i,
      /"@type"\s*:\s*"NewsArticle"/,
      /dateline/i,
      /byline/i,
    ],
    urlPatterns: [
      /news\./i,
      /\/news\b/i,
      /\/breaking/i,
    ],
    baseConfidence: 45,
    perSignalBonus: 12,
    priorityMetrics: ['lcp', 'fcp', 'ttfb', 'cls', 'tbt'],
  },

  // ── Documentation ──
  {
    category: 'documentation',
    label: 'Documentation',
    htmlPatterns: [
      /docs-sidebar/i,
      /documentation/i,
      /api.reference/i,
      /code-sample/i,
      /table.of.contents/i,
      /docs-nav/i,
      /docsearch/i,
    ],
    urlPatterns: [
      /\/docs\b/i,
      /\/documentation/i,
      /\/api\//i,
      /\/reference\b/i,
      /\/guide/i,
    ],
    baseConfidence: 50,
    perSignalBonus: 10,
    priorityMetrics: ['fcp', 'lcp', 'inp', 'cls', 'tbt'],
  },

  // ── Portfolio ──
  {
    category: 'portfolio',
    label: 'Portfolio',
    htmlPatterns: [
      /portfolio/i,
      /my.work/i,
      /case.stud/i,
      /project-card/i,
      /gallery-item/i,
      /testimonial/i,
    ],
    urlPatterns: [
      /\/portfolio\b/i,
      /\/work\b/i,
      /\/projects?\b/i,
      /\/case-stud/i,
    ],
    baseConfidence: 40,
    perSignalBonus: 12,
    priorityMetrics: ['lcp', 'cls', 'fcp', 'ttfb', 'inp'],
  },

  // ── Agency ──
  {
    category: 'agency',
    label: 'Agency / Services',
    htmlPatterns: [
      /our.services/i,
      /our.team/i,
      /case.stud/i,
      /clients?\b/i,
      /contact.us/i,
      /request.a.quote/i,
      /get.in.touch/i,
    ],
    urlPatterns: [
      /\/services\b/i,
      /\/about\b/i,
      /\/team\b/i,
      /\/case-stud/i,
      /\/contact\b/i,
    ],
    baseConfidence: 35,
    perSignalBonus: 10,
    priorityMetrics: ['lcp', 'fcp', 'cls', 'ttfb', 'tbt'],
  },

  // ── Landing Page ──
  {
    category: 'landing-page',
    label: 'Landing Page',
    htmlPatterns: [
      /hero-section/i,
      /cta-button/i,
      /call.to.action/i,
      /sign.?up.?now/i,
      /get.started/i,
      /limited.time/i,
      /waitlist/i,
    ],
    urlPatterns: [
      /\/lp\//i,
      /\/landing/i,
      /\/promo/i,
    ],
    baseConfidence: 35,
    perSignalBonus: 12,
    priorityMetrics: ['lcp', 'fcp', 'cls', 'tbt', 'inp'],
  },

  // ── Community / Forum ──
  {
    category: 'community',
    label: 'Community / Forum',
    htmlPatterns: [
      /forum/i,
      /discussion/i,
      /thread/i,
      /reply/i,
      /community/i,
      /discourse/i,
    ],
    urlPatterns: [
      /\/forum/i,
      /\/community/i,
      /\/discuss/i,
    ],
    baseConfidence: 45,
    perSignalBonus: 12,
    priorityMetrics: ['inp', 'tbt', 'fcp', 'cls', 'lcp'],
  },
]

// Default fallback
const DEFAULT_CONTEXT: SiteContext = {
  category: 'general',
  label: 'General Website',
  confidence: 20,
  signals: [],
  priorityMetrics: ['lcp', 'fcp', 'cls', 'inp', 'tbt', 'ttfb'],
}

// ═══════════════════════════════════════════════
// DETECTION LOGIC
// ═══════════════════════════════════════════════

/**
 * Detect site category from URL, HTML, and meta signals.
 */
export function detectSiteContext(
  url: string,
  html: string | undefined,
): SiteContext {
  const candidates: { category: SiteCategory; label: string; confidence: number; signals: string[]; priorityMetrics: string[] }[] = []

  for (const sig of CATEGORY_SIGNALS) {
    const matchedSignals: string[] = []

    // Test URL patterns
    if (sig.urlPatterns) {
      for (const pattern of sig.urlPatterns) {
        if (pattern.test(url)) {
          matchedSignals.push(`URL: ${pattern.source}`)
        }
      }
    }

    // Test HTML patterns
    if (html && sig.htmlPatterns) {
      for (const pattern of sig.htmlPatterns) {
        if (pattern.test(html)) {
          matchedSignals.push(`HTML: ${pattern.source}`)
        }
      }
    }

    // Test meta patterns
    if (html && sig.metaPatterns) {
      for (const pattern of sig.metaPatterns) {
        if (pattern.test(html)) {
          matchedSignals.push(`Meta: ${pattern.source}`)
        }
      }
    }

    if (matchedSignals.length > 0) {
      const confidence = Math.min(
        95,
        sig.baseConfidence + (matchedSignals.length - 1) * sig.perSignalBonus
      )
      candidates.push({
        category: sig.category,
        label: sig.label,
        confidence,
        signals: matchedSignals,
        priorityMetrics: sig.priorityMetrics,
      })
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence)

  if (candidates.length === 0) {
    log.info('No specific site category detected, using general', { url })
    return DEFAULT_CONTEXT
  }

  const winner = candidates[0]

  log.info('Site category detected', {
    category: winner.category,
    confidence: winner.confidence,
    signalCount: winner.signals.length,
    url,
  })

  return {
    category: winner.category,
    label: winner.label,
    confidence: winner.confidence,
    signals: winner.signals,
    priorityMetrics: winner.priorityMetrics,
  }
}
