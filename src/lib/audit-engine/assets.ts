// ── CSS/JS Asset Analysis ──
// Checks file sizes, render-blocking resources, minification hints

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import { headRequest, resolveUrl } from './fetcher'
import type { CheerioAPI } from './index'

const MAX_ASSETS = 30
const LARGE_CSS_BYTES = 100_000   // 100 KB
const LARGE_JS_BYTES = 150_000    // 150 KB
const CONCURRENCY = 8

interface AssetInfo {
  url: string
  type: 'css' | 'js'
  isRenderBlocking: boolean
  element: string
}

export async function checkAssets(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0
  const assets: AssetInfo[] = []

  // Collect CSS
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const resolved = resolveUrl(href, fetched.url)
    if (!resolved) return
    const media = $(el).attr('media')
    // Render-blocking if no media query or media="all"
    const isRenderBlocking = !media || media === 'all'
    assets.push({
      url: resolved,
      type: 'css',
      isRenderBlocking,
      element: `<link href="${href.slice(0, 60)}">`,
    })
  })

  // Collect JS
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    const resolved = resolveUrl(src, fetched.url)
    if (!resolved) return
    const hasAsync = $(el).attr('async') !== undefined
    const hasDefer = $(el).attr('defer') !== undefined
    const isModule = $(el).attr('type') === 'module'
    const isRenderBlocking = !hasAsync && !hasDefer && !isModule
    assets.push({
      url: resolved,
      type: 'js',
      isRenderBlocking,
      element: `<script src="${src.slice(0, 60)}">`,
    })
  })

  // Check render-blocking resources
  const renderBlocking = assets.filter(a => a.isRenderBlocking)
  if (renderBlocking.length > 3) {
    failed++
    findings.push({
      id: 'too-many-render-blocking',
      title: `${renderBlocking.length} render-blocking resources`,
      description: `Too many resources block initial render. Add async/defer to scripts and use media queries on stylesheets.`,
      severity: renderBlocking.length > 6 ? 'critical' : 'medium',
      category: 'assets',
      value: String(renderBlocking.length),
    })
  } else {
    passed++
  }

  // Flag individual render-blocking scripts
  for (const a of assets) {
    if (a.isRenderBlocking && a.type === 'js') {
      failed++
      findings.push({
        id: `render-blocking-js-${failed}`,
        title: 'Render-blocking script',
        description: `Script blocks rendering. Add async or defer attribute.`,
        severity: 'medium',
        category: 'assets',
        element: a.element,
      })
    }
  }

  // HEAD-check asset sizes
  const toCheck = assets.slice(0, MAX_ASSETS)
  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const batch = toCheck.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (asset) => {
        const res = await headRequest(asset.url)
        const size = parseInt(res.headers['content-length'] || '0', 10)
        const isGzipped = (res.headers['content-encoding'] || '').includes('gzip') ||
                          (res.headers['content-encoding'] || '').includes('br')
        return { asset, size, isGzipped }
      })
    )

    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      const { asset, size, isGzipped } = r.value

      const limit = asset.type === 'css' ? LARGE_CSS_BYTES : LARGE_JS_BYTES
      if (size > limit) {
        failed++
        findings.push({
          id: `large-${asset.type}-${failed}`,
          title: `Large ${asset.type.toUpperCase()} file: ${(size / 1024).toFixed(0)} KB`,
          description: `${asset.type === 'css' ? 'Stylesheet' : 'Script'} exceeds ${(limit / 1024).toFixed(0)} KB. Consider splitting or tree-shaking.`,
          severity: size > limit * 3 ? 'critical' : 'medium',
          category: 'assets',
          value: `${(size / 1024).toFixed(0)} KB`,
          element: asset.element,
        })
      } else if (size > 0) {
        passed++
      }

      // Check compression
      if (size > 10_000 && !isGzipped) {
        failed++
        findings.push({
          id: `no-compression-${failed}`,
          title: `${asset.type.toUpperCase()} not compressed`,
          description: `Enable gzip or Brotli compression on the server for ${asset.type.toUpperCase()} files`,
          severity: 'medium',
          category: 'assets',
          element: asset.element,
        })
      } else if (size > 0) {
        passed++
      }
    }
  }

  // Check total asset count
  if (assets.length > 20) {
    failed++
    findings.push({
      id: 'too-many-assets',
      title: `${assets.length} external assets loaded`,
      description: `High number of external CSS/JS files. Consider bundling.`,
      severity: assets.length > 40 ? 'critical' : 'low',
      category: 'assets',
      value: String(assets.length),
    })
  } else {
    passed++
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'assets',
    label: 'CSS & JS Optimization',
    score,
    passed,
    failed,
    findings,
  }
}
