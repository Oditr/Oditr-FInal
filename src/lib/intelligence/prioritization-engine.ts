// ── VitalFix Intelligence Engine — Prioritization Engine ──
// Scores every issue (from Lighthouse opportunities + custom audit findings)
// and assigns each to a priority tier: fix-first, fix-next, or optional.
//
// Scoring model:
//   Priority Score = (Impact × 0.45) + (Effort × 0.25) + (Confidence × 0.15) + (Context × 0.15)
//
// Where:
//   Impact     — performance/UX severity (0–100)
//   Effort     — inverted implementation difficulty (100 = trivial)
//   Confidence — evidence strength (0–100)
//   Context    — category-weighted relevance (0–100)

import type {
  PrioritizedIssue,
  PriorityTier,
  SiteCategory,
  Framework,
} from './types'
import { createLogger } from './logger'

const log = createLogger('intelligence:prioritization')

// ═══════════════════════════════════════════════
// SCORING WEIGHTS
// ═══════════════════════════════════════════════

const WEIGHTS = {
  impact: 0.45,
  effort: 0.25,
  confidence: 0.15,
  context: 0.15,
} as const

// ═══════════════════════════════════════════════
// TIER THRESHOLDS
// ═══════════════════════════════════════════════

function assignTier(priorityScore: number, impactScore: number): PriorityTier {
  if (priorityScore >= 70 && impactScore >= 60) return 'fix-first'
  if (priorityScore >= 40 || impactScore >= 40) return 'fix-next'
  return 'optional'
}

// ═══════════════════════════════════════════════
// IMPACT SCORING — from severity + metric importance
// ═══════════════════════════════════════════════

const SEVERITY_IMPACT: Record<string, number> = {
  critical: 90,
  moderate: 60,
  minor: 30,
  info: 10,
}

const LIGHTHOUSE_IMPACT: Record<string, number> = {
  'render-blocking-resources': 85,
  'uses-optimized-images': 70,
  'uses-webp-images': 65,
  'uses-text-compression': 75,
  'unused-javascript': 80,
  'unused-css-rules': 55,
  'dom-size': 50,
  'bootup-time': 75,
  'mainthread-work-breakdown': 80,
  'uses-long-cache-ttl': 60,
  'uses-rel-preload': 55,
  'uses-rel-preconnect': 50,
  'font-display': 45,
  'efficient-animated-content': 50,
  'uses-passive-event-listeners': 35,
  'no-document-write': 40,
}

// Impact from Lighthouse "impact" field
const LH_IMPACT_MULTIPLIER: Record<string, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
}

// ═══════════════════════════════════════════════
// EFFORT SCORING — estimated implementation difficulty (inverted)
// 100 = trivial, 0 = very hard
// ═══════════════════════════════════════════════

const EFFORT_SCORES: Record<string, number> = {
  // Custom audit finding patterns (by id prefix)
  'img-no-alt': 90,
  'img-no-lazy': 85,
  'img-no-dims': 80,
  'img-large': 70,
  'img-format': 65,
  'broken-link': 80,
  'missing-title': 95,
  'missing-description': 95,
  'missing-viewport': 95,
  'missing-charset': 95,
  'missing-og': 85,
  'missing-canonical': 90,
  'missing-lang': 95,
  'no-h1': 90,
  'multiple-h1': 85,
  'heading-skip': 80,
  'no-https': 40,
  'missing-header-strict-transport-security': 60,
  'missing-header-content-security-policy': 30,
  'missing-header-x-content-type-options': 75,
  'missing-header-x-frame-options': 75,
  'missing-header-referrer-policy': 80,
  'missing-header-permissions-policy': 70,
  'mixed-content': 55,
  'server-version-exposed': 70,
  'x-powered-by-exposed': 80,
  'no-viewport': 95,
  'small-tap': 60,
  'small-font': 70,
  'horizontal-scroll': 50,
  'fixed-width': 45,
  'low-contrast': 55,
  'form-no-label': 75,
  'no-skip-link': 80,
  'btn-no-accessible-name': 80,
  'link-no-accessible-name': 80,
  'render-blocking-css': 55,
  'render-blocking-js': 60,
  'large-asset': 50,
  'no-minif': 65,
  'no-compression': 55,

  // Lighthouse opportunities
  'render-blocking-resources': 50,
  'uses-optimized-images': 65,
  'uses-webp-images': 60,
  'uses-text-compression': 55,
  'unused-javascript': 40,
  'unused-css-rules': 50,
  'dom-size': 30,
  'bootup-time': 35,
  'mainthread-work-breakdown': 30,
  'uses-long-cache-ttl': 65,
  'uses-rel-preload': 80,
  'uses-rel-preconnect': 85,
  'font-display': 75,
  'efficient-animated-content': 60,
  'uses-passive-event-listeners': 70,
  'no-document-write': 60,
}

