// ── Content Clarity Signals Service ──
import { AuditFinding } from '../types'

export function analyzeContentClarity(
  $: any, // CheerioAPI
  url: string
): { findings: AuditFinding[] } {
  const findings: AuditFinding[] = []

  // ── Check for clear product/service description ──
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || ''
  const h1Text = $('h1').first().text().trim()
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()

  if (!metaDesc && !h1Text) {
    findings.push({
      id: 'ai-content-no-purpose',
      title: 'Unclear homepage purpose',
      description: 'AI agents need a clear signal about what this page/site does. No meta description or H1 heading was found to establish purpose.',
      severity: 'high',
      category: 'ai-readiness',
      value: 'No meta description or H1',
      recommendation: {
        fix: 'Add a clear meta description and H1 that explains what your product or service does.',
        estimatedImpact: 'high',
        fixDifficulty: 'easy',
      },
    })
  }

  // ── Check for pricing page availability ──
  const hasPricingLink = $('a[href*="/pricing"], a[href*="/plans"]').length > 0
  if (!hasPricingLink) {
    findings.push({
      id: 'ai-content-no-pricing',
      title: 'No pricing page linked',
      description: 'AI agents often look for pricing information to understand a product\'s business model. Link a pricing page from your homepage navigation.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Not found',
    })
  }

  // ── Check for FAQ presence ──
  const hasFaqSection = $('section:contains("FAQ"), div:contains("Frequently Asked"), [class*="faq"], [id*="faq"]').length > 0
    || $('h2:contains("FAQ"), h2:contains("Frequently Asked"), h3:contains("FAQ")').length > 0
  if (!hasFaqSection) {
    findings.push({
      id: 'ai-content-no-faq',
      title: 'No FAQ section detected',
      description: 'FAQ sections are valuable for AI search engines because they directly answer user questions. AI-generated answers often cite FAQ content.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Not detected',
      recommendation: {
        fix: 'Consider adding an FAQ section to your homepage or a dedicated FAQ page. Pair it with FAQPage schema for maximum AI search visibility.',
        estimatedImpact: 'medium',
        fixDifficulty: 'easy',
      },
    })
  }

  // ── Check for CTA presence ──
  const hasSignupCta = $('a[href*="/signup"], a[href*="/register"], a[href*="/demo"], a[href*="/get-started"], button:contains("Sign Up"), button:contains("Get Started"), button:contains("Start Free")').length > 0
  if (!hasSignupCta) {
    findings.push({
      id: 'ai-content-no-cta',
      title: 'No clear call-to-action detected',
      description: 'AI agents may struggle to determine the primary conversion path on your site if no clear sign-up, demo, or get-started action is visible.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Not detected',
    })
  }

  return { findings }
}
