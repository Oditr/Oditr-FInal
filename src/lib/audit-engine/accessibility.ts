// ── Accessibility Quick Checks ──
// Checks alt text, lang, labels, ARIA landmarks, color contrast hints

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkAccessibility(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // ── html lang attribute ──
  const lang = $('html').attr('lang')
  if (!lang) {
    failed++
    findings.push({
      id: 'no-html-lang',
      title: 'Missing lang attribute on <html>',
      description: 'Screen readers use the lang attribute to determine the correct pronunciation',
      severity: 'critical',
      category: 'accessibility',
    })
  } else {
    passed++
  }

  // ── Images without alt ──
  let imgNoAlt = 0
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')
    if (alt === undefined) { // alt="" is acceptable for decorative images
      imgNoAlt++
    }
  })
  if (imgNoAlt > 0) {
    failed++
    findings.push({
      id: 'img-no-alt-a11y',
      title: `${imgNoAlt} image(s) missing alt attribute`,
      description: 'All images must have alt attributes. Use alt="" for decorative images.',
      severity: imgNoAlt > 5 ? 'critical' : 'medium',
      category: 'accessibility',
      value: String(imgNoAlt),
    })
  } else {
    passed++
  }

  // ── Form inputs without labels ──
  let unlabeledInputs = 0
  $('input, select, textarea').each((_, el) => {
    const id = $(el).attr('id')
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledBy = $(el).attr('aria-labelledby')
    const type = $(el).attr('type')

    // Skip hidden, submit, button, image types
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type || '')) return

    const hasLabel = (id && $(`label[for="${id}"]`).length > 0) || ariaLabel || ariaLabelledBy
    if (!hasLabel) {
      unlabeledInputs++
    }
  })

  if (unlabeledInputs > 0) {
    failed++
    findings.push({
      id: 'unlabeled-inputs',
      title: `${unlabeledInputs} form input(s) without labels`,
      description: 'Form inputs need associated <label> elements or aria-label attributes',
      severity: 'medium',
      category: 'accessibility',
      value: String(unlabeledInputs),
    })
  } else {
    passed++
  }

  // ── Buttons without accessible names ──
  let emptyButtons = 0
  $('button').each((_, el) => {
    const text = $(el).text().trim()
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledBy = $(el).attr('aria-labelledby')
    const title = $(el).attr('title')
    if (!text && !ariaLabel && !ariaLabelledBy && !title) {
      emptyButtons++
    }
  })

  if (emptyButtons > 0) {
    failed++
    findings.push({
      id: 'empty-buttons',
      title: `${emptyButtons} button(s) without accessible name`,
      description: 'Buttons must have text content, aria-label, or title attribute',
      severity: 'medium',
      category: 'accessibility',
      value: String(emptyButtons),
    })
  } else {
    passed++
  }

  // ── ARIA landmarks ──
  const hasMain = $('main, [role="main"]').length > 0
  const hasNav = $('nav, [role="navigation"]').length > 0
  const hasHeader = $('header, [role="banner"]').length > 0
  const hasFooter = $('footer, [role="contentinfo"]').length > 0

  if (!hasMain) {
    failed++
    findings.push({
      id: 'no-main-landmark',
      title: 'Missing <main> landmark',
      description: 'Use a <main> element to identify the primary content area',
      severity: 'medium',
      category: 'accessibility',
    })
  } else {
    passed++
  }

  if (!hasNav) {
    failed++
    findings.push({
      id: 'no-nav-landmark',
      title: 'Missing <nav> landmark',
      description: 'Use <nav> elements to identify navigation regions',
      severity: 'low',
      category: 'accessibility',
    })
  } else {
    passed++
  }

  if (!hasHeader) {
    findings.push({
      id: 'no-header-landmark',
      title: 'Missing <header> landmark',
      description: 'Use a <header> element for the page banner/header area',
      severity: 'low',
      category: 'accessibility',
    })
    failed++
  } else {
    passed++
  }

  // ── Skip navigation link ──
  const hasSkipLink = $('a[href="#main"], a[href="#content"], a.skip-link, a.skip-nav').length > 0
  if (!hasSkipLink) {
    failed++
    findings.push({
      id: 'no-skip-link',
      title: 'Missing skip navigation link',
      description: 'Add a "Skip to content" link for keyboard users to bypass navigation',
      severity: 'low',
      category: 'accessibility',
    })
  } else {
    passed++
  }

  // ── Links with generic text ──
  let genericLinks = 0
  const genericTexts = ['click here', 'here', 'read more', 'learn more', 'more', 'link']
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    if (genericTexts.includes(text)) {
      genericLinks++
    }
  })

  if (genericLinks > 2) {
    failed++
    findings.push({
      id: 'generic-link-text',
      title: `${genericLinks} links with generic text`,
      description: 'Links like "click here" or "read more" are not descriptive for screen readers. Use meaningful link text.',
      severity: 'low',
      category: 'accessibility',
      value: String(genericLinks),
    })
  } else {
    passed++
  }

  // ── Tabindex > 0 (anti-pattern) ──
  const badTabindex = $('[tabindex]').filter((_, el) => {
    const val = parseInt($(el).attr('tabindex') || '0', 10)
    return val > 0
  }).length

  if (badTabindex > 0) {
    failed++
    findings.push({
      id: 'positive-tabindex',
      title: `${badTabindex} element(s) with tabindex > 0`,
      description: 'Positive tabindex values can create confusing tab order. Use tabindex="0" or tabindex="-1" instead.',
      severity: 'medium',
      category: 'accessibility',
      value: String(badTabindex),
    })
  } else {
    passed++
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'accessibility',
    label: 'Accessibility',
    score,
    passed,
    failed,
    findings,
  }
}