function getEffortScore(id: string): number {
  // Exact match first
  if (EFFORT_SCORES[id] != null) return EFFORT_SCORES[id]
  // Prefix match
  for (const prefix of Object.keys(EFFORT_SCORES)) {
    if (id.startsWith(prefix)) return EFFORT_SCORES[prefix]
  }
  // Default: medium effort
  return 50
}

// ═══════════════════════════════════════════════
// CONTEXT SCORING — category relevance
// Metric categories weighted by site type
// ═══════════════════════════════════════════════

const CATEGORY_METRIC_BOOST: Record<SiteCategory, Record<string, number>> = {
  ecommerce: { images: 20, assets: 15, mobile: 15, accessibility: 10, security: 10 },
  saas: { assets: 20, accessibility: 15, security: 15, mobile: 10 },
  blog: { images: 15, 'meta-tags': 20, headings: 15, mobile: 10 },
  portfolio: { images: 25, mobile: 15 },
  agency: { images: 15, 'meta-tags': 15, mobile: 10 },
  'landing-page': { images: 20, assets: 15, mobile: 15 },
  documentation: { headings: 20, 'meta-tags': 15, accessibility: 15 },
  news: { images: 15, assets: 15, 'meta-tags': 10, mobile: 10 },
  community: { accessibility: 15, mobile: 15 },
  general: {},
}

// Lighthouse opportunity → relevant for which category
const LH_CATEGORY_BOOST: Record<SiteCategory, Record<string, number>> = {
  ecommerce: {
    'uses-optimized-images': 20,
    'uses-webp-images': 20,
    'render-blocking-resources': 15,
    'uses-text-compression': 10,
  },
  saas: {
    'unused-javascript': 20,
    'bootup-time': 20,
    'mainthread-work-breakdown': 15,
    'dom-size': 15,
  },
  blog: {
    'render-blocking-resources': 15,
    'uses-optimized-images': 15,
    'font-display': 10,
  },
  portfolio: {
    'uses-optimized-images': 25,
    'uses-webp-images': 20,
    'efficient-animated-content': 15,
  },
  'landing-page': {
    'render-blocking-resources': 20,
    'uses-optimized-images': 15,
    'font-display': 10,
  },
  agency: {},
  documentation: {},
  news: {
    'render-blocking-resources': 15,
    'uses-text-compression': 15,
    'uses-long-cache-ttl': 10,
  },
  community: {
    'dom-size': 15,
    'unused-javascript': 10,
  },
  general: {},
}

// ═══════════════════════════════════════════════
// FRAMEWORK-AWARE RECOMMENDATIONS
// ═══════════════════════════════════════════════

