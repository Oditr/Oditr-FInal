// ── Oditr Intelligence Engine — Business Impact Engine ──
// Translates raw technical metrics into human-understandable business outcomes.
// Every metric gets a narrative, a UX rating, and optional category-specific context.

import type { MetricNarrative, BusinessSummary, SiteCategory } from './types'
import { createLogger } from './logger'

const log = createLogger('intelligence:business-impact')

// ═══════════════════════════════════════════════
// CWV THRESHOLDS (from Google's published values)
// ═══════════════════════════════════════════════

type Rating = 'good' | 'needs-improvement' | 'poor'

function rateLcp(ms: number): Rating {
  if (ms <= 2500) return 'good'
  if (ms <= 4000) return 'needs-improvement'
  return 'poor'
}

function rateCls(score: number): Rating {
  if (score <= 0.1) return 'good'
  if (score <= 0.25) return 'needs-improvement'
  return 'poor'
}

function rateInp(ms: number): Rating {
  if (ms <= 200) return 'good'
  if (ms <= 500) return 'needs-improvement'
  return 'poor'
}

function rateFcp(ms: number): Rating {
  if (ms <= 1800) return 'good'
  if (ms <= 3000) return 'needs-improvement'
  return 'poor'
}

function rateTtfb(ms: number): Rating {
  if (ms <= 800) return 'good'
  if (ms <= 1800) return 'needs-improvement'
  return 'poor'
}

function rateTbt(ms: number): Rating {
  if (ms <= 200) return 'good'
  if (ms <= 600) return 'needs-improvement'
  return 'poor'
}

// ═══════════════════════════════════════════════
// BUSINESS NARRATIVES
// Each metric × each rating → human-understandable impact
// ═══════════════════════════════════════════════

const LCP_NARRATIVES: Record<Rating, string> = {
  good: 'Your main content appears quickly — visitors see what they came for without waiting.',
  'needs-improvement': 'Your main content takes noticeably long to appear. A significant share of visitors may lose patience before the page becomes usable.',
  poor: 'Users are likely to abandon before your main content becomes visible. Pages this slow typically lose 20–30% of potential visitors.',
}

const CLS_NARRATIVES: Record<Rating, string> = {
  good: 'Your page layout is stable — no unexpected jumps or shifts while loading.',
  'needs-improvement': 'Your page has noticeable layout movement during load. Visitors may accidentally click the wrong button or lose their place.',
  poor: 'Your page layout shifts significantly while loading. Users experience frustrating jumps — elements move under their fingers, causing mis-clicks and confusion.',
}

const INP_NARRATIVES: Record<Rating, string> = {
  good: 'Interactions are snappy — clicks, taps, and keyboard inputs respond instantly.',
  'needs-improvement': 'Interactions feel slightly sluggish. Button clicks and form inputs have a perceptible delay that users will notice.',
  poor: 'Interactions feel broken. Button clicks, form inputs, and navigation have a noticeable lag — the page feels unresponsive and frustrating to use.',
}

const FCP_NARRATIVES: Record<Rating, string> = {
  good: 'The first visual feedback appears quickly — users know the page is loading.',
  'needs-improvement': 'Users stare at a blank screen for too long before anything appears. This creates uncertainty about whether the page is working.',
  poor: 'Users see nothing for an extended period. Many will assume the site is broken and leave before any content appears.',
}

const TTFB_NARRATIVES: Record<Rating, string> = {
  good: 'Your server responds quickly to requests.',
  'needs-improvement': 'Your server takes longer than expected to respond. Every user waits this delay before anything else can happen.',
  poor: 'Your server is slow to respond. This delay adds to every page load and cannot be hidden from users — it is pure waiting time.',
}

const TBT_NARRATIVES: Record<Rating, string> = {
  good: 'The main thread is mostly free during page load — the page is interactive quickly.',
  'needs-improvement': 'The main thread is busy during load. Users may find the page unresponsive when they try to interact with it before it fully loads.',
  poor: 'The main thread is heavily blocked during load. The page appears loaded but doesn\'t respond to input — this is one of the most frustrating user experiences.',
}

