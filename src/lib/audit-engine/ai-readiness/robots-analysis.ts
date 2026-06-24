// ── robots.txt AI Crawler Analysis Service ──
import { AuditFinding, CrawlerAccessEntry, ConfidenceLevel } from '../types'

const FETCH_TIMEOUT = 5000

// AI crawlers to check (ordered by importance)
const AI_CRAWLERS = [
  { name: 'GPTBot', label: 'OpenAI GPTBot' },
  { name: 'ChatGPT-User', label: 'ChatGPT User Agent' },
  { name: 'OAI-SearchBot', label: 'OpenAI Search Bot' },
  { name: 'Google-Extended', label: 'Google AI (Extended)' },
  { name: 'ClaudeBot', label: 'Anthropic ClaudeBot' },
  { name: 'Claude-Web', label: 'Anthropic Claude-Web' },
  { name: 'Anthropic-ai', label: 'Anthropic AI' },
  { name: 'PerplexityBot', label: 'Perplexity AI' },
  { name: 'CCBot', label: 'Common Crawl Bot' },
  { name: 'Applebot', label: 'Apple Bot' },
  { name: 'Bytespider', label: 'ByteDance Bytespider' },
]

export interface RobotsAnalysisResult {
  exists: boolean
  statusCode: number
  crawlerAccess: CrawlerAccessEntry[]
  hasSitemapRef: boolean
  hasWildcardBlock: boolean
  overlyRestrictive: boolean
  robotsText?: string
}

export async function analyzeRobotsTxt(
  origin: string
): Promise<{ result: RobotsAnalysisResult; findings: AuditFinding[] }> {
  const findings: AuditFinding[] = []
  let result: RobotsAnalysisResult = {
    exists: false,
    statusCode: 0,
    crawlerAccess: [],
    hasSitemapRef: false,
    hasWildcardBlock: false,
    overlyRestrictive: false,
  }

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { 'User-Agent': 'Oditr-AuditBot/1.0' },
    })

    result.statusCode = res.status

    if (!res.ok) {
      findings.push({
        id: 'ai-robots-missing',
        title: 'Missing robots.txt',
        description: 'A robots.txt file is essential for instructing web crawlers, including AI bots, on what they are allowed to scan. Without it, crawlers will access everything by default.',
        severity: 'high',
        category: 'ai-readiness',
        value: `Status: ${res.status}`,
        recommendation: {
          fix: 'Create a /robots.txt file at the root of your domain.',
          codeSnippet: `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`,
          estimatedImpact: 'high',
          fixDifficulty: 'easy',
        },
      })
      return { result, findings }
    }

    const robotsText = await res.text()
    result.exists = true
    result.robotsText = robotsText

    // Check sitemap reference
    result.hasSitemapRef = /^sitemap:/im.test(robotsText)
    if (!result.hasSitemapRef) {
      findings.push({
        id: 'ai-robots-no-sitemap-ref',
        title: 'No sitemap reference in robots.txt',
        description: 'Your robots.txt does not declare a Sitemap directive. Adding one helps all crawlers discover your full site structure.',
        severity: 'medium',
        category: 'ai-readiness',
        value: 'Missing',
        recommendation: {
          fix: 'Add a Sitemap line to the end of your robots.txt.',
          codeSnippet: `Sitemap: ${origin}/sitemap.xml`,
          estimatedImpact: 'medium',
          fixDifficulty: 'easy',
        },
      })
    }

    // Check for wildcard block-all
    const wildcardBlockAll = /User-agent:\s*\*\s*\n\s*Disallow:\s*\/\s*$/im.test(robotsText)
    if (wildcardBlockAll) {
      result.hasWildcardBlock = true
      result.overlyRestrictive = true
      findings.push({
        id: 'ai-robots-wildcard-block',
        title: 'robots.txt blocks all crawlers from entire site',
        description: 'Your robots.txt has a wildcard rule that blocks all crawlers from your entire site. This prevents search engines, AI crawlers, and other bots from indexing your content.',
        severity: 'critical',
        category: 'ai-readiness',
        value: 'Disallow: /',
        recommendation: {
          fix: 'Review your robots.txt. If you want your site to be discoverable, change "Disallow: /" to "Allow: /" for the wildcard user-agent.',
          estimatedImpact: 'high',
          fixDifficulty: 'easy',
        },
      })
    }

    // Analyze each AI crawler
    const blockedCrawlers: string[] = []
    for (const crawler of AI_CRAWLERS) {
      const entry = analyzeCrawlerAccess(robotsText, crawler.name, crawler.label)
      result.crawlerAccess.push(entry)
      if (entry.status === 'blocked') blockedCrawlers.push(crawler.label)
    }

    if (blockedCrawlers.length > 0 && blockedCrawlers.length <= 3) {
      findings.push({
        id: 'ai-robots-some-blocked',
        title: `${blockedCrawlers.length} AI crawler(s) explicitly blocked`,
        description: `Your robots.txt blocks: ${blockedCrawlers.join(', ')}. This is a valid business choice, but it may limit your content's visibility in those AI systems. Consider whether this aligns with your discoverability goals.`,
        severity: 'info',
        category: 'ai-readiness',
        value: blockedCrawlers.join(', '),
      })
    } else if (blockedCrawlers.length > 3) {
      findings.push({
        id: 'ai-robots-many-blocked',
        title: `${blockedCrawlers.length} AI crawlers blocked`,
        description: `Your robots.txt blocks multiple AI crawlers: ${blockedCrawlers.join(', ')}. If you want AI search engines to cite or surface your content, you may want to selectively allow some crawlers.`,
        severity: 'medium',
        category: 'ai-readiness',
        value: `${blockedCrawlers.length} blocked`,
      })
    } else if (blockedCrawlers.length === 0 && result.crawlerAccess.some(c => c.status === 'allowed')) {
      findings.push({
        id: 'ai-robots-all-allowed',
        title: 'AI crawlers are allowed',
        description: 'No major AI crawlers are explicitly blocked in your robots.txt. Your content is accessible to AI search engines and agent tools.',
        severity: 'info',
        category: 'ai-readiness',
        value: 'All allowed',
      })
    }
  } catch (err) {
    findings.push({
      id: 'ai-robots-error',
      title: 'Could not check robots.txt',
      description: 'The request to check robots.txt timed out or failed.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Error/Timeout',
    })
  }

  return { result, findings }
}

function analyzeCrawlerAccess(
  robotsText: string,
  crawlerName: string,
  label: string
): CrawlerAccessEntry {
  // Check for a specific user-agent block for this crawler
  const regex = new RegExp(
    `User-agent:\\s*${escapeRegex(crawlerName)}\\s*\\n([^]*?)(?=User-agent:|$)`,
    'im'
  )
  const match = robotsText.match(regex)

  if (!match) {
    return { name: label, status: 'not_specified', confidence: 'Medium' }
  }

  const block = match[1]
  const hasDisallow = /Disallow:\s*\//.test(block)
  const hasAllow = /Allow:\s*\//.test(block)

  if (hasDisallow && !hasAllow) {
    const pathMatch = block.match(/Disallow:\s*(.+)/g)
    const paths = pathMatch?.map(l => l.replace(/Disallow:\s*/, '').trim()) || ['/']
    return {
      name: label,
      status: 'blocked',
      rule: `Disallow for ${crawlerName}`,
      affectedPaths: paths,
      confidence: 'High',
    }
  }

  if (hasAllow) {
    return { name: label, status: 'allowed', rule: `Allow for ${crawlerName}`, confidence: 'High' }
  }

  return { name: label, status: 'not_specified', confidence: 'Low' }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
