import { FetchResult, CategoryResult, AuditFinding } from './types'
import { CheerioAPI } from './index'

const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot', 'Google-Extended', 'OAI-SearchBot']

/**
 * Checks a website's readiness for AI agents, crawlers, and LLMs.
 */
export async function checkAiReadiness(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0
  let totalScore = 100

  // Helper to add findings
  const addFinding = (finding: AuditFinding, scorePenalty: number) => {
    findings.push(finding)
    if (finding.severity !== 'info' && scorePenalty > 0) {
      failed++
      totalScore -= scorePenalty
    } else {
      passed++
    }
  }

  // 1. Check semantic HTML
  const hasMain = $('main').length > 0
  const hasArticle = $('article').length > 0
  const hasNav = $('nav').length > 0
  
  if (!hasMain && !hasArticle) {
    addFinding({
      id: 'ai-semantic-html',
      title: 'Missing core semantic landmarks',
      description: 'AI agents rely on `<main>` or `<article>` tags to quickly find the primary content of the page and ignore navigation/footers.',
      severity: 'moderate',
      category: 'ai-readiness',
      recommendation: {
        fix: 'Wrap your primary page content in a `<main>` tag.',
        estimatedImpact: 'high',
      }
    }, 15)
  } else {
    passed++
  }

  // 2. Check for Structured Data (JSON-LD)
  const jsonLdScripts = $('script[type="application/ld+json"]')
  if (jsonLdScripts.length === 0) {
    addFinding({
      id: 'ai-json-ld',
      title: 'No structured data (JSON-LD) found',
      description: 'LLMs and agents use schema.org structured data to definitively understand entities, products, articles, and relationships on your page.',
      severity: 'moderate',
      category: 'ai-readiness',
      recommendation: {
        fix: 'Add JSON-LD schema markup corresponding to your page type (e.g., Article, Product, Organization).',
        estimatedImpact: 'high',
      }
    }, 20)
  } else {
    passed++
  }

  // 3. Check for heavy JS reliance (client-side rendering)
  const bodyText = $('body').text().trim()
  const hasNoscript = $('noscript').length > 0
  // If the body text is very small and there's no noscript, it might be a CSR app.
  if (bodyText.length < 500 && !hasNoscript) {
    addFinding({
      id: 'ai-js-reliance',
      title: 'Content heavily relies on Client-Side Rendering (CSR)',
      description: 'Many AI agents (unlike Googlebot) do not execute JavaScript. If your content is only rendered via JS, agents may see a blank page.',
      severity: 'critical',
      category: 'ai-readiness',
      recommendation: {
        fix: 'Implement Server-Side Rendering (SSR) or Static Site Generation (SSG). Ensure core content is in the initial HTML payload.',
        estimatedImpact: 'high',
      }
    }, 30)
  } else {
    passed++
  }

  // Define root URL for robots.txt and llms.txt
  let rootUrl = ''
  try {
    const urlObj = new URL(fetched.url)
    rootUrl = `${urlObj.protocol}//${urlObj.host}`
  } catch {
    // Fallback if parsing fails
  }

  if (rootUrl) {
    // 4. Check llms.txt
    try {
      const llmsRes = await fetch(`${rootUrl}/llms.txt`, { method: 'HEAD', headers: { 'User-Agent': 'Oditr-AuditBot/1.0' } })
      if (llmsRes.ok) {
        passed++
        findings.push({
          id: 'ai-llms-txt-found',
          title: 'llms.txt is present',
          description: 'You have an llms.txt file, which provides optimized, markdown-based documentation for AI agents.',
          severity: 'info',
          category: 'ai-readiness',
          value: 'Found',
        })
      } else {
        addFinding({
          id: 'ai-llms-txt-missing',
          title: 'Missing llms.txt file',
          description: 'An `/llms.txt` file is an emerging standard to provide AI agents with a clean, markdown version of your site’s context and documentation.',
          severity: 'minor',
          category: 'ai-readiness',
          recommendation: {
            fix: 'Create an `/llms.txt` file at your domain root with markdown content summarizing your site or documentation.',
            estimatedImpact: 'medium',
          }
        }, 10)
      }
    } catch {
      // Ignore network errors for llms.txt
    }

    // 5. Check robots.txt for AI bots
    try {
      const robotsRes = await fetch(`${rootUrl}/robots.txt`, { headers: { 'User-Agent': 'Oditr-AuditBot/1.0' } })
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text()
        const blockedBots: string[] = []

        // Very basic parse: look for User-agent: BotName followed by Disallow: /
        const lines = robotsText.split('\n').map(l => l.trim().toLowerCase())
        
        for (const bot of AI_BOTS) {
          const botLower = bot.toLowerCase()
          let isTargetBot = false
          let isBlocked = false

          for (const line of lines) {
            if (line.startsWith('user-agent:')) {
              isTargetBot = line.includes(botLower)
            } else if (isTargetBot && line.startsWith('disallow:')) {
              const path = line.replace('disallow:', '').trim()
              if (path === '/' || path === '/*') {
                isBlocked = true
              }
            }
          }

          if (isBlocked) blockedBots.push(bot)
        }

        if (blockedBots.length > 0) {
          addFinding({
            id: 'ai-robots-blocked',
            title: 'AI Crawlers blocked in robots.txt',
            description: `You are explicitly blocking some AI agents from crawling your site. While this prevents your data from being used for training without permission, it also means your site won't be cited in AI answers (e.g. ChatGPT, Perplexity).`,
            severity: 'moderate',
            category: 'ai-readiness',
            value: `Blocked: ${blockedBots.join(', ')}`,
            recommendation: {
              fix: 'If you want your content to be discoverable in AI chat interfaces, remove the Disallow rules for these agents.',
              estimatedImpact: 'high',
            }
          }, 25)
        } else {
          passed++
        }
      }
    } catch {
      // Ignore network errors for robots.txt
    }
  }

  return {
    category: 'ai-readiness',
    label: 'AI-Agent Readiness',
    score: Math.max(0, totalScore),
    passed,
    failed,
    findings,
  }
}
