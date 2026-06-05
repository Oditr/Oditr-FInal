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
  const { auditResult } = await runCustomAuditWithMeta(url)
  return auditResult
}

/** Result from runCustomAuditWithMeta — includes raw HTML/headers for intelligence engine */
export interface CustomAuditWithMeta {
  auditResult: CustomAuditResult
  /** Raw HTML for framework/context detection in the intelligence engine */
  html: string
  /** HTTP response headers for framework detection */
  headers: Record<string, string>
}

/**
 * Run the full custom audit engine and return both the result
 * AND the raw HTML/headers needed by the intelligence engine.
 *
 * This avoids a second HTTP fetch — the intelligence engine reuses
 * the same HTML that the audit modules already parsed.
 */
export async function runCustomAuditWithMeta(url: string): Promise<CustomAuditWithMeta> {
  const start = Date.now()

  // Step 1: Fetch the page (shared across all modules)
  const fetched = await fetchPage(url, 25_000)

  // Step 2: Parse HTML once — shared across all 8 modules (saves ~300ms)
  const $ = cheerio.load(fetched.html)

  // Step 3: Run all modules in parallel with individual timeouts
  const moduleNames = [
    'broken-links', 'images', 'assets', 'meta-tags',
    'headings', 'security', 'mobile', 'accessibility',
  ]
  const results = await Promise.allSettled(
    modules.map(mod => runWithTimeout(mod, fetched, $, MODULE_TIMEOUT))
  )

  // Step 4: Collect results (log failed/timed-out modules)
  const categories: CategoryResult[] = []
  let passed = 0, failed = 0, timedOut = 0
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const name = moduleNames[i] || `module-${i}`
    if (r.status === 'fulfilled' && r.value !== null) {
      categories.push(r.value)
      passed++
    } else if (r.status === 'fulfilled' && r.value === null) {
      timedOut++
      console.warn(`[audit-engine] Module "${name}" timed out after ${MODULE_TIMEOUT}ms`)
    } else if (r.status === 'rejected') {
      failed++
      console.error(`[audit-engine] Module "${name}" failed:`, r.reason)
    }
  }

  const duration = Date.now() - start
  console.info(`[audit-engine] Completed in ${duration}ms — ${passed} passed, ${timedOut} timed out, ${failed} failed`)

  // Step 5: Build the final result with scoring
  const auditResult = buildCustomAuditResult(url, categories, duration)

  return {
    auditResult,
    html: fetched.html,
    headers: fetched.headers,
  }
}

// Re-export types for convenience
export type { CustomAuditResult, CategoryResult, AuditFinding } from './types'
export { calculateHealthScore } from './scorer'
