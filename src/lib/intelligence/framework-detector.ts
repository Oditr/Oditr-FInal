// ── Oditr Intelligence Engine — Framework Detector ──
// Identifies the technology stack from HTML content, HTTP headers, and URL patterns.
// Used to generate framework-specific recommendations.

import type { Framework, FrameworkDetection } from './types'
import { createLogger } from './logger'

const log = createLogger('intelligence:framework')

// ═══════════════════════════════════════════════
// DETECTION SIGNALS
// ═══════════════════════════════════════════════

interface FrameworkSignal {
  framework: Framework
  label: string
  /** Test against HTML source */
  htmlPatterns?: RegExp[]
  /** Test against HTTP headers (key → value pattern) */
  headerPatterns?: { key: string; pattern: RegExp }[]
  /** Test against URL path patterns (from resource URLs in HTML) */
  urlPatterns?: RegExp[]
  /** Base confidence if any signal matches (0–100) */
  baseConfidence: number
  /** Additional confidence per extra matching signal */
  perSignalBonus: number
}

const FRAMEWORK_SIGNALS: FrameworkSignal[] = [
  // ── Next.js ──
  {
    framework: 'nextjs',
    label: 'Next.js',
    htmlPatterns: [
      /__NEXT_DATA__/,
      /__next/,
      /next-route-announcer/,
      /_next\/static/,
      /_next\/image/,
      /nextjs/i,
    ],
    headerPatterns: [
      { key: 'x-powered-by', pattern: /next\.js/i },
      { key: 'server', pattern: /next/i },
    ],
    urlPatterns: [
      /\/_next\//,
    ],
    baseConfidence: 60,
    perSignalBonus: 10,
  },

  // ── Gatsby ──
  {
    framework: 'gatsby',
    label: 'Gatsby',
    htmlPatterns: [
      /gatsby/i,
      /___gatsby/,
      /gatsby-image/,
      /gatsby-resp-image/,
      /page-data\/app-data\.json/,
    ],
    urlPatterns: [
      /\/page-data\//,
    ],
    baseConfidence: 65,
    perSignalBonus: 10,
  },

  // ── Nuxt.js (before Vue so it takes priority) ──
  {
    framework: 'nuxt',
    label: 'Nuxt.js',
    htmlPatterns: [
      /__nuxt/,
      /nuxt/i,
      /_nuxt\//,
      /nuxt-link/,
    ],
    urlPatterns: [
      /\/_nuxt\//,
    ],
    baseConfidence: 60,
    perSignalBonus: 10,
  },

  // ── React (generic — check after Next.js/Gatsby) ──
  {
    framework: 'react',
    label: 'React',
    htmlPatterns: [
      /data-reactroot/,
      /react-dom/,
      /__react/i,
      /reactFiber/,
      /react\.production/,
      /react\.development/,
    ],
    baseConfidence: 45,
    perSignalBonus: 12,
  },

  // ── Vue (generic — check after Nuxt) ──
  {
    framework: 'vue',
    label: 'Vue.js',
    htmlPatterns: [
      /data-v-[a-f0-9]+/,
      /__vue__/,
      /vue\.runtime/,
      /vue\.global/,
      /v-cloak/,
    ],
    baseConfidence: 45,
    perSignalBonus: 12,
  },

  // ── Angular ──
  {
    framework: 'angular',
    label: 'Angular',
    htmlPatterns: [
      /ng-version/,
      /ng-app/,
      /angular\.js/,
      /_ng[A-Z]/,
      /ng-reflect/,
      /\[ngClass\]/,
    ],
    baseConfidence: 55,
    perSignalBonus: 10,
  },

  // ── Svelte ──
  {
    framework: 'svelte',
    label: 'Svelte',
    htmlPatterns: [
      /svelte/i,
      /__svelte/,
      /svelte-/,
    ],
    baseConfidence: 50,
    perSignalBonus: 15,
  },

  // ── Astro ──
  {
    framework: 'astro',
    label: 'Astro',
    htmlPatterns: [
      /astro-/,
      /data-astro/,
      /_astro\//,
    ],
    headerPatterns: [
      { key: 'x-astro', pattern: /.+/ },
    ],
    baseConfidence: 55,
    perSignalBonus: 15,
  },

  // ── WordPress ──
  {
    framework: 'wordpress',
    label: 'WordPress',
    htmlPatterns: [
      /wp-content/,
      /wp-includes/,
      /wp-json/,
      /wordpress/i,
      /wp-embed/,
      /woocommerce/i,
    ],
    headerPatterns: [
      { key: 'x-powered-by', pattern: /wordpress/i },
      { key: 'link', pattern: /wp-json/i },
    ],
    baseConfidence: 60,
    perSignalBonus: 8,
  },

  // ── Shopify ──
  {
    framework: 'shopify',
    label: 'Shopify',
    htmlPatterns: [
      /Shopify\.theme/,
      /cdn\.shopify\.com/,
      /shopify/i,
      /myshopify\.com/,
      /shopify-section/,
    ],
    headerPatterns: [
      { key: 'x-shopify-stage', pattern: /.+/ },
      { key: 'x-sorting-hat-shopid', pattern: /.+/ },
    ],
    baseConfidence: 70,
    perSignalBonus: 8,
  },

  // ── Wix ──
  {
    framework: 'wix',
    label: 'Wix',
    htmlPatterns: [
      /wix\.com/,
      /wixsite\.com/,
      /static\.parastorage\.com/,
      /wix-code/,
    ],
    headerPatterns: [
      { key: 'x-wix-request-id', pattern: /.+/ },
    ],
    baseConfidence: 70,
    perSignalBonus: 10,
  },

  // ── Squarespace ──
  {
    framework: 'squarespace',
    label: 'Squarespace',
    htmlPatterns: [
      /squarespace/i,
      /sqsp/i,
      /static1\.squarespace\.com/,
    ],
    headerPatterns: [
      { key: 'server', pattern: /squarespace/i },
    ],
    baseConfidence: 70,
    perSignalBonus: 10,
  },
]

