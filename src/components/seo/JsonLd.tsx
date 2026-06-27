// ── JSON-LD Structured Data Component ──
// Injects JSON-LD into <head> for rich search results.

interface JsonLdProps {
  data: Record<string, any>
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ── Preset schemas ──

export function OrganizationJsonLd() {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'VitalFix',
      url: 'https://vitalfix.dev',
      logo: 'https://vitalfix.dev/favicon.ico',
      description: 'Core Web Vitals audit and optimization platform for developers.',
      sameAs: [],
    }} />
  )
}

export function WebSiteJsonLd() {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'VitalFix',
      url: 'https://vitalfix.dev',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://vitalfix.dev/dashboard?url={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    }} />
  )
}

export function WebApplicationJsonLd() {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'VitalFix',
      url: 'https://vitalfix.dev',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      description: 'Free Core Web Vitals audit tool with Lighthouse integration, code snippets, and performance optimization guides.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '127',
      },
    }} />
  )
}

export function FAQJsonLd({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    }} />
  )
}

export function ArticleJsonLd({
  title, description, datePublished, dateModified, url,
}: {
  title: string; description: string; datePublished: string; dateModified: string; url: string;
}) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      datePublished,
      dateModified,
      url,
      author: {
        '@type': 'Organization',
        name: 'VitalFix',
        url: 'https://vitalfix.dev',
      },
      publisher: {
        '@type': 'Organization',
        name: 'VitalFix',
        url: 'https://vitalfix.dev',
      },
    }} />
  )
}
