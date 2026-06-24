// ── Image Optimization Checks ──
// Checks img tags for alt, lazy loading, dimensions, file size, format

import * as cheerio from 'cheerio'
import { AuditFinding, CategoryResult, FetchResult } from './types'
import { headRequest, resolveUrl } from './fetcher'
import type { CheerioAPI } from './index'

const MAX_IMAGES = 30
const LARGE_IMAGE_BYTES = 500_000  // 500 KB
const CONCURRENCY = 8

const MODERN_FORMATS = ['webp', 'avif', 'svg']

const KNOWN_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'avif', 'svg', 'ico', 'tiff']

function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase() || ''
    // Validate it's actually a known image extension (not a path segment like '200x300')
    return KNOWN_IMAGE_EXTS.includes(ext) ? ext : ''
  } catch { return '' }
}

export async function checkImages(fetched: FetchResult, $: CheerioAPI): Promise<CategoryResult> {
  const findings: AuditFinding[] = []
  let passed = 0
  let failed = 0

  const images: { src: string; alt: string | undefined; hasLazy: boolean; hasWidth: boolean; hasHeight: boolean }[] = []

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || ''
    const alt = $(el).attr('alt')
    const hasLazy = $(el).attr('loading') === 'lazy'
    const hasWidth = !!$(el).attr('width')
    const hasHeight = !!$(el).attr('height')
    if (src) images.push({ src, alt, hasLazy, hasWidth, hasHeight })
  })

  // Check alt text (alt="" is valid for decorative images per WCAG)
  for (const img of images) {
    if (img.alt === undefined) {
      failed++
      findings.push({
        id: `img-no-alt-${failed}`,
        title: 'Image missing alt attribute',
        description: `Image lacks alt attribute entirely. Use alt="" for decorative images or descriptive text for meaningful ones.`,
        severity: 'medium',
        category: 'images',
        element: `<img src="${img.src.slice(0, 80)}">`,
      })
    } else {
      passed++
    }
  }

  // Check lazy loading (skip first 2 images — they're above the fold)
  for (let i = 2; i < images.length; i++) {
    if (!images[i].hasLazy) {
      failed++
      findings.push({
        id: `img-no-lazy-${failed}`,
        title: 'Image not lazy loaded',
        description: `Below-the-fold image should use loading="lazy"`,
        severity: 'low',
        category: 'images',
        element: `<img src="${images[i].src.slice(0, 80)}">`,
      })
    } else {
      passed++
    }
  }

  // Check dimensions (prevents CLS)
  for (const img of images) {
    if (!img.hasWidth || !img.hasHeight) {
      failed++
      findings.push({
        id: `img-no-dims-${failed}`,
        title: 'Image missing explicit dimensions',
        description: `Set width and height attributes to prevent layout shifts (CLS)`,
        severity: 'medium',
        category: 'images',
        element: `<img src="${img.src.slice(0, 80)}">`,
      })
    } else {
      passed++
    }
  }

  // HEAD-check image sizes and formats (limit checks)
  const toCheck = images.slice(0, MAX_IMAGES)
  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const batch = toCheck.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (img) => {
        const resolved = resolveUrl(img.src, fetched.url)
        if (!resolved) return null
        const res = await headRequest(resolved)
        const size = parseInt(res.headers['content-length'] || '0', 10)
        return { img, resolved, size, contentType: res.headers['content-type'] || '' }
      })
    )

    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue
      const { img, resolved, size } = r.value

      // Check file size
      if (size > LARGE_IMAGE_BYTES) {
        failed++
        findings.push({
          id: `img-large-${failed}`,
          title: `Large image: ${(size / 1024).toFixed(0)} KB`,
          description: `Image exceeds 500 KB. Consider compressing or using modern formats.`,
          severity: size > 1_000_000 ? 'critical' : 'medium',
          category: 'images',
          value: `${(size / 1024).toFixed(0)} KB`,
          element: `<img src="${img.src.slice(0, 80)}">`,
        })
      } else if (size > 0) {
        passed++
      }

      // Check format
      const ext = getExtension(resolved)
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) {
        failed++
        findings.push({
          id: `img-format-${failed}`,
          title: `Non-modern image format: .${ext}`,
          description: `Consider converting to WebP or AVIF for better compression`,
          severity: 'low',
          category: 'images',
          element: `<img src="${img.src.slice(0, 80)}">`,
        })
      } else if (MODERN_FORMATS.includes(ext)) {
        passed++
      }
    }
  }

  const total = passed + failed
  const score = total === 0 ? 100 : Math.round((passed / total) * 100)

  return {
    category: 'images',
    label: 'Image Optimization',
    score,
    passed,
    failed,
    findings,
  }
}