const FRAMEWORK_HINTS: Record<string, Partial<Record<Framework, string>>> = {
  // Image optimization
  'img-large': {
    nextjs: 'Use the next/image component with automatic optimization. Set sizes prop for responsive images.',
    gatsby: 'Use gatsby-plugin-image with StaticImage or GatsbyImage for automatic optimization.',
    wordpress: 'Install a plugin like Imagify or ShortPixel for automatic image optimization.',
    shopify: 'Use Shopify\'s built-in image CDN: append ?width=800&format=webp to image URLs.',
  },
  'img-format': {
    nextjs: 'next/image automatically serves WebP/AVIF. Ensure you\'re using <Image> instead of <img>.',
    wordpress: 'Enable WebP conversion in your image optimization plugin settings.',
  },
  'img-no-lazy': {
    nextjs: 'next/image lazy-loads by default. Add priority prop to above-the-fold hero images.',
    gatsby: 'GatsbyImage lazy-loads by default. Use loading="eager" for hero images.',
  },
  'img-no-dims': {
    nextjs: 'next/image requires width and height props, which prevents CLS. Use fill prop for responsive.',
  },

  // JavaScript optimization
  'unused-javascript': {
    nextjs: 'Use next/dynamic for code splitting: const Comp = dynamic(() => import("./Heavy"), { ssr: false })',
    react: 'Use React.lazy() and Suspense for code splitting heavy components.',
    vue: 'Use defineAsyncComponent() for lazy loading: const Comp = defineAsyncComponent(() => import("./Heavy.vue"))',
    angular: 'Use Angular\'s lazy loading routes: loadChildren: () => import("./feature/feature.module")',
  },
  'bootup-time': {
    nextjs: 'Check for large client-side libraries. Use next/script with strategy="lazyOnload" for non-critical scripts.',
    react: 'Audit bundle size with source-map-explorer. Consider replacing heavy libraries.',
  },
  'mainthread-work-breakdown': {
    nextjs: 'Move heavy computation to Web Workers or API routes. Use React Server Components where possible.',
    react: 'Use useTransition for non-urgent state updates. Move computation off the main thread.',
  },

  // Render-blocking resources
  'render-blocking-resources': {
    nextjs: 'Next.js automatically code-splits pages. Check for large CSS imports in _app or layout files.',
    wordpress: 'Use a plugin like Autoptimize to defer render-blocking CSS and JavaScript.',
  },
  'render-blocking-css': {
    nextjs: 'Import CSS only in components that need it. Use CSS Modules for scoped styles.',
    wordpress: 'Use Autoptimize or WP Rocket to inline critical CSS and defer the rest.',
  },

  // Font optimization
  'font-display': {
    nextjs: 'Use next/font for automatic font-display: swap and self-hosting: import { Inter } from "next/font/google"',
    gatsby: 'Use gatsby-plugin-google-fonts with display: "swap" option.',
  },

  // Preloading
  'uses-rel-preconnect': {
    nextjs: 'Add preconnect links in your layout.tsx or _app.tsx <Head> component.',
  },
  'uses-rel-preload': {
    nextjs: 'Use next/font for automatic font preloading, or add <link rel="preload"> in layout.tsx.',
  },

  // Security
  'missing-header-content-security-policy': {
    nextjs: 'Add CSP in next.config.js headers array. Start with Content-Security-Policy-Report-Only.',
    wordpress: 'Use a security plugin like Wordfence or add CSP headers in .htaccess.',
  },
  'missing-header-strict-transport-security': {
    nextjs: 'Add HSTS in next.config.js: { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }',
  },

  // Caching
  'uses-long-cache-ttl': {
    nextjs: 'Next.js sets immutable caching for /_next/static/ assets automatically. Check custom assets.',
    wordpress: 'Use WP Super Cache or W3 Total Cache. Set Cache-Control headers for static assets.',
    shopify: 'Shopify handles CDN caching. Focus on minimizing app scripts that bypass the CDN.',
  },
}

