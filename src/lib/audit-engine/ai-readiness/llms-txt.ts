// ── llms.txt Deep Analysis Service ──
import { AuditFinding } from '../types'

const FETCH_TIMEOUT = 5000

export interface LlmsTxtResult {
  exists: boolean
  statusCode: number
  contentLength: number
  qualityScore: number
  importantLinksFound: string[]
  suggestedTemplate?: string
}

export async function analyzeLlmsTxt(
  origin: string,
  domain: string
): Promise<{ result: LlmsTxtResult; findings: AuditFinding[] }> {
  const findings: AuditFinding[] = []
  let result: LlmsTxtResult = {
    exists: false,
    statusCode: 0,
    contentLength: 0,
    qualityScore: 0,
    importantLinksFound: [],
  }

  try {
    const res = await fetch(`${origin}/llms.txt`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { 'User-Agent': 'Oditr-AuditBot/1.0' },
    })

    result.statusCode = res.status

    if (res.ok) {
      const text = await res.text()
      result.exists = true
      result.contentLength = text.length

      // Quality scoring
      let quality = 0
      const lower = text.toLowerCase()

      // Check for useful content signals
      if (text.length > 50) quality += 15
      if (text.length > 200) quality += 10
      if (lower.includes('sitemap')) { quality += 15; result.importantLinksFound.push('Sitemap reference') }
      if (lower.includes('/pricing') || lower.includes('pricing')) { quality += 10; result.importantLinksFound.push('Pricing') }
      if (lower.includes('/features') || lower.includes('features')) { quality += 10; result.importantLinksFound.push('Features') }
      if (lower.includes('/about') || lower.includes('about')) { quality += 10; result.importantLinksFound.push('About') }
      if (lower.includes('/contact') || lower.includes('contact')) { quality += 10; result.importantLinksFound.push('Contact') }
      if (lower.includes('/docs') || lower.includes('documentation')) { quality += 10; result.importantLinksFound.push('Docs') }
      if (lower.includes('user-agent') || lower.includes('allow')) quality += 10

      result.qualityScore = Math.min(100, quality)

      findings.push({
        id: 'ai-llms-txt-found',
        title: 'llms.txt is present',
        description: `Your site has an llms.txt file (${text.length} bytes). This helps AI agents and LLMs understand your website structure.`,
        severity: 'info',
        category: 'ai-readiness',
        value: `${text.length} bytes, quality: ${result.qualityScore}/100`,
      })

      if (result.qualityScore < 50) {
        findings.push({
          id: 'ai-llms-txt-low-quality',
          title: 'llms.txt could be more descriptive',
          description: 'Your llms.txt exists but lacks useful content like site summary, important page links, or sitemap reference.',
          severity: 'low',
          category: 'ai-readiness',
          value: `Quality: ${result.qualityScore}/100`,
          recommendation: {
            fix: 'Expand your llms.txt with a site summary, links to important pages (pricing, features, about, contact, docs), and a sitemap reference.',
            estimatedImpact: 'low',
            fixDifficulty: 'easy',
          },
        })
      }
    } else {
      // Missing — generate a suggested template
      result.suggestedTemplate = generateLlmsTxtTemplate(origin, domain)

      findings.push({
        id: 'ai-llms-txt-missing',
        title: 'Missing llms.txt',
        description: 'Consider adding an llms.txt file to help AI agents and LLMs understand your website\'s purpose, structure, and important pages. This is an emerging standard.',
        severity: 'medium',
        category: 'ai-readiness',
        value: `Status: ${res.status}`,
        recommendation: {
          fix: 'Create a /llms.txt file at the root of your domain with a site summary, important page links, and sitemap reference.',
          codeSnippet: result.suggestedTemplate,
          estimatedImpact: 'medium',
          fixDifficulty: 'easy',
        },
      })
    }
  } catch (err) {
    result.suggestedTemplate = generateLlmsTxtTemplate(origin, domain)

    findings.push({
      id: 'ai-llms-txt-error',
      title: 'Could not check llms.txt',
      description: 'The request to check llms.txt timed out or failed. If the file does not exist, consider creating one.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Error/Timeout',
    })
  }

  return { result, findings }
}

function generateLlmsTxtTemplate(origin: string, domain: string): string {
  return `# llms.txt

# Site: ${domain}
# Purpose: Briefly describe what this website/product does.

User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml

## Important Pages
- Homepage: ${origin}/
- Pricing: ${origin}/pricing
- Features: ${origin}/features
- About: ${origin}/about
- Contact: ${origin}/contact
`
}
