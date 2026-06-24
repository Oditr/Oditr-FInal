// ── Structured Data / Schema Analysis Service ──
import { AuditFinding } from '../types'

// Recommended schemas for SaaS/webapp sites
const RECOMMENDED_SCHEMAS = [
  'Organization',
  'WebSite',
  'WebPage',
  'SoftwareApplication',
  'FAQPage',
  'BreadcrumbList',
]

const ALL_KNOWN_SCHEMAS = [
  ...RECOMMENDED_SCHEMAS,
  'Product', 'Article', 'BlogPosting', 'LocalBusiness', 'Service',
  'HowTo', 'Person', 'Event', 'VideoObject', 'ImageObject',
  'Review', 'AggregateRating', 'SearchAction', 'ContactPoint',
]

export interface SchemaEntry {
  type: string
  valid: boolean
  fields?: string[]
}

export interface SchemaAnalysisResult {
  found: boolean
  schemas: SchemaEntry[]
  missingRecommended: string[]
}

export function analyzeStructuredData(
  $: any, // CheerioAPI
  url: string
): { result: SchemaAnalysisResult; findings: AuditFinding[] } {
  const findings: AuditFinding[] = []
  const schemas: SchemaEntry[] = []
  const detectedTypes = new Set<string>()

  // Find all JSON-LD script tags
  $('script[type="application/ld+json"]').each((_: number, el: any) => {
    const raw = $(el).html()
    if (!raw) return

    try {
      const data = JSON.parse(raw)
      const processEntity = (entity: any) => {
        const type = entity['@type']
        if (!type) return
        const types = Array.isArray(type) ? type : [type]
        for (const t of types) {
          detectedTypes.add(t)
          schemas.push({
            type: t,
            valid: true,
            fields: Object.keys(entity).filter(k => !k.startsWith('@')),
          })
        }
        // Check for nested entities (e.g., @graph)
        if (entity['@graph'] && Array.isArray(entity['@graph'])) {
          entity['@graph'].forEach(processEntity)
        }
      }

      if (Array.isArray(data)) {
        data.forEach(processEntity)
      } else {
        processEntity(data)
      }
    } catch (e) {
      schemas.push({ type: 'Unknown (invalid JSON)', valid: false })
      findings.push({
        id: 'ai-schema-invalid-json',
        title: 'Invalid JSON-LD structured data',
        description: 'One of your JSON-LD script tags contains invalid JSON. AI agents and search engines cannot parse malformed structured data.',
        severity: 'high',
        category: 'ai-readiness',
        value: 'Parse error',
        recommendation: {
          fix: 'Validate your JSON-LD using Google\'s Rich Results Test or Schema.org validator.',
          estimatedImpact: 'high',
          fixDifficulty: 'medium',
        },
      })
    }
  })

  // Also check for Microdata
  const microdataItems = $('[itemscope]').length
  if (microdataItems > 0 && schemas.length === 0) {
    findings.push({
      id: 'ai-schema-microdata-only',
      title: 'Using Microdata instead of JSON-LD',
      description: `Found ${microdataItems} Microdata item(s) but no JSON-LD. JSON-LD is generally recommended as it's easier to maintain and debug.`,
      severity: 'info',
      category: 'ai-readiness',
      value: `${microdataItems} items`,
    })
  }

  const found = schemas.length > 0 || microdataItems > 0

  // Report detected schemas
  if (schemas.filter(s => s.valid).length > 0) {
    const typeList = Array.from(detectedTypes).join(', ')
    findings.push({
      id: 'ai-schema-detected',
      title: `Structured data found: ${typeList}`,
      description: `Your page contains valid JSON-LD structured data with ${schemas.filter(s => s.valid).length} schema type(s). This helps AI agents deeply understand entities and context.`,
      severity: 'info',
      category: 'ai-readiness',
      value: typeList,
    })
  }

  // Check for missing recommended schemas
  const missingRecommended = RECOMMENDED_SCHEMAS.filter(s => !detectedTypes.has(s))

  if (!found) {
    findings.push({
      id: 'ai-schema-none',
      title: 'No structured data found',
      description: 'Your page has no JSON-LD or Microdata structured data. Adding schema markup helps AI agents and search engines understand your content type, organization, and page purpose.',
      severity: 'high',
      category: 'ai-readiness',
      value: 'None',
      recommendation: {
        fix: 'Add at minimum an Organization schema to your homepage.',
        codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand Name",
  "url": "${url}",
  "logo": "${url}/logo.png"
}
</script>`,
        estimatedImpact: 'high',
        fixDifficulty: 'medium',
      },
    })
  } else if (!detectedTypes.has('Organization') && !detectedTypes.has('LocalBusiness')) {
    findings.push({
      id: 'ai-schema-no-org',
      title: 'Missing Organization schema',
      description: 'No Organization or LocalBusiness schema found. This schema tells AI agents who owns this website.',
      severity: 'medium',
      category: 'ai-readiness',
      value: 'Missing',
      recommendation: {
        fix: 'Add an Organization schema to your homepage.',
        codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand Name",
  "url": "${url}",
  "logo": "${url}/logo.png"
}
</script>`,
        estimatedImpact: 'medium',
        fixDifficulty: 'medium',
      },
    })
  }

  if (!detectedTypes.has('FAQPage') && !detectedTypes.has('HowTo')) {
    findings.push({
      id: 'ai-schema-no-faq',
      title: 'Missing FAQ or HowTo schema',
      description: 'Adding FAQPage schema can help AI search engines surface your answers in AI-generated responses and featured snippets.',
      severity: 'low',
      category: 'ai-readiness',
      value: 'Missing',
      recommendation: {
        fix: 'Add FAQPage schema if your page has frequently asked questions.',
        codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does this product do?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Briefly explain the answer here."
      }
    }
  ]
}
</script>`,
        estimatedImpact: 'medium',
        fixDifficulty: 'medium',
      },
    })
  }

  return {
    result: { found, schemas, missingRecommended },
    findings,
  }
}