function getFrameworkHint(findingId: string, framework: Framework): string | undefined {
  // Exact match
  if (FRAMEWORK_HINTS[findingId]?.[framework]) {
    return FRAMEWORK_HINTS[findingId][framework]
  }
  // Prefix match
  for (const prefix of Object.keys(FRAMEWORK_HINTS)) {
    if (findingId.startsWith(prefix) && FRAMEWORK_HINTS[prefix]?.[framework]) {
      return FRAMEWORK_HINTS[prefix][framework]
    }
  }
  return undefined
}

// ═══════════════════════════════════════════════
// "WHY IT MATTERS" + EXPECTED BENEFIT TEXT
// ═══════════════════════════════════════════════

const WHY_IT_MATTERS: Record<string, string> = {
  // Images
  'img-large': 'Large images are the most common cause of slow Largest Contentful Paint (LCP). Optimizing images typically delivers the single biggest performance improvement.',
  'img-format': 'Modern formats (WebP, AVIF) deliver 25–50% smaller files with equal visual quality, directly reducing load time.',
  'img-no-lazy': 'Images loaded eagerly below the fold compete with above-the-fold content for bandwidth, slowing down what users see first.',
  'img-no-dims': 'Images without dimensions cause Cumulative Layout Shift (CLS) — the page jumps as images load, frustrating users.',
  'img-no-alt': 'Missing alt text makes images invisible to screen readers and hurts SEO. Search engines use alt text to understand image content.',

  // Assets
  'render-blocking-resources': 'Render-blocking resources delay First Contentful Paint — nothing appears on screen until these files finish loading.',
  'render-blocking-css': 'Render-blocking CSS prevents the browser from showing anything until the entire stylesheet downloads.',
  'render-blocking-js': 'Render-blocking scripts freeze the page parser. Nothing below the script tag loads until execution completes.',
  'large-asset': 'Oversized assets consume bandwidth and increase load time. Users on slower connections are disproportionately affected.',
  'no-compression': 'Text compression (gzip/Brotli) can reduce transfer size by 60–80% for HTML, CSS, and JavaScript.',
  'unused-javascript': 'Unused JavaScript wastes bandwidth and blocks the main thread — the browser downloads and parses code that\'s never executed.',
  'unused-css-rules': 'Unused CSS increases stylesheet size and parsing time without contributing to the page\'s appearance.',

  // Meta / SEO
  'missing-title': 'The title tag is the single most important on-page SEO element. Without it, search engines cannot properly index your page.',
  'missing-description': 'Meta descriptions appear in search results. A compelling description directly increases click-through rates from search.',
  'missing-canonical': 'Without a canonical URL, search engines may treat duplicate URLs as separate pages, diluting your ranking.',

  // Security
  'no-https': 'HTTPS is required by Google for ranking. Modern browsers flag HTTP sites as "Not Secure," eroding user trust.',
  'missing-header-strict-transport-security': 'Without HSTS, users can be silently downgraded to HTTP by attackers (SSL stripping).',
  'missing-header-content-security-policy': 'CSP prevents cross-site scripting (XSS) attacks by controlling which scripts can execute on your page.',
  'mixed-content': 'Mixed content (HTTP resources on HTTPS pages) weakens security and triggers browser warnings.',

  // Mobile
  'no-viewport': 'Without the viewport meta tag, mobile browsers render the page at desktop width, making it unusable on phones.',
  'horizontal-scroll': 'Horizontal scrolling on mobile forces users to scroll sideways to read content — most will leave instead.',
  'small-tap': 'Tap targets smaller than 48px are difficult to press on mobile, causing frustration and mis-clicks.',

  // Performance
  'bootup-time': 'Long JavaScript execution delays interactivity. The page appears loaded but doesn\'t respond to user input.',
  'mainthread-work-breakdown': 'When the main thread is busy, the browser cannot respond to user input or update the screen.',
  'dom-size': 'Very large DOMs slow down every style calculation, layout, and repaint. They also increase memory usage.',
  'font-display': 'Without font-display: swap, text is invisible while web fonts load — users see a blank page.',
  'uses-long-cache-ttl': 'Short cache lifetimes force repeat visitors to re-download assets they already have.',
  'uses-text-compression': 'Uncompressed text transfers waste 60-80% of bandwidth. Compression is the easiest server-side win.',
}

