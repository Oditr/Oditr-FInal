// ── Shared HTTP fetcher with timeout, redirect following, and timing ──

import { FetchResult } from './types'

const DEFAULT_TIMEOUT = 20_000 // 20s — some pages are slow behind CDNs/SSR
const MAX_BODY_BYTES = 5 * 1024 * 1024 // 5 MB
const USER_AGENT = 'Oditr-AuditBot/1.0 (+https://vitalfix.dev)'

export async function fetchPage(url: string, timeout = DEFAULT_TIMEOUT): Promise<FetchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const start = Date.now()

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })

    // Guard: reject non-HTML responses before reading the body
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`URL returned non-HTML content-type: ${contentType.split(';')[0]}`)
    }

    // Guard: reject oversized responses to prevent OOM
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_BYTES) {
      throw new Error(`Response too large (${(contentLength / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`)
    }

    const html = await res.text()
    const timing = Date.now() - start

    // Post-read size check (content-length header may be absent)
    if (html.length > MAX_BODY_BYTES) {
      throw new Error(`Response body too large (${(html.length / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`)
    }

    // Normalize headers to lowercase key map
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

    return {
      html,
      headers,
      statusCode: res.status,
      url: res.url,
      timing,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * HEAD-request a URL. Returns status code + headers.
 * Used for checking broken links and image sizes without downloading full body.
 */
export async function headRequest(
  url: string,
  timeout = 5_000
): Promise<{ status: number; headers: Record<string, string>; ok: boolean }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    })

    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

    return { status: res.status, headers, ok: res.ok }
  } catch {
    return { status: 0, headers: {}, ok: false }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
export function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}
