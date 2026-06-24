// ── Security & Protocol Auditing ──
// Deep checks for HTTPS, HSTS, CSP, CORS, mixed content, and information disclosure.
//
// ⚠️  IMPORTANT DISCLAIMER:
// Some headers (e.g., HSTS, CSP) may be injected by a CDN (Cloudflare, Vercel, Fastly)
// and may not be visible from a serverless fetch context. Results reflect the HTTP response
// headers received, which may differ from what a browser observes after CDN processing.

import { AuditFinding, CategoryResult, FetchResult } from './types'
import type { CheerioAPI } from './index'

export async function checkSecurity(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  const headers = fetched.headers ?? {}
  const isHttps = fetched.url.startsWith('https://')

  // ─────────────────────────────────────────────
  // 1. HTTPS
  // ─────────────────────────────────────────────
  if (!isHttps) {
    failed++
    findings.push({
      id: 'no-https',
      title: 'Site not using HTTPS',
      description: 'The site is served over HTTP. HTTPS is required for security, SEO rankings, and browser trust indicators (the padlock icon).',
      severity: 'critical',
      category: 'security',
      recommendation: {
        fix: 'Install an SSL/TLS certificate and configure your server to redirect all HTTP traffic to HTTPS. Most hosts (Vercel, Netlify, Cloudflare, cPanel) offer free Let\'s Encrypt certificates with one-click setup.',
        estimatedImpact: 'high',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 2. HSTS — Deep Validation
  // ─────────────────────────────────────────────
  const hsts = headers['strict-transport-security']
  if (!hsts) {
    failed++
    findings.push({
      id: 'missing-hsts',
      title: 'Missing Strict-Transport-Security (HSTS) header',
      description: 'HSTS instructs browsers to always connect over HTTPS, preventing SSL-stripping attacks. Without it, users are vulnerable even if the server supports HTTPS.',
      severity: 'critical',
      category: 'security',
      recommendation: {
        fix: 'Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` to your server response headers. On Next.js, configure this in `next.config.js` under `headers()`. Start without `preload` and add it after testing.',
        estimatedImpact: 'high',
      },
    })
  } else {
    // Parse HSTS directives
    const maxAgeMatch = /max-age=(\d+)/i.exec(hsts)
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0
    const hasIncludeSubDomains = /includeSubDomains/i.test(hsts)
    const hasPreload = /preload/i.test(hsts)

    if (maxAge < 31536000) {
      failed++
      findings.push({
        id: 'hsts-max-age-too-short',
        title: `HSTS max-age too short (${maxAge.toLocaleString()}s)`,
        description: `Your HSTS \`max-age\` is ${maxAge.toLocaleString()} seconds (~${Math.floor(maxAge / 86400)} days). Google's HSTS preload list requires a minimum of 31,536,000 seconds (1 year). Short max-age means the browser only remembers the HTTPS preference briefly.`,
        severity: 'moderate',
        category: 'security',
        value: `${maxAge}s (need ≥31536000s)`,
        recommendation: {
          fix: 'Update your `Strict-Transport-Security` header to use `max-age=31536000` (1 year) or higher.',
          estimatedImpact: 'medium',
        },
      })
    } else {
      passed++
    }

    if (!hasIncludeSubDomains) {
      failed++
      findings.push({
        id: 'hsts-missing-include-subdomains',
        title: 'HSTS missing `includeSubDomains` directive',
        description: 'Without `includeSubDomains`, subdomains (e.g., `api.yourdomain.com`, `mail.yourdomain.com`) are not protected by HSTS and could be exploited to intercept cookies or session tokens.',
        severity: 'minor',
        category: 'security',
        value: hsts,
        recommendation: {
          fix: 'Add `includeSubDomains` to your `Strict-Transport-Security` header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`.',
          estimatedImpact: 'low',
        },
      })
    } else {
      passed++
    }

    if (!hasPreload) {
      // Preload is optional but strongly recommended for high-security sites
      findings.push({
        id: 'hsts-missing-preload',
        title: 'HSTS `preload` directive not set',
        description: 'The `preload` directive would allow your domain to be included in browsers\' hardcoded HSTS preload lists, providing protection for first-time visitors before they have ever connected to your site.',
        severity: 'info',
        category: 'security',
        value: hsts,
        recommendation: {
          fix: 'Add `preload` to your HSTS header, then submit your domain to https://hstspreload.org/. Note: this is very difficult to reverse once submitted.',
          estimatedImpact: 'low',
        },
      })
    } else {
      passed++
    }
  }

  // ─────────────────────────────────────────────
  // 3. CSP — Deep Validation
  // ─────────────────────────────────────────────
  const csp = headers['content-security-policy']
  if (!csp) {
    failed++
    findings.push({
      id: 'missing-csp',
      title: 'Missing Content-Security-Policy (CSP) header',
      description: 'A Content Security Policy is your strongest defence against Cross-Site Scripting (XSS) attacks. Without it, any injected script can run with full page privileges, potentially stealing user data or session tokens.',
      severity: 'moderate',
      category: 'security',
      recommendation: {
        fix: 'Start with a restrictive CSP and loosen only where necessary. A good starting point: `Content-Security-Policy: default-src \'self\'; script-src \'self\'; object-src \'none\'; base-uri \'self\'`. Use the Content Security Policy generator at https://report-uri.com/home/generate.',
        estimatedImpact: 'high',
      },
    })
  } else {
    // Check for dangerous directives that negate CSP protection
    const cspLower = csp.toLowerCase()

    const scriptSrcMatch = /script-src([^;]*)/i.exec(csp)
    const defaultSrcMatch = /default-src([^;]*)/i.exec(csp)
    const effectiveScriptSrc = scriptSrcMatch?.[1] ?? defaultSrcMatch?.[1] ?? ''

    if (effectiveScriptSrc.includes("'unsafe-inline'")) {
      failed++
      findings.push({
        id: 'csp-unsafe-inline',
        title: "CSP allows 'unsafe-inline' in script-src",
        description: "'unsafe-inline' in your script-src (or default-src) allows inline `<script>` tags and event handlers. This completely bypasses CSP's primary XSS protection, making the header largely ineffective against injection attacks.",
        severity: 'critical',
        category: 'security',
        value: `script-src: ${effectiveScriptSrc.trim().slice(0, 100)}`,
        recommendation: {
          fix: "Remove `'unsafe-inline'` from your CSP's `script-src`. Instead, use `'nonce-{random}'` or `'sha256-{hash}'` to allow only specific inline scripts. This requires generating a unique nonce per request on the server.",
          estimatedImpact: 'high',
        },
      })
    } else {
      passed++
    }

    if (effectiveScriptSrc.includes("'unsafe-eval'")) {
      failed++
      findings.push({
        id: 'csp-unsafe-eval',
        title: "CSP allows 'unsafe-eval' in script-src",
        description: "'unsafe-eval' allows the use of `eval()`, `setTimeout(string)`, and `new Function()`. These functions can execute attacker-controlled strings as code, creating XSS vectors. Many modern frameworks do not require `eval`.",
        severity: 'moderate',
        category: 'security',
        value: `script-src: ${effectiveScriptSrc.trim().slice(0, 100)}`,
        recommendation: {
          fix: "Remove `'unsafe-eval'` from your CSP. Audit your code to replace any `eval()` usage. Some bundlers (e.g., older Webpack configs) generate `eval` in development — ensure it is removed in production builds.",
          estimatedImpact: 'medium',
        },
      })
    } else {
      passed++
    }

    // Check for wildcard source
    if (cspLower.includes('script-src *') || cspLower.includes('default-src *')) {
      failed++
      findings.push({
        id: 'csp-wildcard-source',
        title: 'CSP uses wildcard (*) in script source',
        description: 'A wildcard (`*`) in `script-src` or `default-src` allows scripts to be loaded from any origin, making your CSP effectively useless against XSS from external domains.',
        severity: 'critical',
        category: 'security',
        recommendation: {
          fix: 'Replace the wildcard with an explicit allowlist of trusted domains (e.g., `script-src \'self\' cdn.trusted.com`).',
          estimatedImpact: 'high',
        },
      })
    } else {
      passed++
    }
  }

  // ─────────────────────────────────────────────
  // 4. CORS — Wildcard Detection
  // ─────────────────────────────────────────────
  const corsHeader = headers['access-control-allow-origin']
  if (corsHeader === '*') {
    failed++
    findings.push({
      id: 'cors-wildcard',
      title: 'CORS policy allows all origins (*)',
      description: '`Access-Control-Allow-Origin: *` permits any website to make cross-origin requests to your server. While acceptable for truly public, anonymous APIs or static assets, this is dangerous on pages that return user-specific data or accept credentials — cookies and tokens will be exposed to any domain.',
      severity: 'minor',
      category: 'security',
      value: corsHeader,
      recommendation: {
        fix: 'Restrict `Access-Control-Allow-Origin` to a specific allowlist of trusted origins (e.g., `Access-Control-Allow-Origin: https://yourdomain.com`). For APIs that require credentials, a wildcard is blocked by browsers anyway — you must use explicit origins.',
        estimatedImpact: 'medium',
      },
    })
  } else if (corsHeader) {
    passed++
  }
  // If CORS header is absent, that is the default secure state — no finding needed.

  // ─────────────────────────────────────────────
  // 5. X-Content-Type-Options
  // ─────────────────────────────────────────────
  const xCto = headers['x-content-type-options']
  if (!xCto) {
    failed++
    findings.push({
      id: 'missing-x-content-type-options',
      title: 'Missing X-Content-Type-Options header',
      description: 'Without `X-Content-Type-Options: nosniff`, browsers may guess the MIME type of responses, which can allow CSS or image files containing JavaScript to be executed as scripts.',
      severity: 'moderate',
      category: 'security',
      recommendation: {
        fix: 'Add `X-Content-Type-Options: nosniff` to all server responses. This is one of the simplest security headers to add and has no downsides.',
        estimatedImpact: 'medium',
      },
    })
  } else if (xCto.toLowerCase() !== 'nosniff') {
    failed++
    findings.push({
      id: 'xcto-not-nosniff',
      title: 'X-Content-Type-Options should be "nosniff"',
      description: `Current value is "${xCto}". The only valid value for this header is \`nosniff\`.`,
      severity: 'minor',
      category: 'security',
      value: xCto,
      recommendation: {
        fix: 'Change the header value to exactly `nosniff`: `X-Content-Type-Options: nosniff`.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 6. X-Frame-Options
  // ─────────────────────────────────────────────
  const xfo = headers['x-frame-options']
  if (!xfo) {
    failed++
    findings.push({
      id: 'missing-x-frame-options',
      title: 'Missing X-Frame-Options header',
      description: 'Without `X-Frame-Options`, your site can be embedded in an `<iframe>` by any external site. This enables Clickjacking attacks, where users think they are clicking on your site but are actually interacting with an attacker\'s transparent overlay.',
      severity: 'moderate',
      category: 'security',
      recommendation: {
        fix: 'Add `X-Frame-Options: SAMEORIGIN` to prevent framing by external domains. If you need to allow specific third-party embedding, use the CSP `frame-ancestors` directive instead, which is more flexible and modern.',
        estimatedImpact: 'medium',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 7. Referrer-Policy
  // ─────────────────────────────────────────────
  const referrerPolicy = headers['referrer-policy']
  if (!referrerPolicy) {
    failed++
    findings.push({
      id: 'missing-referrer-policy',
      title: 'Missing Referrer-Policy header',
      description: 'Without a Referrer-Policy, browsers may send the full URL of your pages (including query parameters like `?token=abc`) to third-party sites when users click external links, leaking sensitive URL data.',
      severity: 'minor',
      category: 'security',
      recommendation: {
        fix: 'Add `Referrer-Policy: strict-origin-when-cross-origin`. This is the modern default — it sends the origin for cross-site requests but the full URL for same-site requests.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 8. Permissions-Policy
  // ─────────────────────────────────────────────
  const permissionsPolicy = headers['permissions-policy']
  if (!permissionsPolicy) {
    failed++
    findings.push({
      id: 'missing-permissions-policy',
      title: 'Missing Permissions-Policy header',
      description: 'The Permissions-Policy header controls which browser APIs (camera, microphone, geolocation, etc.) can be used. Without it, any injected third-party script could theoretically access sensitive APIs your page does not need.',
      severity: 'minor',
      category: 'security',
      recommendation: {
        fix: 'Add a `Permissions-Policy` header that disables browser features you don\'t use. Example: `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Customize to your application\'s actual needs.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  // ─────────────────────────────────────────────
  // 9. Mixed Content (HTTP resources on HTTPS page)
  // ─────────────────────────────────────────────
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
        title: `${mixedContent.length} mixed content resource${mixedContent.length > 1 ? 's' : ''} detected`,
        description: 'HTTP resources are loaded on an HTTPS page. Browsers block active mixed content (scripts, stylesheets) and warn about passive mixed content (images, videos). This breaks the security of your HTTPS connection.',
        severity: 'critical',
        category: 'security',
        value: String(mixedContent.length),
        element: mixedContent.slice(0, 3).join(', '),
        recommendation: {
          fix: 'Update all resource URLs to use `https://`. For protocol-relative URLs, use `//` (e.g., `//cdn.example.com/lib.js`). Search your codebase for hardcoded `http://` URLs in script/link/img tags.',
          estimatedImpact: 'high',
        },
      })
    } else {
      passed++
    }
  }

  // ─────────────────────────────────────────────
  // 10. Information Disclosure (Server/X-Powered-By headers)
  // ─────────────────────────────────────────────
  const server = headers['server']
  const poweredBy = headers['x-powered-by']

  if (server && /\d/.test(server)) {
    failed++
    findings.push({
      id: 'server-version-exposed',
      title: 'Server software version exposed',
      description: `The \`Server\` header reveals version information: "${server}". Attackers can use this to find known CVEs for that specific version and plan targeted exploits.`,
      severity: 'minor',
      category: 'security',
      value: server,
      recommendation: {
        fix: 'Configure your web server to suppress the version number from the `Server` header. On Nginx: `server_tokens off;`. On Apache: `ServerSignature Off` + `ServerTokens Prod`.',
        estimatedImpact: 'low',
      },
    })
  } else {
    passed++
  }

  if (poweredBy) {
    failed++
    findings.push({
      id: 'x-powered-by-exposed',
      title: 'X-Powered-By header exposes technology stack',
      description: `The \`X-Powered-By\` header reveals your server technology: "${poweredBy}". This fingerprinting information helps attackers target known framework-specific vulnerabilities.`,
      severity: 'minor',
      category: 'security',
      value: poweredBy,
      recommendation: {
        fix: 'Remove or suppress the `X-Powered-By` header. In Express.js: `app.disable(\'x-powered-by\')`. In Next.js, configure `headers()` in `next.config.js` to set `X-Powered-By` to an empty value or override it.',
        estimatedImpact: 'low',
      },
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