const EXPECTED_BENEFITS: Record<string, string> = {
  'img-large': 'Faster LCP, reduced bandwidth usage, improved mobile experience',
  'img-format': '25–50% smaller image files, faster page load',
  'img-no-lazy': 'Faster above-the-fold content loading, reduced initial bandwidth',
  'img-no-dims': 'Reduced layout shift (CLS), smoother visual experience',
  'img-no-alt': 'Improved accessibility and SEO',
  'render-blocking-resources': 'Faster First Contentful Paint, quicker time-to-interactive',
  'render-blocking-css': 'Content visible sooner, better perceived performance',
  'render-blocking-js': 'Faster page parsing and rendering',
  'large-asset': 'Reduced download time, especially on slow connections',
  'no-compression': '60–80% reduction in transfer size for text assets',
  'unused-javascript': 'Reduced download size and main thread work',
  'unused-css-rules': 'Smaller stylesheets, faster parsing',
  'missing-title': 'Improved search engine visibility and click-through rate',
  'missing-description': 'Higher click-through rate from search results',
  'no-https': 'Required for modern web — SEO, security, and user trust',
  'missing-header-strict-transport-security': 'Protection against SSL stripping attacks',
  'missing-header-content-security-policy': 'Protection against XSS attacks',
  'no-viewport': 'Mobile-friendly rendering — required for Google mobile-first indexing',
  'horizontal-scroll': 'Usable mobile layout without horizontal scrolling',
  'bootup-time': 'Faster interactivity, improved INP/TBT scores',
  'mainthread-work-breakdown': 'Smoother scrolling, faster input response',
  'dom-size': 'Faster rendering and lower memory usage',
  'font-display': 'Text visible immediately, no flash of invisible text',
  'uses-long-cache-ttl': 'Instant repeat visits for returning users',
  'uses-text-compression': 'Significantly reduced transfer sizes',
}

function getWhyItMatters(id: string): string {
  if (WHY_IT_MATTERS[id]) return WHY_IT_MATTERS[id]
  for (const prefix of Object.keys(WHY_IT_MATTERS)) {
    if (id.startsWith(prefix)) return WHY_IT_MATTERS[prefix]
  }
  return 'Fixing this issue improves your page\'s performance, user experience, or search engine visibility.'
}

function getExpectedBenefit(id: string): string {
  if (EXPECTED_BENEFITS[id]) return EXPECTED_BENEFITS[id]
  for (const prefix of Object.keys(EXPECTED_BENEFITS)) {
    if (id.startsWith(prefix)) return EXPECTED_BENEFITS[prefix]
  }
  return 'Improved page performance and user experience'
}

function getEstimatedImprovement(impactScore: number): 'significant' | 'moderate' | 'minor' {
  if (impactScore >= 70) return 'significant'
  if (impactScore >= 40) return 'moderate'
  return 'minor'
}

// ═══════════════════════════════════════════════
// MAIN: PRIORITIZE ISSUES
// ═══════════════════════════════════════════════

interface CustomFinding {
  id: string
  title: string
  description: string
  severity: string
  category?: string
  recommendation?: {
    fix: string
    codeSnippet?: string
    docsUrl?: string
    estimatedImpact?: string
  }
  estimatedUplift?: number
}

interface LighthouseOpportunity {
  id: string
  title: string
  description: string
  score: number
  displayValue?: string
  impact: string
}

/**
 * Prioritize all issues from both engines into scored, tiered recommendations.
 */
