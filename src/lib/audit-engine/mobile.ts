// ── Mobile Responsiveness Checks ──
// Checks viewport meta, responsive hints, tap targets

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkMobile(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // ── Viewport meta tag ──
  const viewport = $('meta[name="viewport"]').attr('content')?.toLowerCase() || ''
  if (!viewport) {
    failed++
    findings.push({
      id: 'missing-viewport',
      title: 'Missing viewport meta tag',
      description: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile rendering',
      severity: 'critical',
      category: 'mobile',
    })
  } else {
    // Check viewport content
    if (!viewport.includes('width=device-width')) {
      failed++
      findings.push({
        id: 'viewport-no-device-width',
        title: 'Viewport missing width=device-width',
        description: `Current viewport: "${viewport}". Add width=device-width for responsive design.`,
        severity: 'critical',
        category: 'mobile',
        value: viewport,
      })
    } else {
      passed++
    }

    if (!viewport.includes('initial-scale')) {
      failed++
      findings.push({
        id: 'viewport-no-initial-scale',
        title: 'Viewport missing initial-scale',
        description: 'Add initial-scale=1 to prevent unexpected zooming behavior',
        severity: 'low',
        category: 'mobile',
        value: viewport,
      })
    } else {
      passed++
    }

    // Check for user-scalable=no (accessibility issue)
    if (viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1')) {
      failed++
      findings.push({
        id: 'viewport-zoom-disabled',
        title: 'Zooming is disabled',
        description: 'user-scalable=no or maximum-scale=1 prevents users from zooming. This is an accessibility concern.',
        severity: 'medium',
        category: 'mobile',
        value: viewport,
      })
    } else {
      passed++
    }
  }

  // ── Check for responsive indicators in CSS ──
  // Look for inline styles or style blocks with @media queries
  const styleContent = $('style').map((_, el) => $(el).text()).get().join('\n')
  const hasMediaQueries = styleContent.includes('@media') ||
    $('link[media]').filter((_, el) => {
      const media = $(el).attr('media') || ''
      return media.includes('max-width') || media.includes('min-width')
    }).length > 0

  // Check for fixed widths on main content areas
  const hasFixedWidth = $('[style]').filter((_, el) => {
    const style = $(el).attr('style') || ''
    return /width:\s*\d{4,}px/.test(style) // fixed width > 999px
  }).length > 0

  if (hasFixedWidth) {
    failed++
    findings.push({
      id: 'fixed-width-elements',
      title: 'Fixed-width elements detected',
      description: 'Elements with large fixed pixel widths may cause horizontal scrolling on mobile',
      severity: 'medium',
      category: 'mobile',
    })
  } else {
    passed++
  }

  // ── Check for mobile-unfriendly patterns ──
  // Tables without responsive wrapper
  const tables = $('table').length
  const responsiveTables = $('table').filter((_, el) => {
    const parent = $(el).parent()
    const parentStyle = parent.attr('style') || ''
    return parentStyle.includes('overflow') || parent.hasClass('table-responsive') || parent.css('overflow-x') === 'auto'
  }).length

  if (tables > 0 && responsiveTables < tables) {
    failed++
    findings.push({
      id: 'non-responsive-tables',
      title: `${tables - responsiveTables} table(s) may not be responsive`,
      description: 'Wrap tables in a container with overflow-x: auto for mobile scrolling',
      severity: 'low',
      category: 'mobile',
      value: String(tables - responsiveTables),
    })
  } else if (tables > 0) {
    passed++
  }

  // ── Touch target sizes ──
  // Check for very small clickable elements (approximate check via inline font-size)
  let smallTargets = 0
  $('a, button, input[type="submit"], input[type="button"]').each((_, el) => {
    const style = $(el).attr('style') || ''
    const fontMatch = style.match(/font-size:\s*(\d+)px/)
    if (fontMatch && parseInt(fontMatch[1]) < 12) {
      smallTargets++
    }
  })

  if (smallTargets > 0) {
    failed++
    findings.push({
      id: 'small-touch-targets',
      title: `${smallTargets} potentially small touch target(s)`,
      description: 'Interactive elements should be at least 44×44 CSS pixels for mobile usability',
      severity: 'low',
      category: 'mobile',
      value: String(smallTargets),
    })
  } else {
    passed++
  }

  // ── Check for text legibility ──
  // Look for very small font sizes in inline styles
  let tinyText = 0
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || ''
    const fontMatch = style.match(/font-size:\s*(\d+)px/)
    if (fontMatch && parseInt(fontMatch[1]) < 12) {
      tinyText++
    }
  })

  if (tinyText > 3) {
    failed++
    findings.push({
      id: 'small-text',
      title: `${tinyText} elements with small text (<12px)`,
      description: 'Text smaller than 12px is hard to read on mobile devices',
      severity: 'low',
      category: 'mobile',
      value: String(tinyText),
    })
  } else {
    passed++
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'mobile',
    label: 'Mobile Friendliness',
    score,
    passed,
    failed,
    findings,
  }
}
