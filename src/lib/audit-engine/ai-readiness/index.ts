// ── AI-Agent Readiness Engine Orchestrator ──
// Replaces the old lightweight ai-readiness.ts with a comprehensive engine
// composed of 7 sub-services running in parallel.

import { FetchResult, CategoryResult, AuditFinding, AIReadinessResult } from '../types'
import { analyzeLlmsTxt } from './llms-txt'
import { analyzeRobotsTxt } from './robots-analysis'
import { analyzeSitemapDiscoverability } from './sitemap-discovery'
import { analyzeStructuredData } from './schema-analysis'
import { analyzeSemanticHtml } from './semantic-html'
import { analyzeRenderability } from './renderability'
import { analyzeContentClarity } from './content-clarity'
import { calculateAIReadinessScore, deriveSubScore } from './scoring'

/**
 * Run the full AI-Agent Readiness Engine.
 * Returns a CategoryResult (compatible with the orchestrator) and an AIReadinessResult (detailed).
 */
export async function checkAiReadiness(
  fetched: FetchResult,
  $: ReturnType<typeof import('cheerio').load>
): Promise<CategoryResult & { aiReadinessDetail?: AIReadinessResult }> {
  const allFindings: AuditFinding[] = []
  const urlObj = new URL(fetched.url)
  const origin = urlObj.origin
  const domain = urlObj.hostname

  // ── Run network-dependent services in parallel ──
  const [llmsResult, robotsResult] = await Promise.all([
    analyzeLlmsTxt(origin, domain).catch(() => ({
      result: { exists: false, statusCode: 0, contentLength: 0, qualityScore: 0, importantLinksFound: [] as string[] },
      findings: [] as AuditFinding[],
    })),
    analyzeRobotsTxt(origin).catch(() => ({
      result: { exists: false, statusCode: 0, crawlerAccess: [], hasSitemapRef: false, hasWildcardBlock: false, overlyRestrictive: false },
      findings: [] as AuditFinding[],
    })),
  ])

  // Sitemap needs robots result to know if sitemap is referenced
  const sitemapResult = await analyzeSitemapDiscoverability(
    origin,
    robotsResult.result.hasSitemapRef,
    $
  ).catch(() => ({
    result: { sitemapExists: false, sitemapStatusCode: 0, sitemapInRobots: false, sitemapUrlCount: 0, importantPagesFound: [] as string[], importantPagesMissing: [] as string[] },
    findings: [] as AuditFinding[],
  }))

  // ── Run DOM-only services synchronously (fast) ──
  const schemaResult = analyzeStructuredData($, fetched.url)
  const semanticResult = analyzeSemanticHtml($)
  const renderResult = analyzeRenderability(fetched, $)
  const clarityResult = analyzeContentClarity($, fetched.url)

  // ── Collect all findings ──
  allFindings.push(
    ...llmsResult.findings,
    ...robotsResult.findings,
    ...sitemapResult.findings,
    ...schemaResult.findings,
    ...semanticResult.findings,
    ...renderResult.findings,
    ...clarityResult.findings,
  )

  // ── Calculate sub-scores ──
  const robotsScore = deriveSubScore(allFindings, 'ai-robots')
  const llmsTxtScore = llmsResult.result.exists
    ? Math.max(50, llmsResult.result.qualityScore)
    : deriveSubScore(allFindings, 'ai-llms')
  const schemaScore = deriveSubScore(allFindings, 'ai-schema')
  const semanticScore = semanticResult.result.score
  const discoveryScore = deriveSubScore(allFindings, 'ai-sitemap') // + important pages
  const renderScore = renderResult.result.score
  const clarityScore = deriveSubScore(allFindings, 'ai-content')

  // ── Calculate overall AI readiness score ──
  const { score, status, confidence, summary } = calculateAIReadinessScore({
    robotsScore,
    llmsTxtScore,
    schemaScore,
    semanticScore,
    discoveryScore,
    renderScore,
    clarityScore,
  })

  // ── Build detailed result ──
  const aiReadinessDetail: AIReadinessResult = {
    score,
    status,
    confidence,
    summary,
    crawlerAccess: robotsResult.result.crawlerAccess,
    llmsTxt: llmsResult.result,
    structuredData: schemaResult.result,
    semanticHtml: semanticResult.result,
    discoverability: sitemapResult.result,
    renderability: renderResult.result,
    experimentalNotes: [
      'AI-Agent Readiness checks are experimental. These signals estimate how machine-readable and AI-agent-friendly your website appears.',
      'These checks do not guarantee ranking in ChatGPT, Gemini, Perplexity, Google AI Overviews, or any AI system.',
      'The llms.txt standard is still emerging and may evolve.',
    ],
  }

  // Count pass/fail
  const failed = allFindings.filter(f => f.severity !== 'info').length
  const passed = allFindings.filter(f => f.severity === 'info').length

  return {
    category: 'ai-readiness',
    label: 'AI-Agent Readiness',
    score,
    passed,
    failed,
    findings: allFindings,
    aiReadinessDetail,
  }
}