export function prioritizeIssues(params: {
  customFindings: CustomFinding[]
  lighthouseOpportunities: LighthouseOpportunity[]
  siteCategory: SiteCategory
  framework: Framework
}): PrioritizedIssue[] {
  const { customFindings, lighthouseOpportunities, siteCategory, framework } = params
  const results: PrioritizedIssue[] = []

  // ── Process custom audit findings ──
  for (const finding of customFindings) {
    const impactScore = SEVERITY_IMPACT[finding.severity] ?? 50
    const effortScore = getEffortScore(finding.id)
    const confidenceScore = 80 // Direct HTML inspection = high confidence

    // Context boost from site category
    const categoryBoosts = CATEGORY_METRIC_BOOST[siteCategory] || {}
    const categoryBoost = categoryBoosts[finding.category || ''] || 0
    const contextScore = Math.min(100, 50 + categoryBoost)

    const priorityScore = Math.round(
      impactScore * WEIGHTS.impact +
      effortScore * WEIGHTS.effort +
      confidenceScore * WEIGHTS.confidence +
      contextScore * WEIGHTS.context
    )

    const frameworkHint = getFrameworkHint(finding.id, framework)

    results.push({
      id: finding.id,
      title: finding.title,
      priorityTier: assignTier(priorityScore, impactScore),
      priorityScore,
      impactScore,
      effortScore,
      confidenceScore,
      businessNarrative: finding.description,
      technicalDetail: finding.description,
      frameworkHint,
      whyItMatters: getWhyItMatters(finding.id),
      expectedBenefit: getExpectedBenefit(finding.id),
      estimatedImprovement: getEstimatedImprovement(impactScore),
      source: 'custom-audit',
      originalSeverity: finding.severity as any,
      fix: finding.recommendation ? {
        instruction: finding.recommendation.fix,
        codeSnippet: finding.recommendation.codeSnippet,
        docsUrl: finding.recommendation.docsUrl,
      } : undefined,
    })
  }

  // ── Process Lighthouse opportunities ──
  for (const opp of lighthouseOpportunities) {
    const baseImpact = LIGHTHOUSE_IMPACT[opp.id] ?? 50
    const impactMultiplier = LH_IMPACT_MULTIPLIER[opp.impact] ?? 0.7
    const impactScore = Math.round(baseImpact * impactMultiplier)

    const effortScore = getEffortScore(opp.id)
    const confidenceScore = 75 // Lighthouse lab data = moderately high

    // Context boost
    const lhBoosts = LH_CATEGORY_BOOST[siteCategory] || {}
    const categoryBoost = lhBoosts[opp.id] || 0
    const contextScore = Math.min(100, 50 + categoryBoost)

    const priorityScore = Math.round(
      impactScore * WEIGHTS.impact +
      effortScore * WEIGHTS.effort +
      confidenceScore * WEIGHTS.confidence +
      contextScore * WEIGHTS.context
    )

    const frameworkHint = getFrameworkHint(opp.id, framework)

    results.push({
      id: `lh-${opp.id}`,
      title: opp.title,
      priorityTier: assignTier(priorityScore, impactScore),
      priorityScore,
      impactScore,
      effortScore,
      confidenceScore,
      businessNarrative: opp.description?.slice(0, 200) || opp.title,
      technicalDetail: opp.description || opp.title,
      frameworkHint,
      whyItMatters: getWhyItMatters(opp.id),
      expectedBenefit: getExpectedBenefit(opp.id),
      estimatedImprovement: getEstimatedImprovement(impactScore),
      source: 'lighthouse',
      fix: undefined, // Lighthouse opportunities get fixes from the existing OpportunityFixes
    })
  }

  // Sort by priority score descending
  results.sort((a, b) => b.priorityScore - a.priorityScore)

  log.info('Issues prioritized', {
    total: results.length,
    fixFirst: results.filter(r => r.priorityTier === 'fix-first').length,
    fixNext: results.filter(r => r.priorityTier === 'fix-next').length,
    optional: results.filter(r => r.priorityTier === 'optional').length,
  })

  return results
}
