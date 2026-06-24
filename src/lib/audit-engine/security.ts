// ── Security Checks ──
// Checks HTTPS, security headers, mixed content

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

const SECURITY_HEADERS: { header: string; label: string; severity: 'critical' | 'medium' | 'low' }[] = [
  { header: 'strict-transport-security',  label: 'Strict-Transport-Security (HSTS)', severity: 'critical' },
  { header: 'content-security-policy',    label: 'Content-Security-Policy (CSP)',     severity: 'medium' },
  { header: 'x-content-type-options',     label: 'X-Content-Type-Options',            severity: 'medium' },
  { header: 'x-frame-options',            label: 'X-Frame-Options',                   severity: 'medium' },
  { header: 'referrer-policy',            label: 'Referrer-Policy',                   severity: 'low' },
  { header: 'permissions-policy',         label: 'Permissions-Policy',                severity: 'low' },
]

export async function checkSecurity(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  // ── HTTPS check ──
  const isHttps = fetched.url.startsWith('https://')
  if (!isHttps) {
    failed++
    findings.push({
      id: 'no-https',
      title: 'Site not using HTTPS',
      description: 'The site loads over HTTP. HTTPS is essential for security and SEO.',
      severity: 'critical',
      category: 'security',
    })
  } else {
    passed++
  }

  // ── Security headers ──
  for (const { header, label, severity } of SECURITY_HEADERS) {
    const val = fetched.headers[header]
    if (!val) {
      failed++
      findings.push({
        id: `missing-header-${header}`,
        title: `Missing ${label}`,
        description: `The response is missing the "${header}" security header`,
        severity,
        category: 'security',
      })
    } else {
      passed++
      // Additional checks for common misconfigurations
      if (header === 'x-content-type-options' && val.toLowerCase() !== 'nosniff') {
        findings.push({
          id: 'xcto-not-nosniff',
          title: 'X-Content-Type-Options should be "nosniff"',
          description: `Current value: "${val}". Set to "nosniff" to prevent MIME sniffing.`,
          severity: 'low',
          category: 'security',
          value: val,
        })
      }
    }
  }

  // ── Mixed content check (HTTP resources on HTTPS page) ──
  if (isHttps) {
    const mixedContent: string[] = []

    $('script[src], link[href], img[src], iframe[src], video[src], audio[src], source[src]').each((_, el) => {
      const attr = $(el).attr('src') || $(el).attr('href') || ''
      if (attr.startsWith('http://')) {
        mixedContent.push(attr.slice(0, 80))
      }
    })

    if (mixedContent.length > 0) {
      failed++
      findings.push({
        id: 'mixed-content',
        title: `${mixedContent.length} mixed content resource${mixedContent.length > 1 ? 's' : ''}`,
        description: `HTTP resources loaded on HTTPS page. This can cause browser warnings and security issues.`,
        severity: 'critical',
        category: 'security',
        value: String(mixedContent.length),
        element: mixedContent.slice(0, 3).join(', '),
      })
    } else {
      passed++
    }
  }

  // ── Check for exposed server software ──
  const server = fetched.headers['server']
  const poweredBy = fetched.headers['x-powered-by']
  if (server && /\d/.test(server)) {
    failed++
    findings.push({
      id: 'server-version-exposed',
      title: 'Server version exposed',
      description: `Server header reveals version info: "${server}". Remove version numbers to reduce attack surface.`,
      severity: 'low',
      category: 'security',
      value: server,
    })
  } else {
    passed++
  }

  if (poweredBy) {
    failed++
    findings.push({
      id: 'x-powered-by-exposed',
      title: 'X-Powered-By header exposed',
      description: `Remove the X-Powered-By header ("${poweredBy}") to hide server technology`,
      severity: 'low',
      category: 'security',
      value: poweredBy,
    })
  } else {
    passed++
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'security',
    label: 'Security',
    score,
    passed,
    failed,
    findings,
  }
}