// ═══════════════════════════════════════════════
// DETECTION LOGIC
// ═══════════════════════════════════════════════

interface DetectionCandidate {
  framework: Framework
  label: string
  confidence: number
  signals: string[]
}

/**
 * Detect the technology framework from HTML, headers, and URL.
 */
export function detectFramework(
  html: string | undefined,
  headers: Record<string, string> | undefined,
  url: string
): FrameworkDetection {
  const candidates: DetectionCandidate[] = []

  for (const sig of FRAMEWORK_SIGNALS) {
    const matchedSignals: string[] = []

    // Test HTML patterns
    if (html && sig.htmlPatterns) {
      for (const pattern of sig.htmlPatterns) {
        if (pattern.test(html)) {
          matchedSignals.push(`HTML: ${pattern.source}`)
        }
      }
    }

    // Test header patterns
    if (headers && sig.headerPatterns) {
      for (const { key, pattern } of sig.headerPatterns) {
        const headerVal = headers[key] || headers[key.toLowerCase()]
        if (headerVal && pattern.test(headerVal)) {
          matchedSignals.push(`Header: ${key}`)
        }
      }
    }

    // Test URL patterns
    if (sig.urlPatterns) {
      for (const pattern of sig.urlPatterns) {
        if (html && pattern.test(html)) {
          matchedSignals.push(`URL pattern: ${pattern.source}`)
        }
      }
    }

    if (matchedSignals.length > 0) {
      const confidence = Math.min(
        100,
        sig.baseConfidence + (matchedSignals.length - 1) * sig.perSignalBonus
      )
      candidates.push({
        framework: sig.framework,
        label: sig.label,
        confidence,
        signals: matchedSignals,
      })
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence)

  if (candidates.length === 0) {
    log.info('No framework detected', { url })
    return {
      framework: 'unknown',
      label: 'Unknown',
      confidence: 0,
      signals: [],
      reliable: false,
    }
  }

  const winner = candidates[0]

  // If two top candidates are close (within 15 points), lower confidence
  if (candidates.length > 1 && candidates[1].confidence >= winner.confidence - 15) {
    winner.confidence = Math.max(30, winner.confidence - 15)
  }

  log.info('Framework detected', {
    framework: winner.framework,
    confidence: winner.confidence,
    signals: winner.signals.length,
    url,
  })

  let version: string | undefined

  // Version detection logic
  if (winner.framework === 'nextjs' && html) {
    // App Router typically has specific RSC markers, while Pages Router has __NEXT_DATA__
    if (html.includes('__NEXT_DATA__')) {
      version = 'pages-router'
    } else if (html.includes('__next_f') || html.includes('flight-')) {
      version = 'app-router'
    }
  } else if (winner.framework === 'react' && html) {
    if (html.includes('react@18') || html.includes('react-dom@18')) {
      version = '18'
    } else if (html.includes('react@19') || html.includes('react-dom@19')) {
      version = '19'
    }
  }

  return {
    framework: winner.framework,
    version,
    label: winner.label,
    confidence: winner.confidence,
    signals: winner.signals,
    reliable: winner.confidence >= 55,
  }
}
