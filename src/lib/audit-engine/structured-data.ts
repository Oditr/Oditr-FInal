// ── Structured Data (JSON-LD) Validation ──
// Finds all <script type="application/ld+json"> tags,
// validates them as valid JSON and checks for required schema.org fields.

import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

// Common schema types that are directly valuable for rich results in Google Search
const RICH_RESULT_TYPES = new Set([
  'Article', 'NewsArticle', 'BlogPosting',
  'Product', 'Offer', 'AggregateRating',
  'FAQPage', 'Question', 'Answer',
  'HowTo', 'HowToStep',
  'Recipe',
  'Event',
  'JobPosting',
  'LocalBusiness', 'Organization', 'Corporation',
  'Person',
  'BreadcrumbList', 'ListItem',
  'SiteNavigationElement',
  'WebSite', 'WebPage',
  'VideoObject', 'ImageObject',
  'Review',
  'Course',
  'SoftwareApplication',
])

export async function checkStructuredData(_fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  const jsonLdScripts = $('script[type="application/ld+json"]')

  if (jsonLdScripts.length === 0) {
    failed++
    findings.push({
      id: 'no-structured-data',
      title: 'No structured data (JSON-LD) found',
      description: 'Structured data helps Google display rich results (e.g., star ratings, FAQs, breadcrumbs) in search. It also provides explicit machine-readable context about your page to AI agents.',
      severity: 'moderate',
      category: 'structured-data',
      recommendation: {
        fix: 'Add `<script type="application/ld+json">` with schema.org markup relevant to your page type (e.g., `WebSite`, `Organization`, `Article`, `Product`). Use Google\'s Rich Results Test to validate.',
        estimatedImpact: 'high',
      },
    })
    return {
      category: 'structured-data',
      label: 'Structured Data',
      score: 0,
      passed: 0,
      failed: 1,
      findings,
    }
  }

  const detectedTypes: string[] = []
  const invalidScripts: string[] = []
  let validCount = 0
  let richResultTypeCount = 0

  jsonLdScripts.each((i, el) => {
    const raw = $(el).html()?.trim() ?? ''
    let parsed: unknown

    // 1. Validate JSON syntax
    try {
      parsed = JSON.parse(raw)
    } catch {
      invalidScripts.push(`Script #${i + 1}`)
      failed++
      findings.push({
        id: `invalid-json-ld-${i}`,
        title: `JSON-LD script #${i + 1} has invalid JSON syntax`,
        description: 'This structured data block cannot be parsed as valid JSON. Search engines will ignore it entirely.',
        severity: 'critical',
        category: 'structured-data',
        recommendation: {
          fix: 'Validate and fix the JSON syntax using a tool like JSONLint or Google\'s Rich Results Test.',
          estimatedImpact: 'high',
        },
      })
      return
    }

    // 2. Check for @context
    const obj = parsed as Record<string, unknown>
    if (!obj['@context']) {
      failed++
      findings.push({
        id: `missing-context-${i}`,
        title: `JSON-LD script #${i + 1} is missing @context`,
        description: 'All JSON-LD structured data must include `"@context": "https://schema.org"` to be valid.',
        severity: 'critical',
        category: 'structured-data',
        recommendation: {
          fix: 'Add `"@context": "https://schema.org"` to your JSON-LD object.',
          estimatedImpact: 'high',
        },
      })
      return
    }

    // 3. Check for @type
    if (!obj['@type']) {
      failed++
      findings.push({
        id: `missing-type-${i}`,
        title: `JSON-LD script #${i + 1} is missing @type`,
        description: 'All JSON-LD structured data must include a `"@type"` field (e.g., `"Article"`, `"Product"`) so search engines know what the schema describes.',
        severity: 'critical',
        category: 'structured-data',
        recommendation: {
          fix: 'Add `"@type": "YourType"` to your JSON-LD object. Choose from https://schema.org to find the right type.',
          estimatedImpact: 'high',
        },
      })
      return
    }

    validCount++
    passed++

    const schemaType = Array.isArray(obj['@type']) ? obj['@type'].join(', ') : String(obj['@type'])
    detectedTypes.push(schemaType)

    const typeList = Array.isArray(obj['@type']) ? obj['@type'] : [String(obj['@type'])]
    if (typeList.some(t => RICH_RESULT_TYPES.has(t))) {
      richResultTypeCount++
    }
  })

  // Summary finding for valid schemas
  if (validCount > 0) {
    findings.unshift({
      id: 'structured-data-found',
      title: `${validCount} valid JSON-LD schema${validCount > 1 ? 's' : ''} detected`,
      description: `Detected schema types: ${detectedTypes.join(', ')}. ${richResultTypeCount > 0 ? `${richResultTypeCount} of these are eligible for Google Rich Results.` : 'None of the detected types are eligible for Google Rich Results directly.'}`,
      severity: 'info',
      category: 'structured-data',
      value: detectedTypes.join(', '),
    })
  }

  // Check for missing high-value schema types based on page context
  if (!detectedTypes.some(t => ['Organization', 'Corporation', 'LocalBusiness'].includes(t))) {
    failed++
    findings.push({
      id: 'missing-organization-schema',
      title: 'No Organization schema detected',
      description: 'An `Organization` schema helps Google understand your brand identity, including your name, logo, and social profiles. It powers the Knowledge Panel in search results.',
      severity: 'minor',
      category: 'structured-data',
      recommendation: {
        fix: 'Add an `Organization` or `WebSite` JSON-LD block to your site\'s global layout with your brand name, URL, and logo.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'structured-data',
    label: 'Structured Data',
    score,
    passed,
    failed,
    findings,
  }
}
