// ── SEO Guide Data ──
// Static guide content for programmatic SEO targeting Web Vitals keywords.

export interface Guide {
  slug: string
  title: string
  description: string
  category: 'lcp' | 'cls' | 'inp' | 'ttfb' | 'general'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  readingTime: number // minutes
  datePublished: string
  dateModified: string
  sections: Array<{ heading: string; content: string }>
  relatedSlugs: string[]
}

const categoryColors: Record<string, string> = {
  lcp: '#60a5fa',
  cls: '#fbbf24',
  inp: '#34d399',
  ttfb: '#a78bfa',
  general: '#818cf8',
}

const categoryLabels: Record<string, string> = {
  lcp: 'LCP',
  cls: 'CLS',
  inp: 'INP',
  ttfb: 'TTFB',
  general: 'General',
}

export { categoryColors, categoryLabels }

export const guides: Guide[] = [
  {
    slug: 'fix-lcp',
    title: 'How to Fix LCP (Largest Contentful Paint) — Complete Guide',
    description: 'Learn exactly how to fix LCP issues and bring your Largest Contentful Paint under 2.5 seconds. Includes code snippets for image optimization, preloading, and server-side fixes.',
    category: 'lcp',
    difficulty: 'intermediate',
    readingTime: 8,
    datePublished: '2025-12-01',
    dateModified: '2026-04-01',
    sections: [
      {
        heading: 'What is LCP and Why Does It Matter?',
        content: `Largest Contentful Paint (LCP) measures how long it takes for the largest visible element on the page (usually a hero image, heading, or video poster) to render. Google considers LCP **good** if it loads within **2.5 seconds**. Poor LCP (>4.0s) directly hurts your search ranking.\n\nLCP is one of the three Core Web Vitals that Google uses as a ranking signal. It's also the metric most correlated with user-perceived load speed — users judge a page by when the "main content" appears.`
      },
      {
        heading: 'Common Causes of Slow LCP',
        content: `1. **Unoptimized hero images** — serving 4000×3000px PNGs instead of compressed WebP\n2. **Render-blocking CSS/JS** — stylesheets and scripts that delay rendering\n3. **Slow server response (TTFB)** — the server takes too long to respond\n4. **Client-side rendering** — the LCP element is rendered by JavaScript, not HTML\n5. **No image preloading** — the browser discovers the hero image too late\n6. **Third-party scripts** — analytics, chat widgets, and ads blocking the main thread`
      },
      {
        heading: 'Fix 1: Preload the LCP Image',
        content: `Add a preload link in your \`<head>\` so the browser starts downloading the LCP image immediately, before CSS is parsed:\n\n\`\`\`html\n<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />\n\`\`\`\n\nFor Next.js, use the priority prop on next/image:\n\n\`\`\`jsx\nimport Image from 'next/image'\n\n<Image src="/hero.webp" alt="Hero" priority />\n\`\`\`\n\nThis alone often cuts LCP by **1-2 seconds**.`
      },
      {
        heading: 'Fix 2: Serve Modern Image Formats',
        content: `Convert hero images to WebP or AVIF. WebP is 25-35% smaller than JPEG at the same quality. Use the \`<picture>\` element for fallback:\n\n\`\`\`html\n<picture>\n  <source srcset="/hero.avif" type="image/avif" />\n  <source srcset="/hero.webp" type="image/webp" />\n  <img src="/hero.jpg" alt="Hero" width="1200" height="630" />\n</picture>\n\`\`\`\n\nAlways specify \`width\` and \`height\` to prevent layout shift (CLS).`
      },
      {
        heading: 'Fix 3: Eliminate Render-Blocking Resources',
        content: `Move non-critical CSS below the fold using \`media="print"\` hack or async loading:\n\n\`\`\`html\n<!-- Critical CSS inline -->\n<style>/* only above-the-fold styles */</style>\n\n<!-- Non-critical CSS loaded async -->\n<link rel="stylesheet" href="/non-critical.css" media="print" onload="this.media='all'" />\n\`\`\`\n\nFor JavaScript, use \`defer\` or \`async\` attributes, and move heavy scripts below the fold.`
      },
      {
        heading: 'Fix 4: Improve Server Response Time',
        content: `Target TTFB under 200ms:\n\n- **Use a CDN** (Vercel, Cloudflare, Fastly) to serve from edge locations\n- **Enable compression** (gzip/brotli) on your server\n- **Use stale-while-revalidate** caching headers\n- **Optimize database queries** — add indexes, reduce N+1 queries\n- **Use Incremental Static Regeneration (ISR)** in Next.js for dynamic pages`
      },
      {
        heading: 'Measuring LCP',
        content: `Use these tools to measure and track LCP:\n\n1. **Øditr Dashboard** — run a free audit at vitalfix.dev/dashboard\n2. **Chrome DevTools** → Performance tab → look for "LCP" marker\n3. **PageSpeed Insights** — pagespeed.web.dev\n4. **web-vitals library** — \`onLCP(console.log)\` in your JavaScript\n5. **Chrome UX Report** — real user data from Search Console`
      },
    ],
    relatedSlugs: ['fix-cls', 'reduce-ttfb', 'lazy-loading-images'],
  },

  {
    slug: 'fix-cls',
    title: 'How to Fix CLS (Cumulative Layout Shift) — Stop Layout Jank',
    description: 'Eliminate unexpected layout shifts and bring your CLS score below 0.1. Learn the exact causes of layout shift and production-ready fixes for images, fonts, ads, and dynamic content.',
    category: 'cls',
    difficulty: 'intermediate',
    readingTime: 7,
    datePublished: '2025-12-05',
    dateModified: '2026-04-01',
    sections: [
      {
        heading: 'What is CLS?',
        content: `Cumulative Layout Shift (CLS) measures visual stability — how much the page layout shifts unexpectedly while the user is viewing it. A **good** CLS score is below **0.1**. Poor CLS (>0.25) means elements are jumping around, causing accidental clicks and a frustrating experience.\n\nCLS is the most common Core Web Vital failure. Over 50% of sites fail the CLS threshold.`
      },
      {
        heading: 'Top Causes of CLS',
        content: `1. **Images without dimensions** — the browser doesn't know how much space to reserve\n2. **Web fonts causing FOUT/FOIT** — text reflows when the custom font loads\n3. **Dynamically injected content** — ads, banners, cookie notices pushing content down\n4. **iframes without dimensions** — embeds (YouTube, maps) causing layout shift\n5. **Late-loading CSS** — styles that change layout after initial paint`
      },
      {
        heading: 'Fix 1: Always Set Image Dimensions',
        content: `Always include \`width\` and \`height\` attributes on images:\n\n\`\`\`html\n<img src="/photo.webp" alt="..." width="800" height="450" loading="lazy" />\n\`\`\`\n\nOr use CSS aspect-ratio:\n\n\`\`\`css\n.hero-image {\n  aspect-ratio: 16 / 9;\n  width: 100%;\n  height: auto;\n}\n\`\`\`\n\nThis lets the browser reserve space before the image loads, eliminating shift entirely.`
      },
      {
        heading: 'Fix 2: Use font-display: swap',
        content: `Prevent invisible text (FOIT) and minimize text reflow with font-display:\n\n\`\`\`css\n@font-face {\n  font-family: 'Inter';\n  src: url('/fonts/Inter.woff2') format('woff2');\n  font-display: swap;\n  font-weight: 400;\n}\n\`\`\`\n\nEven better, preload your primary font:\n\n\`\`\`html\n<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />\n\`\`\``
      },
      {
        heading: 'Fix 3: Reserve Space for Dynamic Content',
        content: `For ads, banners, or lazy-loaded sections, use CSS \`min-height\` to reserve the space:\n\n\`\`\`css\n.ad-slot {\n  min-height: 250px; /* leaderboard ad */\n  background: var(--bg-secondary);\n}\n\n.cookie-banner {\n  position: fixed; /* doesn't push content */\n  bottom: 0;\n}\n\`\`\`\n\nNever insert content above existing content in the DOM.`
      },
    ],
    relatedSlugs: ['fix-lcp', 'fix-inp', 'lazy-loading-images'],
  },

  {
    slug: 'fix-inp',
    title: 'How to Fix INP (Interaction to Next Paint) — Responsiveness Guide',
    description: 'Improve your INP score and make your site respond instantly to user interactions. Covers event handler optimization, main thread management, and debouncing techniques.',
    category: 'inp',
    difficulty: 'advanced',
    readingTime: 9,
    datePublished: '2025-12-10',
    dateModified: '2026-04-01',
    sections: [
      {
        heading: 'What is INP?',
        content: `Interaction to Next Paint (INP) measures how quickly your page responds to user interactions — clicks, taps, and key presses. Google considers INP **good** if it's under **200ms**. Poor INP (>500ms) means your site feels sluggish and unresponsive.\n\nINP replaced FID (First Input Delay) as a Core Web Vital in March 2024. Unlike FID which only measured the first interaction, INP measures **all** interactions throughout the page lifecycle.`
      },
      {
        heading: 'Common Causes of Poor INP',
        content: `1. **Long JavaScript tasks** blocking the main thread\n2. **Expensive event handlers** doing too much synchronous work\n3. **Large DOM trees** causing slow rendering after state changes\n4. **Third-party scripts** competing for main thread time\n5. **Synchronous layout reads** triggering forced reflows`
      },
      {
        heading: 'Fix 1: Break Up Long Tasks',
        content: `Use \`setTimeout\` or \`scheduler.yield()\` to break up long tasks:\n\n\`\`\`javascript\n// Before: one long task (blocks for 300ms)\nfunction processData(items) {\n  items.forEach(item => heavyComputation(item));\n}\n\n// After: yielding to the browser between chunks\nasync function processData(items) {\n  const CHUNK_SIZE = 50;\n  for (let i = 0; i < items.length; i += CHUNK_SIZE) {\n    const chunk = items.slice(i, i + CHUNK_SIZE);\n    chunk.forEach(item => heavyComputation(item));\n    // Yield to let the browser handle user input\n    await new Promise(resolve => setTimeout(resolve, 0));\n  }\n}\n\`\`\``
      },
      {
        heading: 'Fix 2: Debounce Input Handlers',
        content: `For scroll, resize, and input handlers, debounce to prevent excessive calls:\n\n\`\`\`javascript\nfunction debounce(fn, delay = 150) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}\n\nconst handleSearch = debounce((query) => {\n  fetchResults(query);\n}, 200);\n\ninput.addEventListener('input', (e) => handleSearch(e.target.value));\n\`\`\``
      },
      {
        heading: 'Fix 3: Use CSS contain for Complex Components',
        content: `CSS containment tells the browser that a subtree is independent, allowing it to skip re-rendering:\n\n\`\`\`css\n.card {\n  contain: layout style paint;\n}\n\n.virtualized-list-item {\n  contain: strict;\n  content-visibility: auto;\n  contain-intrinsic-size: 0 60px;\n}\n\`\`\`\n\n\`content-visibility: auto\` can dramatically speed up rendering of long lists by skipping off-screen items.`
      },
    ],
    relatedSlugs: ['fix-lcp', 'fix-cls', 'lighthouse-score-improve'],
  },

  {
    slug: 'reduce-ttfb',
    title: 'How to Reduce TTFB (Time to First Byte) — Server Speed Guide',
    description: 'Cut your TTFB below 200ms with CDN configuration, caching strategies, server optimization, and edge computing. The foundation of all Web Vitals performance.',
    category: 'ttfb',
    difficulty: 'intermediate',
    readingTime: 6,
    datePublished: '2025-12-15',
    dateModified: '2026-04-01',
    sections: [
      {
        heading: 'What is TTFB?',
        content: `Time to First Byte (TTFB) is how long it takes from the browser's request to receiving the first byte of the response. While not a Core Web Vital itself, TTFB directly affects LCP and FCP. Target: **under 200ms**.\n\nEvery 100ms of TTFB improvement cascades into faster LCP.`
      },
      {
        heading: 'Use a CDN for Edge Delivery',
        content: `Serving your pages from a CDN edge location close to the user can cut TTFB by 100-500ms:\n\n- **Vercel** — automatic edge deployment for Next.js\n- **Cloudflare Pages** — global CDN with Workers\n- **AWS CloudFront** — enterprise-grade CDN\n\nFor API routes, use edge runtimes:\n\n\`\`\`javascript\n// Next.js Edge API Route\nexport const runtime = 'edge'\n\nexport async function GET(request) {\n  // Runs on Vercel Edge Network, ~10ms TTFB\n  return Response.json({ data: 'fast' })\n}\n\`\`\``
      },
      {
        heading: 'Implement Aggressive Caching',
        content: `Use stale-while-revalidate for dynamic content:\n\n\`\`\`javascript\n// Next.js API route with ISR-style caching\nexport async function GET() {\n  const data = await fetchFromDB()\n  return Response.json(data, {\n    headers: {\n      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',\n    },\n  })\n}\n\`\`\`\n\nThis serves cached content instantly and revalidates in the background.`
      },
      {
        heading: 'Optimize Database Queries',
        content: `Slow database queries are the #1 cause of high TTFB for dynamic pages:\n\n1. **Add database indexes** for frequently queried columns\n2. **Use connection pooling** (PgBouncer, Supabase built-in)\n3. **Avoid N+1 queries** — use JOINs or batch fetching\n4. **Cache hot queries** with Redis or in-memory caches\n5. **Use read replicas** for geographically distributed users`
      },
    ],
    relatedSlugs: ['fix-lcp', 'lighthouse-score-improve'],
  },

  {
    slug: 'lazy-loading-images',
    title: 'Lazy Loading Images — The Complete Implementation Guide',
    description: 'Master lazy loading with native browser support, Intersection Observer, and framework-specific implementations. Reduce initial load by 40-60% while keeping images snappy.',
    category: 'general',
    difficulty: 'beginner',
    readingTime: 5,
    datePublished: '2026-01-05',
    dateModified: '2026-04-01',
    sections: [
      {
        heading: 'What is Lazy Loading?',
        content: `Lazy loading defers loading of off-screen images until the user scrolls near them. This dramatically reduces initial page weight and speeds up LCP by prioritizing above-the-fold content.`
      },
      {
        heading: 'Native Browser Lazy Loading',
        content: `The simplest approach — add \`loading="lazy"\` to any below-the-fold image:\n\n\`\`\`html\n<!-- Above the fold: load immediately -->\n<img src="/hero.webp" alt="Hero" width="1200" height="630" fetchpriority="high" />\n\n<!-- Below the fold: lazy load -->\n<img src="/feature.webp" alt="Feature" width="600" height="400" loading="lazy" />\n\`\`\`\n\n**Important:** Never lazy-load your LCP image! The hero image should load eagerly with \`fetchpriority="high"\`.`
      },
      {
        heading: 'Next.js Image Optimization',
        content: `Next.js handles lazy loading automatically:\n\n\`\`\`jsx\nimport Image from 'next/image'\n\n// Hero image: eagerly loaded\n<Image src="/hero.webp" alt="Hero" priority />\n\n// Below fold: automatically lazy-loaded\n<Image src="/feature.webp" alt="Feature" width={600} height={400} />\n\`\`\`\n\nnext/image also auto-converts to WebP, generates multiple sizes, and sets proper cache headers.`
      },
    ],
    relatedSlugs: ['fix-lcp', 'fix-cls'],
  },

  {
    slug: 'lighthouse-score-improve',
    title: 'How to Improve Your Lighthouse Score from 50 to 90+',
    description: 'A tactical guide to dramatically improving your Google Lighthouse performance score. Covers the exact audit items that move the needle most, with prioritized fix order.',
    category: 'general',
    difficulty: 'beginner',
    readingTime: 10,
    datePublished: '2026-01-15',
    dateModified: '2026-04-01',
    sections: [
      {
        heading: 'How Lighthouse Calculates Your Score',
        content: `Lighthouse weights 6 metrics to calculate performance score:\n\n| Metric | Weight |\n|--------|--------|\n| Total Blocking Time (TBT) | 30% |\n| Largest Contentful Paint (LCP) | 25% |\n| Cumulative Layout Shift (CLS) | 25% |\n| First Contentful Paint (FCP) | 10% |\n| Speed Index (SI) | 10% |\n\nTBT and LCP account for **55%** of your score. Fix those first.`
      },
      {
        heading: 'Step 1: Run a Baseline Audit',
        content: `Before making any changes, run an audit on Øditr to establish your baseline:\n\n1. Go to **vitalfix.dev/dashboard**\n2. Enter your URL and click "Run Audit"\n3. Note your Performance, LCP, TBT, and CLS values\n4. Check the "Opportunities" tab for prioritized fixes\n\nThis gives you a clear before/after comparison.`
      },
      {
        heading: 'Step 2: Fix the Highest-Impact Issues',
        content: `Attack issues in this order (highest impact first):\n\n1. **Eliminate render-blocking resources** — inline critical CSS, defer non-critical\n2. **Optimize images** — WebP format, proper sizing, lazy loading\n3. **Remove unused JavaScript** — tree-shake, code-split, remove dead code\n4. **Minimize main thread work** — break up long tasks, defer non-critical JS\n5. **Enable text compression** — ensure gzip/brotli is enabled on your server\n6. **Add image dimensions** — prevent CLS from dimension-less images`
      },
      {
        heading: 'Step 3: Re-Test and Iterate',
        content: `After each change:\n\n1. Deploy to a staging environment\n2. Run another audit on Øditr\n3. Compare against your baseline using the History tab\n4. Repeat until you hit 90+\n\nReal improvement is iterative. Don't try to fix everything at once — tackle the biggest wins first.`
      },
    ],
    relatedSlugs: ['fix-lcp', 'fix-inp', 'fix-cls', 'reduce-ttfb'],
  },
]

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find(g => g.slug === slug)
}

export function getRelatedGuides(slug: string): Guide[] {
  const guide = getGuideBySlug(slug)
  if (!guide) return []
  return guide.relatedSlugs
    .map(s => getGuideBySlug(s))
    .filter((g): g is Guide => g !== undefined)
}