// ═══════════════════════════════════════════════
// CATEGORY-SPECIFIC CONTEXT
// How each metric matters differently per site type
// ═══════════════════════════════════════════════

const CATEGORY_CONTEXT: Record<SiteCategory, Partial<Record<string, Record<Rating, string>>>> = {
  ecommerce: {
    lcp: {
      good: '',
      'needs-improvement': 'For e-commerce, every second of load time can reduce conversion rates by up to 7%.',
      poor: 'Shoppers will not wait — slow product pages directly reduce purchases and revenue.',
    },
    cls: {
      good: '',
      'needs-improvement': 'Layout shifts on product pages can cause customers to add the wrong item or miss the buy button.',
      poor: 'Severe layout shifts on shopping pages erode buyer trust and can lead to cart abandonment.',
    },
    inp: {
      good: '',
      'needs-improvement': 'Sluggish "Add to Cart" and filter interactions frustrate shoppers at the point of purchase.',
      poor: 'Unresponsive product interactions cause shoppers to abandon — they cannot add items or navigate.',
    },
  },
  saas: {
    inp: {
      good: '',
      'needs-improvement': 'SaaS users interact heavily with your app. Perceptible input lag degrades the experience they\'re paying for.',
      poor: 'Your application feels broken. Users of SaaS tools expect desktop-app responsiveness.',
    },
    tbt: {
      good: '',
      'needs-improvement': 'Heavy JavaScript blocks user interaction — dashboard widgets and controls may not respond during load.',
      poor: 'Your app is unusable during load. Users see the interface but cannot click anything.',
    },
    lcp: {
      good: '',
      'needs-improvement': 'Dashboard load time affects daily user satisfaction — they visit your app repeatedly.',
      poor: 'Users will seek alternatives if your dashboard consistently loads slowly.',
    },
  },
  blog: {
    lcp: {
      good: '',
      'needs-improvement': 'Readers expect content to appear quickly. Slow article pages increase bounce rates significantly.',
      poor: 'Readers will leave and find the content elsewhere. Blog pages must load fast to retain attention.',
    },
    fcp: {
      good: '',
      'needs-improvement': 'The blank-screen period is critical for content sites — readers need to see text immediately.',
      poor: 'Readers assume the article link is broken if nothing appears quickly.',
    },
    cls: {
      good: '',
      'needs-improvement': 'Ads and images shifting around while reading is the #1 source of reader frustration on content sites.',
      poor: 'Layout shifts cause readers to lose their place in the article — many will leave.',
    },
  },
  portfolio: {
    lcp: {
      good: '',
      'needs-improvement': 'Portfolio sites are visual-first. Slow image loading undermines the impression your work creates.',
      poor: 'Potential clients judge your technical ability by your own site\'s performance.',
    },
  },
  agency: {
    lcp: {
      good: '',
      'needs-improvement': 'Prospective clients form first impressions quickly. A slow agency site raises questions about expertise.',
      poor: 'A slow-loading agency website undermines credibility. Clients expect speed from a digital services provider.',
    },
  },
  'landing-page': {
    lcp: {
      good: '',
      'needs-improvement': 'Landing pages live or die by first impression. Even modest delays significantly reduce conversion rates.',
      poor: 'Your landing page loses most visitors before they see your offer. This directly reduces campaign ROI.',
    },
    fcp: {
      good: '',
      'needs-improvement': 'The blank-screen period is fatal for ad-driven landing pages — visitors from ads have very low patience.',
      poor: 'Paid traffic is being wasted — visitors bounce before seeing anything.',
    },
  },
  documentation: {
    fcp: {
      good: '',
      'needs-improvement': 'Developers expect fast documentation. Slow docs pages hurt developer experience.',
      poor: 'Slow documentation drives developers to seek alternative solutions.',
    },
  },
  news: {
    lcp: {
      good: '',
      'needs-improvement': 'News readers expect instant content. Slow pages lose readers to competing outlets.',
      poor: 'Breaking news must load instantly. Slow pages mean readers get the story elsewhere.',
    },
    ttfb: {
      good: '',
      'needs-improvement': 'Server speed is critical for news sites that publish frequently and face traffic spikes.',
      poor: 'Your server cannot keep up with demand — consider CDN distribution.',
    },
  },
  community: {
    inp: {
      good: '',
      'needs-improvement': 'Community interactions (replying, voting, navigating threads) must feel instant.',
      poor: 'Sluggish interactions kill engagement — community members will reduce participation.',
    },
  },
  general: {},
}

