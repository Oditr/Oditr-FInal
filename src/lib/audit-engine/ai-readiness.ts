import { FetchResult, CategoryResult, AuditFinding, Recommendation } from './types'

export async function checkAiReadiness(
  fetched: FetchResult,
  $: ReturnType<typeof import('cheerio').load>
): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  const urlObj = new URL(fetched.url)
  const origin = urlObj.origin

  // Check llms.txt
  try {
    const llmsRes = await fetch(`${origin}/llms.txt`, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    if (llmsRes.ok) {
      passed++
      findings.push({
        id: 'ai-llms-txt-exists',
        title: 'llms.txt is present',
        description: 'You have an llms.txt file, which helps AI agents and LLMs understand your website structure and content.',
        severity: 'info',
        category: 'ai-readiness',
        value: 'Found'
      })
    } else {
      failed++
      findings.push({
        id: 'ai-llms-txt-missing',
        title: 'Missing llms.txt',
        description: 'Consider adding an llms.txt file to guide AI agents and LLMs on how to consume your documentation or core content.',
        severity: 'low',
        category: 'ai-readiness',
        value: 'Missing',
        recommendation: {
          fix: 'Create a simple /llms.txt file at the root of your domain.',
          codeSnippet: '# llms.txt\nUser-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml',
          estimatedImpact: 'low',
          fixDifficulty: 'easy'
        }
      })
    }
  } catch (err) {
    // Treat as missing if timeout/error
    failed++
    findings.push({
      id: 'ai-llms-txt-error',
      title: 'Could not check llms.txt',
      description: 'The request to check llms.txt timed out or failed.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Error'
    })
  }

  // Check robots.txt and AI crawlers
  try {
    const robotsRes = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
    if (robotsRes.ok) {
      const robotsText = await robotsRes.text()
      passed++
      
      const blocksGPT = /User-agent:\s*GPTBot\s*\nDisallow:\s*\//i.test(robotsText) || /User-agent:\s*ChatGPT-User\s*\nDisallow:\s*\//i.test(robotsText)
      const blocksClaude = /User-agent:\s*ClaudeBot\s*\nDisallow:\s*\//i.test(robotsText) || /User-agent:\s*Claude-Web\s*\nDisallow:\s*\//i.test(robotsText)
      const blocksGoogleExt = /User-agent:\s*Google-Extended\s*\nDisallow:\s*\//i.test(robotsText)
      const blocksPerplexity = /User-agent:\s*PerplexityBot\s*\nDisallow:\s*\//i.test(robotsText)

      const blockedBots = []
      if (blocksGPT) blockedBots.push('GPTBot')
      if (blocksClaude) blockedBots.push('ClaudeBot')
      if (blocksGoogleExt) blockedBots.push('Google-Extended')
      if (blocksPerplexity) blockedBots.push('PerplexityBot')

      if (blockedBots.length > 0) {
        // Just an info/low finding, depending on user preference
        findings.push({
          id: 'ai-robots-blocking',
          title: 'AI Crawlers Blocked',
          description: `Your robots.txt explicitly blocks these AI crawlers: ${blockedBots.join(', ')}. This prevents your content from being used to train or answer queries in these AI systems.`,
          severity: 'info',
          category: 'ai-readiness',
          value: blockedBots.join(', ')
        })
      } else {
        findings.push({
          id: 'ai-robots-allowed',
          title: 'AI Crawlers Allowed',
          description: 'No major AI crawlers (GPTBot, ClaudeBot, Google-Extended, PerplexityBot) are explicitly blocked in your robots.txt.',
          severity: 'info',
          category: 'ai-readiness',
          value: 'Allowed'
        })
      }
    } else {
      failed++
      findings.push({
        id: 'ai-robots-missing',
        title: 'Missing robots.txt',
        description: 'A robots.txt file is essential for instructing all web crawlers, including AI bots, on what they are allowed to scan.',
        severity: 'high',
        category: 'ai-readiness',
        value: 'Missing',
        recommendation: {
          fix: 'Create a /robots.txt file at the root of your domain.',
          codeSnippet: 'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml',
          estimatedImpact: 'high',
          fixDifficulty: 'easy'
        }
      })
    }
  } catch (err) {
    findings.push({
      id: 'ai-robots-error',
      title: 'Could not check robots.txt',
      description: 'The request to check robots.txt failed.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Error'
    })
  }

  // Basic structured data check (from cheerio)
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0
  if (hasJsonLd) {
    passed++
    findings.push({
      id: 'ai-structured-data',
      title: 'Structured Data Found',
      description: 'The page contains JSON-LD structured data, which helps AI agents deeply understand entities and context on your page.',
      severity: 'info',
      category: 'ai-readiness',
      value: 'Present'
    })
  } else {
    failed++
    findings.push({
      id: 'ai-structured-data-missing',
      title: 'No Structured Data',
      description: 'Adding JSON-LD schema (like Organization, WebSite, or Article) makes your content highly structured and easy for AI agents to ingest.',
      severity: 'medium',
      category: 'ai-readiness',
      value: 'Missing',
      recommendation: {
        fix: 'Add JSON-LD schema describing your page entity.',
        estimatedImpact: 'medium',
        fixDifficulty: 'medium'
      }
    })
  }

  // Important pages discoverability
  const checkLink = (hrefPart: string, name: string) => {
    const found = $(`a[href*="${hrefPart}"]`).length > 0
    if (found) {
      passed++
    } else {
      failed++
      findings.push({
        id: `ai-discoverability-${hrefPart.replace('/', '')}`,
        title: `Missing link to ${name}`,
        description: `No internal link to a ${name} page was found. AI agents use contextual links to navigate and understand your business model.`,
        severity: 'low',
        category: 'ai-readiness',
        value: 'Missing link'
      })
    }
  }

  checkLink('/pricing', 'Pricing')
  checkLink('/about', 'About')
  checkLink('/contact', 'Contact')

  const score = Math.round((passed / (passed + failed || 1)) * 100)

  return {
    category: 'ai-readiness',
    label: 'AI-Agent Readiness',
    score,
    passed,
    failed,
    findings
  }
}
