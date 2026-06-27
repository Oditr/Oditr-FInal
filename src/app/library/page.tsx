'use client'
import { useState } from 'react'
import CodeBlock from '@/components/ui/CodeBlock'
import { Code2, Filter } from 'lucide-react'

const snippets = [
  // ═══ LCP ═══
  {
    id: 'lcp-preload',
    category: 'LCP',
    title: 'Preload Above-the-Fold Images',
    desc: 'Preloading your hero/LCP image drastically reduces discovery time, typically improving LCP by 500ms–1.5s.',
    language: 'html',
    filename: 'index.html',
    code: `<!-- Add in <head> before any stylesheets -->
<link rel="preload"
  as="image"
  href="/hero-image.webp"
  fetchpriority="high"
  imagesrcset="/hero-480.webp 480w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  imagesizes="(max-width: 600px) 480px, (max-width: 1000px) 800px, 1200px"
/>

<!-- The image tag itself -->
<img
  src="/hero-image.webp"
  alt="Hero"
  width="1200"
  height="600"
  fetchpriority="high"
  decoding="async"
/>`,
  },
  {
    id: 'lcp-server-timing',
    category: 'LCP',
    title: 'Reduce Server Response Time (TTFB)',
    desc: 'Use HTTP caching headers and Edge delivery to reduce time to first byte, which feeds directly into LCP.',
    language: 'javascript',
    filename: 'next.config.js',
    code: `// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Aggressive cache for static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/',
        headers: [
          // Stale-while-revalidate for HTML
          {
            key: 'Cache-Control',
            value: 's-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
    ]
  },
}`,
  },
  {
    id: 'lcp-critical-css',
    category: 'LCP',
    title: 'Inline Critical CSS',
    desc: 'Inline above-the-fold styles directly in <head> to eliminate render-blocking CSS round trips. Defer the full stylesheet.',
    language: 'html',
    filename: 'index.html',
    code: `<head>
  <!-- Inline critical CSS for above-the-fold content -->
  <style>
    /* Only styles needed for initial viewport */
    body { margin: 0; font-family: system-ui, sans-serif; }
    .hero { min-height: 100vh; display: flex;
            align-items: center; justify-content: center; }
    .hero h1 { font-size: clamp(2rem, 5vw, 4rem); }
  </style>

  <!-- Defer full stylesheet — loads asynchronously -->
  <link rel="preload" href="/styles.css"
    as="style" onload="this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>`,
  },
  {
    id: 'lcp-responsive-hero',
    category: 'LCP',
    title: 'Responsive Hero with <picture>',
    desc: 'Use the <picture> element to serve the optimal image format and size for each device, dramatically reducing LCP on mobile.',
    language: 'html',
    filename: 'hero.html',
    code: `<picture>
  <!-- AVIF for browsers that support it (smallest) -->
  <source type="image/avif"
    srcset="/hero-480.avif 480w,
            /hero-800.avif 800w,
            /hero-1200.avif 1200w"
    sizes="100vw" />

  <!-- WebP fallback -->
  <source type="image/webp"
    srcset="/hero-480.webp 480w,
            /hero-800.webp 800w,
            /hero-1200.webp 1200w"
    sizes="100vw" />

  <!-- JPEG fallback for old browsers -->
  <img src="/hero-1200.jpg"
    alt="Hero banner"
    width="1200" height="600"
    fetchpriority="high"
    decoding="async"
    style="width:100%; height:auto;" />
</picture>`,
  },
  {
    id: 'lcp-font-preload',
    category: 'LCP',
    title: 'Preload Critical Fonts',
    desc: 'Preloading your primary font eliminates the flash of invisible text (FOIT) and reduces LCP when text is the largest element.',
    language: 'html',
    filename: 'index.html',
    code: `<head>
  <!-- Preload the critical font file -->
  <link rel="preload"
    href="/fonts/Inter-Variable.woff2"
    as="font"
    type="font/woff2"
    crossorigin="anonymous" />

  <style>
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/Inter-Variable.woff2') format('woff2');
      font-display: swap;   /* or 'optional' for zero CLS */
      font-weight: 100 900;
      unicode-range: U+0000-00FF; /* Latin subset */
    }
  </style>
</head>`,
  },

  // ═══ CLS ═══
  {
    id: 'cls-image-size',
    category: 'CLS',
    title: 'Always Set Image Width & Height',
    desc: 'The browser reserves space before images load, preventing layout shifts. Use aspect-ratio as the modern CSS approach.',
    language: 'css',
    filename: 'styles.css',
    code: `/* Modern CSS approach — set aspect ratio on containers */
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Or use width/height attributes directly on <img> */
/* <img src="photo.jpg" width="800" height="450" alt="..."> */

/* For dynamic iframes or embeds */
.embed-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
}

.embed-container iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}`,
  },
  {
    id: 'cls-font-fallback',
    category: 'CLS',
    title: 'Prevent Font-Swap Layout Shifts',
    desc: 'Use the size-adjust and ascent-override CSS descriptors to make fallback fonts match your web font dimensions.',
    language: 'css',
    filename: 'fonts.css',
    code: `/* Define a size-adjusted fallback to match your custom font */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 107%;
}

/* Use the fallback in your font stack */
body {
  font-family: 'Inter', 'Inter Fallback', system-ui, sans-serif;
}

/* In Next.js — use the built-in font optimizer */
/* import { Inter } from 'next/font/google'
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',      // 'optional' for zero CLS
  preload: true,
})  */`,
  },
  {
    id: 'cls-dynamic-content',
    category: 'CLS',
    title: 'Reserve Space for Dynamic Content',
    desc: 'Ads, banners, and late-loading content cause massive CLS. Always reserve space with min-height or skeleton placeholders.',
    language: 'css',
    filename: 'layout.css',
    code: `/* Reserve space for ad slots */
.ad-slot {
  min-height: 250px;  /* Standard ad height */
  min-width: 300px;
  background: var(--skeleton-bg);
  border-radius: 4px;
  container-type: inline-size;
}

/* Skeleton loading state */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-card) 25%,
    var(--border) 50%,
    var(--bg-card) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-wave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Prevent banner/notification from pushing content */
.top-banner {
  height: 44px;           /* Fixed height — never auto */
  overflow: hidden;
  position: sticky;
  top: 0;
  z-index: 50;
}`,
  },
  {
    id: 'cls-skeleton-react',
    category: 'CLS',
    title: 'Skeleton Loaders for Async Content',
    desc: 'Use skeleton UI to maintain layout stability while data loads. This prevents CLS from empty → populated state transitions.',
    language: 'javascript',
    filename: 'Skeleton.tsx',
    code: `// Reusable Skeleton component
function Skeleton({ width = '100%', height = 20, borderRadius = 4 }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a3d 50%, #1a1a2e 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-wave 1.5s infinite',
    }} />
  )
}

// Usage: Product card with skeleton state
function ProductCard({ product, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <Skeleton height={200} borderRadius={8} />
        <Skeleton width="60%" height={18} style={{ marginTop: 12 }} />
        <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem' }}>
      <img src={product.image} width={300} height={200} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
    </div>
  )
}`,
  },
  {
    id: 'cls-transform-animation',
    category: 'CLS',
    title: 'Use Transform-Only Animations',
    desc: 'Animations using top/left/width/height trigger layout shifts. Use transform and opacity instead — they run on the compositor thread.',
    language: 'css',
    filename: 'animations.css',
    code: `/* ✗ BAD — causes layout shifts */
.slide-in-bad {
  animation: slideInBad 0.3s ease;
}
@keyframes slideInBad {
  from { left: -100%; }
  to   { left: 0; }
}

/* ✓ GOOD — no layout shift, GPU-accelerated */
.slide-in-good {
  animation: slideInGood 0.3s ease;
}
@keyframes slideInGood {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

/* Hint browser to promote element to own layer */
.will-animate {
  will-change: transform, opacity;
  /* Remove will-change after animation completes
     to free GPU memory */
}`,
  },

  // ═══ INP ═══
  {
    id: 'inp-debounce',
    category: 'INP',
    title: 'Debounce Expensive Event Handlers',
    desc: 'Long event handlers block the main thread and hurt INP. Debounce + schedule non-critical work with scheduler.postTask.',
    language: 'javascript',
    filename: 'utils.js',
    code: `// Debounce utility
function debounce(fn, wait = 200) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

// Throttle utility (for scroll/resize)
function throttle(fn, limit = 100) {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Schedule non-urgent work away from user interaction
function scheduleIdleWork(callback) {
  if ('scheduler' in window && 'postTask' in scheduler) {
    return scheduler.postTask(callback, { priority: 'background' })
  }
  // Fallback
  return new Promise(resolve => {
    requestIdleCallback(() => resolve(callback()))
  })
}

// Usage
const input = document.querySelector('#search')
input.addEventListener('input', debounce(async (e) => {
  const results = await fetchSearchResults(e.target.value)
  scheduleIdleWork(() => renderResults(results))
}, 250))`,
  },
  {
    id: 'inp-long-tasks',
    category: 'INP',
    title: 'Break Up Long Tasks with yield()',
    desc: 'Long JavaScript tasks (>50ms) block user interaction. Yield to the browser periodically to keep INP under 200ms.',
    language: 'javascript',
    filename: 'tasks.js',
    code: `// Yield to main thread between work chunks
function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Process a large array in chunks
async function processLargeArray(items) {
  const CHUNK_SIZE = 50
  const results = []

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)

    // Process chunk synchronously
    for (const item of chunk) {
      results.push(expensiveOperation(item))
    }

    // Yield to browser after each chunk
    // This allows interaction events to be processed
    if (i + CHUNK_SIZE < items.length) {
      await yieldToMain()
    }
  }

  return results
}

// Modern scheduler API (Chrome 115+)
async function processWithScheduler(items) {
  for (const item of items) {
    await scheduler.yield()  // Yields if a user interaction is pending
    processItem(item)
  }
}`,
  },
  {
    id: 'inp-web-worker',
    category: 'INP',
    title: 'Offload to Web Workers',
    desc: 'Move CPU-intensive work off the main thread entirely. Web Workers run in a separate thread and never block user interactions.',
    language: 'javascript',
    filename: 'worker-setup.js',
    code: `// heavy-worker.js — runs in background thread
self.onmessage = function(e) {
  const { data, operation } = e.data

  let result
  switch (operation) {
    case 'sort':
      result = data.sort((a, b) => a.score - b.score)
      break
    case 'filter':
      result = data.filter(item => item.active)
      break
    case 'transform':
      result = data.map(item => ({
        ...item,
        computed: expensiveCalculation(item),
      }))
      break
  }

  self.postMessage({ result })
}

// main.js — stays responsive
const worker = new Worker('/heavy-worker.js')

function processDataAsync(data, operation) {
  return new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data.result)
    worker.postMessage({ data, operation })
  })
}

// Usage: main thread stays free for interactions
button.addEventListener('click', async () => {
  button.textContent = 'Processing...'
  const sorted = await processDataAsync(largeDataset, 'sort')
  renderTable(sorted)
  button.textContent = 'Done!'
})`,
  },
  {
    id: 'inp-event-delegation',
    category: 'INP',
    title: 'Event Delegation Pattern',
    desc: 'Instead of attaching listeners to every list item, delegate to a parent. Reduces memory usage and speeds up initial paint.',
    language: 'javascript',
    filename: 'delegation.js',
    code: `// ✗ BAD — one listener per item (slow with 1000+ items)
document.querySelectorAll('.list-item').forEach(item => {
  item.addEventListener('click', handleClick)
})

// ✓ GOOD — one listener on parent, delegate to children
document.querySelector('.list-container')
  .addEventListener('click', (e) => {
    const item = e.target.closest('[data-item-id]')
    if (!item) return

    const id = item.dataset.itemId
    handleItemClick(id)
  })

// Works for dynamically added items too!
// No need to re-attach listeners when list updates.

// React equivalent — single handler on parent
function ItemList({ items, onSelect }) {
  return (
    <ul onClick={(e) => {
      const id = e.target.closest('[data-id]')?.dataset.id
      if (id) onSelect(id)
    }}>
      {items.map(item => (
        <li key={item.id} data-id={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}`,
  },
  {
    id: 'inp-raf-batching',
    category: 'INP',
    title: 'Batch DOM Updates with rAF',
    desc: 'Interleaving DOM reads and writes causes layout thrashing. Batch all reads first, then writes inside requestAnimationFrame.',
    language: 'javascript',
    filename: 'dom-batching.js',
    code: `// ✗ BAD — layout thrashing (read-write-read-write)
elements.forEach(el => {
  const height = el.offsetHeight    // FORCED LAYOUT (read)
  el.style.height = height * 2 + 'px'  // Write
  // Next iteration forces layout again!
})

// ✓ GOOD — batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight)  // Batch READ

requestAnimationFrame(() => {
  elements.forEach((el, i) => {
    el.style.height = heights[i] * 2 + 'px'  // Batch WRITE
  })
})

// For complex updates — use a read/write queue
const domScheduler = {
  reads: [],
  writes: [],
  schedule() {
    // Execute all reads first
    this.reads.forEach(fn => fn())
    // Then all writes in a single frame
    requestAnimationFrame(() => {
      this.writes.forEach(fn => fn())
      this.reads = []
      this.writes = []
    })
  }
}`,
  },

  // ═══ Lazy Loading ═══
  {
    id: 'lazy-loading',
    category: 'Lazy Loading',
    title: 'Native Lazy Loading + Intersection Observer',
    desc: 'Defer off-screen images and components using the native loading="lazy" attribute combined with Intersection Observer for JS-heavy components.',
    language: 'javascript',
    filename: 'lazyLoad.js',
    code: `// 1. Native lazy loading (browser support: 92%+)
// <img src="photo.jpg" loading="lazy" alt="..." width="800" height="600">

// 2. Intersection Observer for JS components
function lazyLoadComponent(selector, importFn) {
  const elements = document.querySelectorAll(selector)
  if (!elements.length) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const module = await importFn()
        module.init(entry.target)
        observer.unobserve(entry.target)
      }
    })
  }, {
    rootMargin: '200px',  // Start loading 200px before visible
    threshold: 0,
  })

  elements.forEach(el => observer.observe(el))
}

// Usage
lazyLoadComponent('[data-map]', () => import('./map.js'))
lazyLoadComponent('[data-chart]', () => import('./chart.js'))

// 3. React lazy + Suspense
// const HeavyChart = React.lazy(() => import('./HeavyChart'))
// <Suspense fallback={<Skeleton />}><HeavyChart /></Suspense>`,
  },
  {
    id: 'lazy-route-splitting',
    category: 'Lazy Loading',
    title: 'Route-Level Code Splitting',
    desc: 'Split your app at the route level so users only download JS for the page they visit. This is automatic in Next.js, but here is how to do it in React Router.',
    language: 'javascript',
    filename: 'routes.tsx',
    code: `import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Lazy-load each route — only downloads when user navigates
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const HeavyReport = lazy(() =>
  import(/* webpackChunkName: "report" */ './pages/HeavyReport')
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/report" element={<HeavyReport />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

// Next.js does this automatically for every file in /app
// Each page.tsx is its own code-split chunk`,
  },
  {
    id: 'lazy-picture-element',
    category: 'Lazy Loading',
    title: 'Lazy <picture> with Fallback',
    desc: 'Combine lazy loading with the <picture> element for format negotiation. Include a low-quality placeholder for the best perceived performance.',
    language: 'html',
    filename: 'lazy-picture.html',
    code: `<!-- Lazy-loaded picture with LQIP (Low Quality Image Placeholder) -->
<div class="image-wrapper" style="aspect-ratio: 16/9; background: #1a1a2e;">
  <picture>
    <source type="image/avif"
      srcset="/photos/landscape-sm.avif 640w,
             /photos/landscape-md.avif 1024w,
             /photos/landscape-lg.avif 1920w"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px" />

    <source type="image/webp"
      srcset="/photos/landscape-sm.webp 640w,
             /photos/landscape-md.webp 1024w,
             /photos/landscape-lg.webp 1920w"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px" />

    <img
      src="/photos/landscape-md.jpg"
      alt="Mountain landscape"
      width="1200" height="675"
      loading="lazy"
      decoding="async"
      style="width: 100%; height: auto; object-fit: cover;"
    />
  </picture>
</div>`,
  },

  // ═══ TTFB ═══
  {
    id: 'ttfb-resource-hints',
    category: 'TTFB',
    title: 'Resource Hints: Preconnect & DNS-Prefetch',
    desc: 'Establish early connections to critical third-party origins. Saves 100–300ms per origin by parallelising DNS, TCP, and TLS handshakes.',
    language: 'html',
    filename: 'index.html',
    code: `<head>
  <!-- Preconnect to critical origins (DNS + TCP + TLS) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://cdn.yourapi.com" />

  <!-- DNS-prefetch as fallback for older browsers -->
  <link rel="dns-prefetch" href="https://analytics.example.com" />
  <link rel="dns-prefetch" href="https://maps.googleapis.com" />

  <!-- Prefetch next likely navigation -->
  <link rel="prefetch" href="/dashboard" />

  <!-- Prerender a high-probability next page (Chrome) -->
  <script type="speculationrules">
    {
      "prerender": [{
        "where": { "href_matches": "/pricing" },
        "eagerness": "moderate"
      }]
    }
  </script>
</head>`,
  },
  {
    id: 'ttfb-edge-caching',
    category: 'TTFB',
    title: 'Edge Caching & CDN Configuration',
    desc: 'Serve content from edge nodes closest to users. Proper cache headers can reduce TTFB from 800ms to under 50ms for cached pages.',
    language: 'javascript',
    filename: 'next.config.js',
    code: `// next.config.js — Edge caching strategy
module.exports = {
  async headers() {
    return [
      {
        // Static assets — cache forever (they have hashed filenames)
        source: '/_next/static/(.*)',
        headers: [{
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        }],
      },
      {
        // Images — cache for 1 year
        source: '/images/(.*)',
        headers: [{
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        }],
      },
      {
        // HTML pages — serve stale while revalidating
        source: '/((?!api|_next).*)',
        headers: [{
          key: 'Cache-Control',
          value: 's-maxage=60, stale-while-revalidate=600',
        }],
      },
      {
        // API routes — short cache with revalidation
        source: '/api/(.*)',
        headers: [{
          key: 'Cache-Control',
          value: 'public, s-maxage=10, stale-while-revalidate=59',
        }],
      },
    ]
  },
}`,
  },
  {
    id: 'ttfb-streaming-ssr',
    category: 'TTFB',
    title: 'Streaming SSR with React 18',
    desc: 'Stream HTML to the browser as it renders instead of waiting for the full page. Users see content faster and TTFB drops to near-zero for the first chunk.',
    language: 'javascript',
    filename: 'page.tsx',
    code: `// Next.js App Router — automatic streaming with Suspense
import { Suspense } from 'react'

// This component fetches data — server streams it when ready
async function ProductList() {
  const products = await fetch('https://api.store.com/products')
    .then(r => r.json())

  return (
    <div className="grid">
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

// Page component — shell is sent instantly
export default function StorePage() {
  return (
    <main>
      {/* This renders immediately in the first HTML chunk */}
      <h1>Our Products</h1>
      <p>Browse our latest collection</p>

      {/* This streams in when data is ready */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductList />
      </Suspense>
    </main>
  )
}

// The browser receives the <h1> and skeleton instantly,
// then the product list streams in once the API responds.
// TTFB for the first byte is effectively 0ms after edge cache.`,
  },
  // ─── Security ───
  {
    id: 'sec-csp',
    category: 'Security',
    title: 'Content Security Policy Headers',
    desc: 'CSP prevents XSS attacks and controls which resources browsers can load. A misconfigured third-party script cannot exfiltrate data with a strict CSP.',
    language: 'javascript',
    filename: 'next.config.js',
    code: `// next.config.js — Strict Content Security Policy
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'nonce-RANDOM_NONCE' https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.yourservice.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}`,
  },
  {
    id: 'sec-sri',
    category: 'Security',
    title: 'Subresource Integrity (SRI) for Third-Party Scripts',
    desc: "SRI ensures third-party scripts haven't been tampered with. If a CDN is compromised, the browser rejects the script. Prevents supply-chain attacks.",
    language: 'html',
    filename: 'index.html',
    code: `<!-- Subresource Integrity — browser verifies hash before executing -->
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"
  integrity="sha512-WFN04846sdKMIP5LKNphMaWzU7YpMyCU245etK3g/2ARYbPK9Ub18eG+ljU96qKRCWh+quCY7yefSmlkQw1ANQ=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
  defer
></script>

<!-- Generate SRI hash for any asset: -->
<!-- $ openssl dgst -sha512 -binary lodash.min.js | openssl base64 -A -->

<!-- Or use the online generator: https://www.srihash.org -->

<!-- In Next.js — add to next.config.js -->
// next.config.js
module.exports = {
  // Automatically adds SRI to _next/static scripts
  generateBuildId: async () => 'my-build-id',
  experimental: {
    sri: {
      algorithm: 'sha512',
    },
  },
}`,
  },
]