// ═══════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatCls(score: number): string {
  return score.toFixed(2)
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

interface CwvMetrics {
  lcp?: { numericValue?: number }
  cls?: { numericValue?: number }
  inp?: { numericValue?: number }
  fcp?: { numericValue?: number }
  ttfb?: { numericValue?: number }
  tbt?: { numericValue?: number }
}

/**
 * Generate business-impact narratives for all available CWV metrics.
 */
export function generateMetricNarratives(
  cwv: CwvMetrics | null | undefined,
  siteCategory: SiteCategory,
): MetricNarrative[] {
  if (!cwv) return []

  const narratives: MetricNarrative[] = []
  const catCtx = CATEGORY_CONTEXT[siteCategory] || {}

  // LCP
  if (cwv.lcp?.numericValue != null) {
    const val = cwv.lcp.numericValue
    const rating = rateLcp(val)
    let categoryNote = catCtx.lcp?.[rating]

    if (siteCategory === 'ecommerce' && val > 2500) {
      const excessMs = val - 2500
      const conversionDropPercent = (excessMs / 100) * 0.7 // Assume 0.7% drop per 100ms over 2.5s
      if (conversionDropPercent >= 1) {
        categoryNote = `For e-commerce, this ${formatMs(excessMs)} excess delay is projected to cause an estimated ${conversionDropPercent.toFixed(1)}% drop in conversion rate compared to an optimal load time.`
      }
    }

    narratives.push({
      metric: 'LCP',
      rawValue: val,
      displayValue: formatMs(val),
      rating,
      narrative: LCP_NARRATIVES[rating],
      ...(categoryNote ? { contextualNote: categoryNote } : {}),
    })
  }

  // CLS
  if (cwv.cls?.numericValue != null) {
    const val = cwv.cls.numericValue
    const rating = rateCls(val)
    const categoryNote = catCtx.cls?.[rating]
    narratives.push({
      metric: 'CLS',
      rawValue: val,
      displayValue: formatCls(val),
      rating,
      narrative: CLS_NARRATIVES[rating],
      ...(categoryNote ? { contextualNote: categoryNote } : {}),
    })
  }

  // INP / TBT (INP preferred; TBT as fallback for lab data)
  if (cwv.inp?.numericValue != null) {
    const val = cwv.inp.numericValue
    const rating = rateInp(val)
    const categoryNote = catCtx.inp?.[rating]
    narratives.push({
      metric: 'INP',
      rawValue: val,
      displayValue: formatMs(val),
      rating,
      narrative: INP_NARRATIVES[rating],
      ...(categoryNote ? { contextualNote: categoryNote } : {}),
    })
  }

  // FCP
  if (cwv.fcp?.numericValue != null) {
    const val = cwv.fcp.numericValue
    const rating = rateFcp(val)
    const categoryNote = catCtx.fcp?.[rating]
    narratives.push({
      metric: 'FCP',
      rawValue: val,
      displayValue: formatMs(val),
      rating,
      narrative: FCP_NARRATIVES[rating],
      ...(categoryNote ? { contextualNote: categoryNote } : {}),
    })
  }

  // TTFB
  if (cwv.ttfb?.numericValue != null) {
    const val = cwv.ttfb.numericValue
    const rating = rateTtfb(val)
    const categoryNote = catCtx.ttfb?.[rating]
    narratives.push({
      metric: 'TTFB',
      rawValue: val,
      displayValue: formatMs(val),
      rating,
      narrative: TTFB_NARRATIVES[rating],
      ...(categoryNote ? { contextualNote: categoryNote } : {}),
    })
  }

  // TBT
  if (cwv.tbt?.numericValue != null) {
    const val = cwv.tbt.numericValue
    const rating = rateTbt(val)
    const categoryNote = catCtx.tbt?.[rating]
    narratives.push({
      metric: 'TBT',
      rawValue: val,
      displayValue: formatMs(val),
      rating,
      narrative: TBT_NARRATIVES[rating],
      ...(categoryNote ? { contextualNote: categoryNote } : {}),
    })
  }

  return narratives
}

