// ── Accessibility Deep Checks ──
// WCAG-aligned checks covering semantic HTML, ARIA, keyboard nav,
// form labeling, link names, and focus management.
// Note: Color contrast requires computed styles — not available without browser rendering.

import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkAccessibility(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // ─────────────────────────────────────────────
  // 1. html[lang] attribute (WCAG 3.1.1 - Level A)
  // ─────────────────────────────────────────────
  const lang = $('html').attr('lang')
  if (!lang) {
    failed++
    findings.push({
      id: 'no-html-lang',
      title: 'Missing lang attribute on <html>',
      description: 'Screen readers use the `lang` attribute to determine the correct language and pronunciation engine. Without it, content may be read in the wrong language.',
      severity: 'critical',
      category: 'accessibility',
      recommendation: {
        fix: 'Add `lang="en"` (or the appropriate BCP 47 language code) to your `<html>` element: `<html lang="en">`.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 2. Images without alt text (WCAG 1.1.1 - Level A)
  // ─────────────────────────────────────────────
  let imgNoAlt = 0
  const imgSamples: string[] = []
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')
    if (alt === undefined) {
      imgNoAlt++
      const src = $(el).attr('src') || ''
      if (imgSamples.length < 3) imgSamples.push(src.slice(0, 60))
    }
  })
  if (imgNoAlt > 0) {
    failed++
    findings.push({
      id: 'img-no-alt-a11y',
      title: `${imgNoAlt} image${imgNoAlt > 1 ? 's' : ''} missing alt attribute`,
      description: 'All `<img>` elements must have an `alt` attribute. Screen readers will announce the file name as the description without it. Use `alt=""` for purely decorative images.',
      severity: imgNoAlt > 5 ? 'critical' : 'moderate',
      category: 'accessibility',
      value: String(imgNoAlt),
      element: imgSamples.join(', '),
      recommendation: {
        fix: 'Add descriptive `alt` text to all informational images. For decorative images that add no information, use an empty alt: `alt=""`. For icons next to text, the icon alt can be empty since the adjacent text provides context.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 3. Form inputs without labels (WCAG 1.3.1 - Level A)
  // ─────────────────────────────────────────────
  let unlabeledInputs = 0
  $('input, select, textarea').each((_, el) => {
    const id = $(el).attr('id')
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledBy = $(el).attr('aria-labelledby')
    const type = $(el).attr('type')
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type || '')) return
    const hasLabel = (id && $(`label[for="${id}"]`).length > 0) || ariaLabel || ariaLabelledBy
    if (!hasLabel) unlabeledInputs++
  })
  if (unlabeledInputs > 0) {
    failed++
    findings.push({
      id: 'unlabeled-inputs',
      title: `${unlabeledInputs} form input${unlabeledInputs > 1 ? 's' : ''} without labels`,
      description: 'Form inputs need programmatically associated labels. Screen readers announce the label when a field receives focus — without it, users don\'t know what to type.',
      severity: 'moderate',
      category: 'accessibility',
      value: String(unlabeledInputs),
      recommendation: {
        fix: 'Associate a `<label>` via `for`/`id` pairing, or add `aria-label="Field name"` directly to the input. Example: `<label for="email">Email</label> <input id="email" type="email">`.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 4. autocomplete on sensitive inputs (WCAG 1.3.5 - Level AA)
  // ─────────────────────────────────────────────
  const sensitiveInputTypes = ['email', 'tel', 'name', 'given-name', 'family-name', 'username']
  let missingAutocomplete = 0
  $('input[type="email"], input[type="tel"]').each((_, el) => {
    const autocomplete = $(el).attr('autocomplete')
    if (!autocomplete) missingAutocomplete++
  })
  if (missingAutocomplete > 0) {
    failed++
    findings.push({
      id: 'missing-autocomplete',
      title: `${missingAutocomplete} sensitive input${missingAutocomplete > 1 ? 's' : ''} missing autocomplete`,
      description: 'The `autocomplete` attribute helps users with cognitive disabilities and motor impairments by enabling browsers and password managers to auto-fill personal information.',
      severity: 'minor',
      category: 'accessibility',
      value: String(missingAutocomplete),
      recommendation: {
        fix: 'Add `autocomplete` tokens to inputs: `<input type="email" autocomplete="email">`, `<input type="tel" autocomplete="tel">`. See the full token list at https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 5. Buttons without accessible names (WCAG 4.1.2 - Level A)
  // ─────────────────────────────────────────────
  let emptyButtons = 0
  const emptyButtonExamples: string[] = []
  $('button').each((_, el) => {
    const text = $(el).text().trim()
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledBy = $(el).attr('aria-labelledby')
    const title = $(el).attr('title')
    const hasChildImg = $(el).find('img[alt]').length > 0
    const hasAriaHidden = $(el).attr('aria-hidden') === 'true'
    if (!text && !ariaLabel && !ariaLabelledBy && !title && !hasChildImg && !hasAriaHidden) {
      emptyButtons++
      const outerHtml = $.html(el).slice(0, 80)
      if (emptyButtonExamples.length < 2) emptyButtonExamples.push(outerHtml)
    }
  })
  if (emptyButtons > 0) {
    failed++
    findings.push({
      id: 'empty-buttons',
      title: `${emptyButtons} button${emptyButtons > 1 ? 's' : ''} without accessible name`,
      description: 'Buttons must have a text label, `aria-label`, or `title` attribute. Icon-only buttons are common offenders — screen readers will announce them as "button" with no context.',
      severity: 'moderate',
      category: 'accessibility',
      value: String(emptyButtons),
      recommendation: {
        fix: 'Add `aria-label="Descriptive action"` to icon-only buttons: `<button aria-label="Close dialog"><svg>…</svg></button>`. Alternatively, add visually hidden text using a screen-reader-only CSS class.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 6. Links without accessible names (WCAG 2.4.4 - Level A)
  // ─────────────────────────────────────────────
  let emptyLinks = 0
  $('a').each((_, el) => {
    const text = $(el).text().trim()
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledBy = $(el).attr('aria-labelledby')
    const title = $(el).attr('title')
    const hasChildImg = $(el).find('img[alt]').length > 0
    const href = $(el).attr('href')
    // Only check links that actually navigate (ignore anchors without href)
    if (!href) return
    if (!text && !ariaLabel && !ariaLabelledBy && !title && !hasChildImg) {
      emptyLinks++
    }
  })
  if (emptyLinks > 0) {
    failed++
    findings.push({
      id: 'empty-links',
      title: `${emptyLinks} link${emptyLinks > 1 ? 's' : ''} without accessible name`,
      description: 'Links without discernible text (no visible label, aria-label, or image alt) are impossible to use with a screen reader. They are announced as empty links with no purpose.',
      severity: 'moderate',
      category: 'accessibility',
      value: String(emptyLinks),
      recommendation: {
        fix: 'Add descriptive text content or `aria-label` to all links. For icon links, add `aria-label="Go to homepage"`. Avoid wrapping images in links without setting an alt text on the image.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 7. Generic link text (WCAG 2.4.6 - Level AA)
  // ─────────────────────────────────────────────
  let genericLinks = 0
  const genericTexts = new Set(['click here', 'here', 'read more', 'learn more', 'more', 'link', 'this link', 'details', 'info'])
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    if (genericTexts.has(text)) genericLinks++
  })
  if (genericLinks > 2) {
    failed++
    findings.push({
      id: 'generic-link-text',
      title: `${genericLinks} links with non-descriptive text`,
      description: 'Links like "click here", "read more", or "here" are meaningless when read out of context by screen readers, which often navigate by listing all links on a page.',
      severity: 'minor',
      category: 'accessibility',
      value: String(genericLinks),
      recommendation: {
        fix: 'Replace generic link text with descriptive text that makes sense standalone. Instead of "click here", write "Download the accessibility audit report". Use CSS to style links however you like without affecting the text.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 8. ARIA landmark structure (WCAG 1.3.6 - Level AAA)
  // ─────────────────────────────────────────────
  const mainElements = $('main, [role="main"]').length
  const navElements = $('nav, [role="navigation"]').length
  const hasHeader = $('header, [role="banner"]').length > 0
  const hasFooter = $('footer, [role="contentinfo"]').length > 0

  if (mainElements === 0) {
    failed++
    findings.push({
      id: 'no-main-landmark',
      title: 'Missing <main> landmark',
      description: 'A `<main>` landmark identifies the primary content area of the page. Screen reader users rely on this to jump directly to main content, bypassing headers and navigation.',
      severity: 'moderate',
      category: 'accessibility',
      recommendation: {
        fix: 'Wrap your primary page content in a `<main>` element. Only one `<main>` should exist per page. It should not contain navigation, headers, or footers.',
        estimatedImpact: 'medium',
      },
    })
  } else if (mainElements > 1) {
    failed++
    findings.push({
      id: 'multiple-main-landmarks',
      title: `Multiple <main> landmarks detected (${mainElements})`,
      description: 'A page should only have one `<main>` landmark. Multiple `<main>` elements create an ambiguous document structure for assistive technologies.',
      severity: 'moderate',
      category: 'accessibility',
      value: String(mainElements),
      recommendation: {
        fix: 'Ensure only one `<main>` element exists on the page. If you have multiple content sections, use `<section>` or `<article>` elements instead.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  if (navElements === 0) {
    failed++
    findings.push({
      id: 'no-nav-landmark',
      title: 'Missing <nav> landmark',
      description: 'A `<nav>` landmark identifies navigation regions. Screen reader users can jump between named navigation regions using keyboard shortcuts.',
      severity: 'minor',
      category: 'accessibility',
      recommendation: {
        fix: 'Wrap navigation menus in `<nav>` elements. If you have multiple navs (e.g., main and footer), add `aria-label` to distinguish them: `<nav aria-label="Main navigation">`.',
        estimatedImpact: 'low',
      },
    })
  } else {
    // Multiple navs without labels — check for unnamed duplicates
    if (navElements > 1) {
      const navsWithoutLabel = $('nav:not([aria-label]):not([aria-labelledby]), [role="navigation"]:not([aria-label]):not([aria-labelledby])').length
      if (navsWithoutLabel > 1) {
        failed++
        findings.push({
          id: 'duplicate-navs-no-label',
          title: `${navsWithoutLabel} <nav> elements without aria-label`,
          description: `You have ${navElements} navigation regions but ${navsWithoutLabel} are not labeled. When multiple navs exist, users cannot distinguish between them without labels.`,
          severity: 'minor',
          category: 'accessibility',
          value: String(navsWithoutLabel),
          recommendation: {
            fix: 'Add unique `aria-label` attributes to distinguish between navigation regions: `<nav aria-label="Main navigation">` and `<nav aria-label="Footer navigation">`.',
            estimatedImpact: 'low',
          },
        })
      } else {
        passed++
      }
    } else {
      passed++
    }
  }

  if (!hasHeader) {
    failed++
    findings.push({
      id: 'no-header-landmark',
      title: 'Missing <header> landmark',
      description: 'A `<header>` landmark (with the implicit ARIA role of "banner") identifies the page header. Screen readers use this to help users understand the page structure.',
      severity: 'minor',
      category: 'accessibility',
      recommendation: {
        fix: 'Wrap your page header content (logo, site title, top navigation) in a `<header>` element at the top level (not nested inside `<main>` or `<article>`).',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  if (!hasFooter) {
    findings.push({
      id: 'no-footer-landmark',
      title: 'Missing <footer> landmark',
      description: 'A `<footer>` element provides a contentinfo landmark. It helps screen reader users locate supplementary information like copyright notices and contact links.',
      severity: 'info',
      category: 'accessibility',
      recommendation: {
        fix: 'Wrap your page footer content in a `<footer>` element at the page level.',
        estimatedImpact: 'low',
      },
    })
    // Not counting as failed — info only
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 9. Skip navigation link (WCAG 2.4.1 - Level A)
  // ─────────────────────────────────────────────
  const hasSkipLink = $('a[href="#main"], a[href="#content"], a[href="#main-content"], a.skip-link, a.skip-nav, a.skip-to-content').length > 0
  if (!hasSkipLink) {
    failed++
    findings.push({
      id: 'no-skip-link',
      title: 'Missing skip navigation link',
      description: 'Keyboard and screen reader users must Tab through all navigation links before reaching the main content on every page load. A "Skip to content" link lets them jump directly.',
      severity: 'minor',
      category: 'accessibility',
      recommendation: {
        fix: 'Add a visually-hidden "Skip to main content" link as the very first element in the `<body>`: `<a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>`. Reveal it on focus using CSS.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 10. tabindex > 0 anti-pattern (WCAG 2.4.3 - Level A)
  // ─────────────────────────────────────────────
  const badTabindex = $('[tabindex]').filter((_, el) => {
    const val = parseInt($(el).attr('tabindex') || '0', 10)
    return val > 0
  }).length

  if (badTabindex > 0) {
    failed++
    findings.push({
      id: 'positive-tabindex',
      title: `${badTabindex} element${badTabindex > 1 ? 's' : ''} with tabindex > 0`,
      description: 'Positive `tabindex` values (1, 2, 3...) create a custom tab order that is separate from the visual DOM order. This creates a confusing, unpredictable keyboard experience and is considered an anti-pattern.',
      severity: 'moderate',
      category: 'accessibility',
      value: String(badTabindex),
      recommendation: {
        fix: 'Remove all positive `tabindex` values. Use `tabindex="0"` to make non-interactive elements focusable in DOM order, and `tabindex="-1"` for elements that should only be focusable programmatically. Fix the DOM order instead to achieve the desired tab sequence.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 11. Inline outline:none / outline:0 detection (Focus Visibility)
  // ─────────────────────────────────────────────
  let outlineNoneCount = 0
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || ''
    if (/outline\s*:\s*(none|0)/i.test(style)) {
      outlineNoneCount++
    }
  })
  if (outlineNoneCount > 0) {
    failed++
    findings.push({
      id: 'outline-none-inline',
      title: `${outlineNoneCount} element${outlineNoneCount > 1 ? 's' : ''} with inline outline:none`,
      description: 'Removing the focus outline via inline styles hides the keyboard focus indicator. This makes it impossible for keyboard-only users to see which element is currently focused, a critical WCAG 2.4.7 (Level AA) failure.',
      severity: 'moderate',
      category: 'accessibility',
      value: String(outlineNoneCount),
      recommendation: {
        fix: 'Remove `outline: none` from inline styles. If you dislike the browser default outline, use CSS to replace it with a custom focus style: `:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }`. Never remove the outline without providing an alternative.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 12. table accessibility (WCAG 1.3.1)
  // ─────────────────────────────────────────────
  const tablesWithoutScope = $('table').filter((_, el) => {
    const hasHeaders = $(el).find('th[scope]').length > 0
    const hasCaption = $(el).find('caption').length > 0
    const isDataTable = $(el).find('th').length > 0
    return isDataTable && !hasHeaders && !hasCaption
  }).length

  if (tablesWithoutScope > 0) {
    failed++
    findings.push({
      id: 'table-missing-scope',
      title: `${tablesWithoutScope} data table${tablesWithoutScope > 1 ? 's' : ''} missing header scope`,
      description: 'Data tables need `<th scope="col">` or `<th scope="row">` attributes so screen readers can associate data cells with the correct headers, especially in complex tables.',
      severity: 'minor',
      category: 'accessibility',
      value: String(tablesWithoutScope),
      recommendation: {
        fix: 'Add `scope="col"` to column header cells and `scope="row"` to row header cells. Also add a `<caption>` to describe the table\'s purpose: `<caption>Monthly revenue by region</caption>`.',
        estimatedImpact: 'low',
      },
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
