// ── Semantic HTML Analysis Service ──
import { AuditFinding } from '../types'

export interface SemanticHtmlResult {
  score: number
  hasMain: boolean
  hasNav: boolean
  hasFooter: boolean
  hasProperH1: boolean
  hasLangAttr: boolean
}

export function analyzeSemanticHtml(
  $: any, // CheerioAPI
): { result: SemanticHtmlResult; findings: AuditFinding[] } {
  const findings: AuditFinding[] = []
  let passed = 0
  let total = 0

  // ── <main> landmark ──
  total++
  const hasMain = $('main, [role="main"]').length > 0
  if (hasMain) { passed++ } else {
    findings.push({
      id: 'ai-semantic-no-main',
      title: 'Missing <main> landmark',
      description: 'Use a <main> element to identify the primary content area. This helps AI agents and screen readers understand page structure.',
      severity: 'medium',
      category: 'ai-readiness',
      recommendation: {
        fix: 'Wrap your primary content in a <main> element.',
        codeSnippet: '<main>\n  <!-- Your primary page content -->\n</main>',
        estimatedImpact: 'medium',
        fixDifficulty: 'easy',
      },
    })
  }

  // ── <nav> landmark ──
  total++
  const hasNav = $('nav, [role="navigation"]').length > 0
  if (hasNav) { passed++ } else {
    findings.push({
      id: 'ai-semantic-no-nav',
      title: 'Missing <nav> landmark',
      description: 'Use <nav> elements for navigation regions. AI agents use landmarks to understand page layout and navigate efficiently.',
      severity: 'low',
      category: 'ai-readiness',
    })
  }

  // ── <footer> landmark ──
  total++
  const hasFooter = $('footer, [role="contentinfo"]').length > 0
  if (hasFooter) { passed++ } else {
    findings.push({
      id: 'ai-semantic-no-footer',
      title: 'Missing <footer> landmark',
      description: 'A <footer> element helps AI agents identify supplementary information like contact details, legal links, and navigation.',
      severity: 'low',
      category: 'ai-readiness',
    })
  }

  // ── H1 check ──
  total++
  const h1Count = $('h1').length
  const hasProperH1 = h1Count === 1
  if (hasProperH1) {
    passed++
  } else if (h1Count === 0) {
    findings.push({
      id: 'ai-semantic-no-h1',
      title: 'Missing H1 heading',
      description: 'Every page should have exactly one H1 heading. AI agents use headings to understand the page\'s main topic.',
      severity: 'high',
      category: 'ai-readiness',
    })
  } else {
    findings.push({
      id: 'ai-semantic-multiple-h1',
      title: `Multiple H1 headings (${h1Count})`,
      description: 'Having multiple H1 elements can confuse AI agents about the page\'s main topic. Use one H1 and organize with H2-H6.',
      severity: 'medium',
      category: 'ai-readiness',
      value: String(h1Count),
    })
  }

  // ── html lang attribute ──
  total++
  const hasLangAttr = !!$('html').attr('lang')
  if (hasLangAttr) { passed++ } else {
    findings.push({
      id: 'ai-semantic-no-lang',
      title: 'Missing lang attribute on <html>',
      description: 'The lang attribute helps AI agents and screen readers determine the content language. This is important for multilingual understanding.',
      severity: 'medium',
      category: 'ai-readiness',
      recommendation: {
        fix: 'Add a lang attribute to your <html> element.',
        codeSnippet: '<html lang="en">',
        estimatedImpact: 'medium',
        fixDifficulty: 'easy',
      },
    })
  }

  // ── Page title ──
  total++
  const title = $('title').text().trim()
  if (title && title.length > 10) {
    passed++
  } else {
    findings.push({
      id: 'ai-semantic-weak-title',
      title: title ? 'Page title is too short' : 'Missing page title',
      description: 'A clear, descriptive page title helps AI agents understand what the page is about before parsing the full content.',
      severity: title ? 'low' : 'high',
      category: 'ai-readiness',
      value: title || 'Missing',
    })
  }

  // ── Descriptive links vs clickable divs ──
  total++
  const clickableDivs = $('div[onclick], span[onclick]').length
  if (clickableDivs > 2) {
    findings.push({
      id: 'ai-semantic-clickable-divs',
      title: `${clickableDivs} clickable divs/spans instead of buttons or links`,
      description: 'Using onclick on div/span elements instead of <button> or <a> makes it harder for AI agents and assistive tech to understand interactive elements.',
      severity: 'medium',
      category: 'ai-readiness',
      value: String(clickableDivs),
    })
  } else {
    passed++
  }

  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    result: { score, hasMain, hasNav, hasFooter, hasProperH1, hasLangAttr },
    findings,
  }
}