/**
 * Generate overall business summary from metric narratives and scores.
 */
export function generateBusinessSummary(
  narratives: MetricNarrative[],
  performanceScore: number | null | undefined,
  customAuditScore: number | null | undefined,
  healthScore: number | null | undefined,
): BusinessSummary {
  // Determine overall UX rating
  const score = healthScore ?? performanceScore ?? customAuditScore ?? 0
  const overallUxRating = getUxRating(score)

  // Count poor / needs-improvement metrics
  const poorCount = narratives.filter(n => n.rating === 'poor').length
  const niCount = narratives.filter(n => n.rating === 'needs-improvement').length
  const goodCount = narratives.filter(n => n.rating === 'good').length

  // Generate headline
  const headline = generateHeadline(overallUxRating, poorCount, niCount, score)

  // Generate summary
  const summary = generateSummaryText(overallUxRating, poorCount, niCount, goodCount, narratives)

  log.info('Business summary generated', {
    overallUxRating,
    poorCount,
    niCount,
    goodCount,
    score,
  })

  return {
    headline,
    summary,
    metricNarratives: narratives,
    overallUxRating,
  }
}

// ── Internal helpers ──

function getUxRating(score: number): BusinessSummary['overallUxRating'] {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 50) return 'needs-work'
  if (score >= 25) return 'poor'
  return 'critical'
}

function generateHeadline(
  rating: BusinessSummary['overallUxRating'],
  poorCount: number,
  niCount: number,
  score: number,
): string {
  switch (rating) {
    case 'excellent':
      return 'Your page delivers an excellent user experience — fast, stable, and responsive.'
    case 'good':
      return niCount > 0
        ? `Your page performs well overall, but ${niCount} metric${niCount > 1 ? 's' : ''} could be improved.`
        : 'Your page performs well — most metrics are in good shape.'
    case 'needs-work':
      return poorCount > 0
        ? `Your page has ${poorCount} critical performance issue${poorCount > 1 ? 's' : ''} that may be costing you visitors.`
        : `Your page has several performance areas that need attention to avoid losing visitors.`
    case 'poor':
      return 'Your page has significant performance problems that are likely driving visitors away.'
    case 'critical':
      return 'Your page has severe performance issues. Most visitors are likely leaving before it becomes usable.'
  }
}

function generateSummaryText(
  rating: BusinessSummary['overallUxRating'],
  poorCount: number,
  niCount: number,
  goodCount: number,
  narratives: MetricNarrative[],
): string {
  const poorMetrics = narratives.filter(n => n.rating === 'poor').map(n => n.metric)
  const niMetrics = narratives.filter(n => n.rating === 'needs-improvement').map(n => n.metric)

  if (rating === 'excellent') {
    return `All ${goodCount} measured metrics are in the "good" range. Your page loads quickly, stays stable, and responds to user input without delay. Keep monitoring to maintain this level.`
  }

  if (rating === 'good') {
    if (niMetrics.length > 0) {
      return `Most metrics are healthy, but ${niMetrics.join(' and ')} ${niMetrics.length > 1 ? 'need' : 'needs'} improvement. Addressing ${niMetrics.length > 1 ? 'these' : 'this'} could meaningfully improve user experience and engagement.`
    }
    return `Your page performs above average. Minor optimizations could push it into the excellent range.`
  }

  if (poorMetrics.length > 0) {
    const worstMetric = narratives.find(n => n.rating === 'poor')!
    return `${poorMetrics.join(', ')} ${poorMetrics.length > 1 ? 'are' : 'is'} in the critical range. The most urgent issue is ${worstMetric.metric} (${worstMetric.displayValue}) — ${worstMetric.narrative.charAt(0).toLowerCase()}${worstMetric.narrative.slice(1)}${niCount > 0 ? ` Additionally, ${niMetrics.join(' and ')} ${niMetrics.length > 1 ? 'need' : 'needs'} attention.` : ''}`
  }

  return `Several performance metrics need improvement. Focus on the highest-impact issues first to make the biggest difference in user experience.`
}
