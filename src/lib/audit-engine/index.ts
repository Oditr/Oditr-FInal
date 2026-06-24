// ── Audit Engine Orchestrator ──
// Runs all 8 audit modules in parallel with per-module timeouts
// HTML is parsed ONCE with cheerio and shared across all modules

import * as cheerio from 'cheerio'
import { FetchResult, CategoryResult, CustomAuditResult } from './types'
import { fetchPage } from './fetcher'
import { buildCustomAuditResult } from './scorer'

import { checkBrokenLinks } from './broken-links'
import { checkImages } from './images'
import { checkAssets } from './assets'
import { checkMetaTags } from './meta-tags'
import { checkHeadings } from './headings'
import { checkSecurity } from './security'
import { checkMobile } from './mobile'
import { checkAccessibility } from './accessibility'
import { checkAiReadiness } from './ai-readiness'

const MODULE_TIMEOUT = 15_000 // 15 seconds per module (broken-links needs HTTP HEAD requests)

export type CheerioAPI = ReturnType<typeof cheerio.load>
type AuditModule = (fetched: FetchResult, $: CheerioAPI) => Promise<CategoryResult>

const modules: AuditModule[] = [
  checkBrokenLinks,
  checkImages,
  checkAssets,
  checkMetaTags,
  checkHeadings,
  checkSecurity,
  checkMobile,
  checkAccessibility,
  checkAiReadiness,
]

/**
 * Run a single module with a timeout.
 */
async function runWithTimeout(
  fn: AuditModule,
  fetched: FetchResult,
  $: CheerioAPI,
  timeout: number
): Promise<CategoryResult | null> {
  return Promise.race([
    fn(fetched, $),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
  ])
}

/**
 * Run the full custom audit engine against a URL.
 * Fetches the page once, parses HTML once, then runs all 8 audit modules in parallel.
 */
export async function runCustomAudit(url: string): Promise<CustomAuditResult> {
  const start = Date.now()

  // Step 1: Fetch the page (shared across all modules)
  const fetched = await fetchPage(url, 25_000)

  // Step 2: Parse HTML once — shared across all 8 modules (saves ~300ms)
  const $ = cheerio.load(fetched.html)

  // Step 3: Run all modules in parallel with individual timeouts
  const results = await Promise.allSettled(
    modules.map(mod => runWithTimeout(mod, fetched, $, MODULE_TIMEOUT))
  )

  // Step 4: Collect results (skip failed/timed-out modules)
  const categories: CategoryResult[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value !== null) {
      categories.push(r.value)
    }
  }

  const duration = Date.now() - start

  // Step 5: Build the final result with scoring
  return buildCustomAuditResult(url, categories, duration)
}

// Re-export types for convenience
export type { CustomAuditResult, CategoryResult, AuditFinding, AuditIssue, UnifiedAuditResult } from './types'
export { calculateHealthScore, calculateUnifiedScores } from './scorer'
export { normalizeIssues } from './issue-normalizer'
