// ── Renderability / JavaScript Dependency Analysis Service ──
import { AuditFinding, FetchResult } from '../types'

export interface RenderabilityResult {
  score: number
  warnings: string[]
}

export function analyzeRenderability(
  fetched: FetchResult,
  $: any // CheerioAPI
): { result: RenderabilityResult; findings: AuditFinding[] } {
  const findings: AuditFinding[] = []
  const warnings: string[] = []
  let passed = 0
  let total = 0

  const html = fetched.html
  const htmlLength = html.length

  // ── Check for very thin/empty initial HTML ──
  total++
  // Strip script/style tags and see what visible text remains
  const strippedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (strippedHtml.length < 200) {
    const msg = 'This page has very little visible text in the initial HTML response. Content may rely heavily on client-side JavaScript rendering.'
    warnings.push(msg)
    findings.push({
      id: 'ai-render-thin-html',
      title: 'Very thin initial HTML content',
      description: 'This page may rely heavily on client-side rendering. Some crawlers and AI agents may have reduced visibility into content if rendering fails or is delayed.',
      severity: 'high',
      category: 'ai-readiness',
      value: `${strippedHtml.length} chars of visible text`,
      recommendation: {
        fix: 'Consider server-side rendering (SSR) or static site generation (SSG) to ensure important content is present in the initial HTML response.',
        estimatedImpact: 'high',
        fixDifficulty: 'hard',
      },
    })
  } else {
    passed++
  }

  // ── Check for large JS bundles (heuristic: count script tags) ──
  total++
  const scriptTags = $('script[src]').length
  const inlineScripts = $('script:not([src])').length
  const totalScripts = scriptTags + inlineScripts

  if (totalScripts > 20) {
    const msg = `${totalScripts} script elements detected. Heavy JavaScript may delay content availability for AI agents.`
    warnings.push(msg)
    findings.push({
      id: 'ai-render-heavy-js',
      title: `Heavy JavaScript usage (${totalScripts} scripts)`,
      description: 'Pages with many scripts may load content asynchronously, making it harder for AI crawlers that don\'t execute JavaScript to see your content.',
      severity: 'medium',
      category: 'ai-readiness',
      value: `${totalScripts} scripts`,
    })
  } else {
    passed++
  }

  // ── Check if title/meta description are in raw HTML (not injected by JS) ──
  total++
  const hasServerTitle = /<title[^>]*>.+<\/title>/i.test(html)
  const hasServerMeta = /<meta\s+name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)

  if (!hasServerTitle) {
    const msg = 'Page title may be injected by JavaScript rather than present in the server HTML.'
    warnings.push(msg)
    findings.push({
      id: 'ai-render-no-server-title',
      title: 'Title not in server-rendered HTML',
      description: 'The <title> tag appears to be empty or missing in the raw HTML. It may be set by client-side JavaScript, which some AI crawlers cannot execute.',
      severity: 'medium',
      category: 'ai-readiness',
      value: 'Client-side title',
    })
  } else {
    passed++
  }

  // ── Check for SPA framework indicators ──
  total++
  const spaIndicators = [
    /<div\s+id=["'](?:root|app|__next|__nuxt)["']\s*>\s*<\/div>/i,
    /<div\s+id=["'](?:root|app|__next|__nuxt)["']\s*\/>/i,
  ]
  const isSPA = spaIndicators.some(regex => regex.test(html))

  if (isSPA && strippedHtml.length < 500) {
    const msg = 'SPA framework detected with minimal server-rendered content.'
    warnings.push(msg)
    findings.push({
      id: 'ai-render-spa-detected',
      title: 'Single-Page Application with minimal server content',
      description: 'This appears to be a client-side rendered SPA (React/Vue/Angular). The initial HTML contains an empty mount point. AI agents that cannot execute JavaScript will see very little content.',
      severity: 'medium',
      category: 'ai-readiness',
      value: 'SPA detected',
      recommendation: {
        fix: 'Use SSR (e.g., Next.js, Nuxt) or pre-rendering to ensure important content is present in the initial HTML response.',
        estimatedImpact: 'high',
        fixDifficulty: 'hard',
      },
    })
  } else {
    passed++
  }

  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    result: { score, warnings },
    findings,
  }
}