const categories = ['All', 'LCP', 'CLS', 'INP', 'Lazy Loading', 'TTFB', 'Security']

export default function LibraryPage() {
  const [active, setActive] = useState('All')

  const filtered = active === 'All' ? snippets : snippets.filter(s => s.category === active)

  const catColor: Record<string, string> = {
    LCP: '#60a5fa', CLS: '#fbbf24', INP: '#34d399', 'Lazy Loading': '#818cf8', TTFB: '#a78bfa', Security: '#ef4444'
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Code Library</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Production-Ready <span className="gradient-text">Code Snippets</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 540, lineHeight: 1.7 }}>
            Copy-paste solutions for every Core Web Vital issue. Each snippet is tested and ready to ship.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg)', position: 'sticky', top: 64, zIndex: 50 }}>
        <div className="container-pad" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem', overflowX: 'auto' }}>
          <Filter size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActive(c)}
              aria-label={`Filter by ${c}`}
              aria-pressed={active === c}
              style={{
                padding: '0.35rem 0.9rem', borderRadius: 100,
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                background: active === c
                  ? (c === 'All' ? 'var(--accent)' : `${catColor[c]}22`)
                  : 'var(--bg-card)',
                color: active === c
                  ? (c === 'All' ? '#fff' : catColor[c])
                  : 'var(--text-secondary)',
                border: active === c && c !== 'All'
                  ? `1px solid ${catColor[c]}44`
                  : '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
            >
              {c}
            </button>
          ))}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
            {filtered.length} snippet{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Snippets */}
      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {filtered.map(s => (
            <div key={s.id} id={s.id} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                    borderRadius: 5, marginBottom: '0.5rem', display: 'inline-block',
                    background: `${catColor[s.category] || '#818cf8'}18`,
                    color: catColor[s.category] || '#818cf8',
                    border: `1px solid ${catColor[s.category] || '#818cf8'}33`,
                  }}>
                    {s.category}
                  </span>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</h2>
                </div>
                <Code2 size={18} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.25rem' }}>{s.desc}</p>
              <CodeBlock code={s.code} language={s.language} filename={s.filename} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
