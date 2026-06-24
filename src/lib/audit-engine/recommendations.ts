// ── Recommendation Engine ──
// Deterministic mapping: finding pattern → actionable fix + code snippet + docs
// Covers all 8 audit categories with concrete, copy-pasteable solutions

import { AuditFinding, Recommendation, CategoryResult } from './types'

// ── Severity → impact weight for uplift calculation ──
const SEVERITY_IMPACT: Record<string, number> = {
  critical: 3.0,
  medium: 2.0,
  low: 1.0,
  info: 0,
}

const CATEGORY_WEIGHT: Record<string, number> = {
  'broken-links': 1.0,
  'images': 1.0,
  'assets': 1.0,
  'meta-tags': 0.8,
  'headings': 0.6,
  'security': 1.2,
  'mobile': 1.0,
  'accessibility': 1.1,
}

// ═══════════════════════════════════════════════
// RECOMMENDATION REGISTRY — Pattern-matched fixes
// ═══════════════════════════════════════════════

interface RecommendationRule {
  /** Matches against finding.id using startsWith */
  idPrefix: string
  recommendation: Recommendation
}

const RECOMMENDATION_RULES: RecommendationRule[] = [
  // ── BROKEN LINKS ──
  {
    idPrefix: 'broken-link-',
    recommendation: {
      fix: 'Update or remove the broken link. If the target page has moved, use a 301 redirect or update the href.',
      codeSnippet: '<!-- Before -->\n<a href="/old-page">Link</a>\n\n<!-- After: update to correct URL -->\n<a href="/new-page">Link</a>\n\n<!-- Or remove if no longer relevant -->\n<!-- <a href="/old-page">Link</a> -->',
      docsUrl: 'https://web.dev/articles/link-best-practices',
      estimatedImpact: 'medium',
    },
  },

  // ── IMAGES ──
  {
    idPrefix: 'img-no-alt-',
    recommendation: {
      fix: 'Add descriptive alt text for meaningful images, or alt="" for purely decorative ones.',
      codeSnippet: '<!-- Meaningful image -->\n<img src="hero.jpg" alt="Product dashboard showing real-time analytics">\n\n<!-- Decorative image -->\n<img src="divider.svg" alt="">',
      docsUrl: 'https://web.dev/articles/image-alt',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'img-no-lazy-',
    recommendation: {
      fix: 'Add loading="lazy" to below-the-fold images. Never lazy-load the LCP image (above-the-fold hero).',
      codeSnippet: '<!-- Below-the-fold images -->\n<img src="photo.jpg" loading="lazy" alt="Description">\n\n<!-- Above-the-fold hero: do NOT lazy load -->\n<img src="hero.webp" fetchpriority="high" alt="Hero">',
      docsUrl: 'https://web.dev/articles/browser-level-image-lazy-loading',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'img-no-dims-',
    recommendation: {
      fix: 'Set explicit width and height attributes to prevent layout shifts (CLS). Use CSS aspect-ratio for responsive images.',
      codeSnippet: '<img src="photo.jpg" width="800" height="600" alt="Photo"\n     style="width: 100%; height: auto;">\n\n/* Or use CSS aspect-ratio */\nimg {\n  aspect-ratio: 4/3;\n  width: 100%;\n  height: auto;\n}',
      docsUrl: 'https://web.dev/articles/optimize-cls#images-without-dimensions',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'img-large-',
    recommendation: {
      fix: 'Compress the image or convert to WebP/AVIF. Use responsive srcset for different screen sizes.',
      codeSnippet: '<!-- Responsive images with modern formats -->\n<picture>\n  <source srcset="photo.avif" type="image/avif">\n  <source srcset="photo.webp" type="image/webp">\n  <img src="photo.jpg" alt="Photo" loading="lazy"\n       width="800" height="600">\n</picture>\n\n# CLI: convert with cwebp\ncwebp -q 80 photo.png -o photo.webp',
      docsUrl: 'https://web.dev/articles/uses-webp-images',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'img-format-',
    recommendation: {
      fix: 'Convert to modern image formats (WebP or AVIF) for 25-50% smaller file sizes with equal visual quality.',
      codeSnippet: '<picture>\n  <source srcset="image.avif" type="image/avif">\n  <source srcset="image.webp" type="image/webp">\n  <img src="image.jpg" alt="Fallback">\n</picture>',
      docsUrl: 'https://web.dev/articles/uses-webp-images',
      estimatedImpact: 'medium',
    },
  },

  // ── ASSETS ──
  {
    idPrefix: 'render-blocking-css',
    recommendation: {
      fix: 'Inline critical CSS and defer non-critical stylesheets. Use media queries for conditional loading.',
      codeSnippet: '<!-- Critical CSS inlined -->\n<style>\n  /* Only above-the-fold styles */\n  body { margin: 0; font-family: sans-serif; }\n  .hero { min-height: 100vh; }\n</style>\n\n<!-- Non-critical CSS deferred -->\n<link rel="preload" href="styles.css" as="style"\n      onload="this.onload=null;this.rel=\'stylesheet\'">\n<noscript><link rel="stylesheet" href="styles.css"></noscript>',
      docsUrl: 'https://web.dev/articles/defer-non-critical-css',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'render-blocking-js',
    recommendation: {
      fix: 'Add defer or async attribute to non-critical scripts. Move scripts to the bottom of <body>.',
      codeSnippet: '<!-- Before: render blocking -->\n<script src="analytics.js"></script>\n\n<!-- After: non-blocking -->\n<script src="analytics.js" defer></script>\n\n<!-- Or async for independent scripts -->\n<script src="analytics.js" async></script>',
      docsUrl: 'https://web.dev/articles/render-blocking-resources',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'large-asset-',
    recommendation: {
      fix: 'Minify and compress the asset. Enable gzip/brotli compression on your server. Consider code splitting.',
      codeSnippet: '# Enable Brotli in nginx\nbrotli on;\nbrotli_types text/css application/javascript;\n\n# Minify with terser\nnpx terser app.js -o app.min.js --compress --mangle\n\n# Next.js: dynamic import for code splitting\nconst HeavyComponent = dynamic(\n  () => import(\'./HeavyComponent\'),\n  { loading: () => <Skeleton /> }\n);',
      docsUrl: 'https://web.dev/articles/reduce-javascript-payloads-with-code-splitting',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'no-minif',
    recommendation: {
      fix: 'Enable minification for CSS and JavaScript in your build pipeline.',
      codeSnippet: '// next.config.js — already minifies in production\n// For custom setups:\n// npm install terser-webpack-plugin css-minimizer-webpack-plugin',
      docsUrl: 'https://web.dev/articles/reduce-network-payloads-using-text-compression',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'no-compression',
    recommendation: {
      fix: 'Enable gzip or Brotli compression on your server/CDN for text-based assets.',
      codeSnippet: '# Nginx: enable gzip\ngzip on;\ngzip_types text/html text/css application/javascript;\n\n# Vercel/Netlify: compression is automatic\n# Apache: AddOutputFilterByType DEFLATE text/html text/css application/javascript',
      docsUrl: 'https://web.dev/articles/uses-text-compression',
      estimatedImpact: 'high',
    },
  },

  // ── META TAGS ──
  {
    idPrefix: 'missing-title',
    recommendation: {
      fix: 'Add a unique, descriptive <title> tag (50-60 characters). This is the #1 on-page SEO factor.',
      codeSnippet: '<head>\n  <title>Your Page Title — Site Name</title>\n</head>\n\n// Next.js App Router:\nexport const metadata = {\n  title: \'Your Page Title — Site Name\',\n}',
      docsUrl: 'https://web.dev/articles/meta-description',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'missing-description',
    recommendation: {
      fix: 'Add a meta description (120-160 characters). This appears in search engine results and affects click-through rate.',
      codeSnippet: '<head>\n  <meta name="description" content="A concise, compelling summary of your page content in 120-160 characters.">\n</head>',
      docsUrl: 'https://web.dev/articles/meta-description',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'missing-viewport',
    recommendation: {
      fix: 'Add the viewport meta tag for proper mobile rendering.',
      codeSnippet: '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n</head>',
      docsUrl: 'https://web.dev/articles/viewport',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'missing-charset',
    recommendation: {
      fix: 'Add charset declaration as the first element in <head> to prevent encoding issues.',
      codeSnippet: '<head>\n  <meta charset="UTF-8">\n  <!-- Must be first in <head> -->\n</head>',
      estimatedImpact: 'low',
    },
  },
  {
    idPrefix: 'missing-og-',
    recommendation: {
      fix: 'Add Open Graph meta tags for rich social media previews when your page is shared.',
      codeSnippet: '<head>\n  <meta property="og:title" content="Page Title">\n  <meta property="og:description" content="Page description">\n  <meta property="og:image" content="https://example.com/image.jpg">\n  <meta property="og:url" content="https://example.com/page">\n  <meta property="og:type" content="website">\n</head>',
      docsUrl: 'https://ogp.me/',
      estimatedImpact: 'low',
    },
  },
  {
    idPrefix: 'missing-canonical',
    recommendation: {
      fix: 'Add a canonical URL to prevent duplicate content issues in search engines.',
      codeSnippet: '<head>\n  <link rel="canonical" href="https://example.com/your-page">\n</head>',
      docsUrl: 'https://web.dev/articles/canonical',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'missing-lang',
    recommendation: {
      fix: 'Add the lang attribute to the <html> element for accessibility and SEO.',
      codeSnippet: '<html lang="en">\n  <!-- Use the correct BCP 47 language tag -->\n</html>',
      docsUrl: 'https://web.dev/articles/html-has-lang',
      estimatedImpact: 'medium',
    },
  },

  // ── HEADINGS ──
  {
    idPrefix: 'no-h1',
    recommendation: {
      fix: 'Add exactly one <h1> element per page. It should describe the page\'s primary topic.',
      codeSnippet: '<body>\n  <h1>Your Main Page Title</h1>\n  <!-- Only one h1 per page -->\n</body>',
      docsUrl: 'https://web.dev/articles/heading-order',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'multiple-h1',
    recommendation: {
      fix: 'Use only one <h1> per page. Demote additional ones to <h2> or lower.',
      codeSnippet: '<!-- Before -->\n<h1>Main Title</h1>\n<h1>Another Title</h1>\n\n<!-- After -->\n<h1>Main Title</h1>\n<h2>Another Title</h2>',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'heading-skip',
    recommendation: {
      fix: 'Don\'t skip heading levels. Go from h1→h2→h3, not h1→h3. Screen readers use heading hierarchy for navigation.',
      codeSnippet: '<!-- Wrong: skips h2 -->\n<h1>Title</h1>\n<h3>Subtitle</h3>\n\n<!-- Correct -->\n<h1>Title</h1>\n<h2>Subtitle</h2>\n<h3>Sub-subtitle</h3>',
      docsUrl: 'https://web.dev/articles/heading-order',
      estimatedImpact: 'medium',
    },
  },

  // ── SECURITY ──
  {
    idPrefix: 'no-https',
    recommendation: {
      fix: 'Migrate to HTTPS immediately. HTTPS is required for security, SEO ranking, and modern browser APIs.',
      codeSnippet: '# Get a free SSL certificate from Let\'s Encrypt:\nsudo certbot --nginx -d example.com\n\n# Force HTTPS redirect in nginx:\nserver {\n  listen 80;\n  return 301 https://$host$request_uri;\n}',
      docsUrl: 'https://web.dev/articles/why-https-matters',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'missing-header-strict-transport-security',
    recommendation: {
      fix: 'Add HSTS header to force HTTPS connections. Start with a short max-age and increase gradually.',
      codeSnippet: '# Nginx\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n\n# Next.js next.config.js\nheaders: [{ key: \'Strict-Transport-Security\', value: \'max-age=31536000; includeSubDomains\' }]\n\n# Vercel: vercel.json\n{ "headers": [{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }] }',
      docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'missing-header-content-security-policy',
    recommendation: {
      fix: 'Add a Content-Security-Policy header. Start with report-only mode to avoid breaking your site.',
      codeSnippet: '# Start with report-only to test:\nContent-Security-Policy-Report-Only: default-src \'self\'; script-src \'self\' \'unsafe-inline\';\n\n# Then enforce:\nContent-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\';',
      docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'missing-header-x-content-type-options',
    recommendation: {
      fix: 'Add X-Content-Type-Options: nosniff to prevent MIME-type sniffing attacks.',
      codeSnippet: '# Nginx\nadd_header X-Content-Type-Options "nosniff" always;\n\n# Next.js (already set in next.config.js headers)',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'missing-header-x-frame-options',
    recommendation: {
      fix: 'Add X-Frame-Options to prevent clickjacking. Use DENY or SAMEORIGIN.',
      codeSnippet: '# Nginx\nadd_header X-Frame-Options "DENY" always;\n\n# Or allow same-origin framing:\nadd_header X-Frame-Options "SAMEORIGIN" always;',
      docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'missing-header-referrer-policy',
    recommendation: {
      fix: 'Add a Referrer-Policy header to control how much referrer info is sent with requests.',
      codeSnippet: '# Recommended setting:\nadd_header Referrer-Policy "strict-origin-when-cross-origin" always;',
      estimatedImpact: 'low',
    },
  },
  {
    idPrefix: 'missing-header-permissions-policy',
    recommendation: {
      fix: 'Add a Permissions-Policy header to restrict browser features your site doesn\'t use.',
      codeSnippet: '# Restrict unused features:\nadd_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;',
      estimatedImpact: 'low',
    },
  },
  {
    idPrefix: 'mixed-content',
    recommendation: {
      fix: 'Replace all http:// resource URLs with https:// or use protocol-relative URLs.',
      codeSnippet: '<!-- Before -->\n<img src="http://cdn.example.com/photo.jpg">\n<script src="http://cdn.example.com/lib.js"></script>\n\n<!-- After -->\n<img src="https://cdn.example.com/photo.jpg">\n<script src="https://cdn.example.com/lib.js"></script>',
      docsUrl: 'https://web.dev/articles/what-is-mixed-content',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'server-version-exposed',
    recommendation: {
      fix: 'Remove version numbers from the Server header to reduce attack surface.',
      codeSnippet: '# Nginx: hide version\nserver_tokens off;\n\n# Apache: hide version\nServerTokens Prod\nServerSignature Off',
      estimatedImpact: 'low',
    },
  },
  {
    idPrefix: 'x-powered-by-exposed',
    recommendation: {
      fix: 'Remove the X-Powered-By header to hide server technology.',
      codeSnippet: '# Express.js\napp.disable(\'x-powered-by\');\n\n# Next.js (next.config.js)\npoweredByHeader: false\n\n# Nginx\nproxy_hide_header X-Powered-By;',
      estimatedImpact: 'low',
    },
  },

  // ── MOBILE ──
  {
    idPrefix: 'no-viewport',
    recommendation: {
      fix: 'Add the viewport meta tag for proper rendering on mobile devices.',
      codeSnippet: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      docsUrl: 'https://web.dev/articles/viewport',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'small-tap-',
    recommendation: {
      fix: 'Make touch targets at least 48×48 CSS pixels with 8px spacing between them.',
      codeSnippet: '/* Minimum tap target size */\na, button {\n  min-width: 48px;\n  min-height: 48px;\n  padding: 12px;\n}\n\n/* Add spacing between adjacent targets */\n.nav-links a + a {\n  margin-left: 8px;\n}',
      docsUrl: 'https://web.dev/articles/accessible-tap-targets',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'small-font-',
    recommendation: {
      fix: 'Use a minimum font size of 16px for body text on mobile to ensure readability.',
      codeSnippet: 'body {\n  font-size: 16px; /* minimum for mobile */\n  line-height: 1.5;\n}\n\n/* Avoid text too small on mobile */\n@media (max-width: 768px) {\n  body { font-size: 16px; }\n}',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'horizontal-scroll',
    recommendation: {
      fix: 'Prevent horizontal overflow by using max-width: 100% on images and overflow-x: hidden on containers.',
      codeSnippet: '/* Prevent horizontal overflow */\nhtml, body {\n  overflow-x: hidden;\n}\n\nimg, video, iframe {\n  max-width: 100%;\n  height: auto;\n}\n\n/* Use flexible layouts */\n.container {\n  width: 100%;\n  max-width: 1200px;\n  padding: 0 1rem;\n}',
      estimatedImpact: 'high',
    },
  },
  {
    idPrefix: 'fixed-width',
    recommendation: {
      fix: 'Replace fixed-width elements with responsive units (%, vw, rem, flex, grid).',
      codeSnippet: '/* Before */\n.container { width: 960px; }\n\n/* After */\n.container {\n  width: 100%;\n  max-width: 960px;\n  margin: 0 auto;\n}',
      estimatedImpact: 'high',
    },
  },

  // ── ACCESSIBILITY ──
  {
    idPrefix: 'missing-lang',
    recommendation: {
      fix: 'Add lang attribute to <html> element for screen readers and translation services.',
      codeSnippet: '<html lang="en">\n  <!-- Use BCP 47 language code -->\n</html>',
      docsUrl: 'https://web.dev/articles/html-has-lang',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'low-contrast',
    recommendation: {
      fix: 'Ensure text has at least 4.5:1 contrast ratio against its background (3:1 for large text, 18px+ bold or 24px+).',
      codeSnippet: '/* Ensure sufficient contrast */\n.text-on-dark {\n  color: #e2e8f0; /* light text on dark */\n  background: #1a1a2e;\n}\n\n/* Check with Chrome DevTools:\n   Inspect element > Styles > click color swatch > contrast ratio */\n\n/* Tool: https://webaim.org/resources/contrastchecker/ */',
      docsUrl: 'https://web.dev/articles/color-and-contrast-accessibility',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'form-no-label',
    recommendation: {
      fix: 'Associate every form input with a <label> element using the for/id pattern.',
      codeSnippet: '<!-- Explicit association -->\n<label for="email">Email</label>\n<input type="email" id="email" name="email">\n\n<!-- Or wrapping pattern -->\n<label>\n  Email\n  <input type="email" name="email">\n</label>',
      docsUrl: 'https://web.dev/articles/label',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'no-skip-link',
    recommendation: {
      fix: 'Add a "Skip to main content" link as the first focusable element for keyboard users.',
      codeSnippet: '<!-- First element in <body> -->\n<a href="#main-content" class="skip-link">\n  Skip to main content\n</a>\n\n<main id="main-content">\n  <!-- page content -->\n</main>\n\n<style>\n.skip-link {\n  position: absolute;\n  top: -40px;\n  left: 0;\n  padding: 8px 16px;\n  background: #000;\n  color: #fff;\n  z-index: 100;\n}\n.skip-link:focus {\n  top: 0;\n}\n</style>',
      docsUrl: 'https://web.dev/articles/skip-navigation-links',
      estimatedImpact: 'low',
    },
  },
  {
    idPrefix: 'btn-no-accessible-name',
    recommendation: {
      fix: 'Add accessible text to buttons using visible text, aria-label, or aria-labelledby.',
      codeSnippet: '<!-- Text content acts as accessible name -->\n<button>Submit Form</button>\n\n<!-- Icon-only button: use aria-label -->\n<button aria-label="Close dialog">\n  <svg>...</svg>\n</button>',
      estimatedImpact: 'medium',
    },
  },
  {
    idPrefix: 'link-no-accessible-name',
    recommendation: {
      fix: 'Add descriptive text to links. Avoid "click here" — describe the destination.',
      codeSnippet: '<!-- Bad -->\n<a href="/docs">Click here</a>\n\n<!-- Good -->\n<a href="/docs">Read the documentation</a>\n\n<!-- Icon-only link -->\n<a href="/home" aria-label="Go to homepage">\n  <svg>...</svg>\n</a>',
      estimatedImpact: 'medium',
    },
  },
]

// ═══════════════════════════════════════════════
// LIGHTHOUSE OPPORTUNITY FIX SUGGESTIONS
// ═══════════════════════════════════════════════

export interface OpportunityFix {
  fix: string
  codeSnippet?: string
  docsUrl?: string
}

const OPPORTUNITY_FIXES: Record<string, OpportunityFix> = {
  'render-blocking-resources': {
    fix: 'Defer non-critical CSS/JS. Inline critical CSS. Use async/defer on scripts.',
    codeSnippet: '<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n<script src="app.js" defer></script>',
    docsUrl: 'https://web.dev/articles/render-blocking-resources',
  },
  'uses-optimized-images': {
    fix: 'Compress images using tools like Squoosh, Sharp, or ImageOptim. Target 85% quality.',
    codeSnippet: '# Using Sharp (Node.js)\nnpx sharp-cli --input photo.jpg --output photo-opt.jpg --quality 85',
    docsUrl: 'https://web.dev/articles/uses-optimized-images',
  },
  'uses-webp-images': {
    fix: 'Serve images in WebP/AVIF format using <picture> element for backward compatibility.',
    codeSnippet: '<picture>\n  <source srcset="img.avif" type="image/avif">\n  <source srcset="img.webp" type="image/webp">\n  <img src="img.jpg" alt="Description">\n</picture>',
    docsUrl: 'https://web.dev/articles/uses-webp-images',
  },
  'uses-text-compression': {
    fix: 'Enable Brotli or gzip compression for text-based responses (HTML, CSS, JS, SVG, JSON).',
    codeSnippet: '# Nginx: enable Brotli\nbrotli on;\nbrotli_types text/html text/css application/javascript application/json image/svg+xml;',
    docsUrl: 'https://web.dev/articles/uses-text-compression',
  },
  'uses-long-cache-ttl': {
    fix: 'Set long Cache-Control headers for static assets with content hashing in filenames.',
    codeSnippet: '# Static assets with hash in filename:\nCache-Control: public, max-age=31536000, immutable\n\n# HTML pages:\nCache-Control: no-cache',
    docsUrl: 'https://web.dev/articles/uses-long-cache-ttl',
  },
  'unused-javascript': {
    fix: 'Remove unused JavaScript with tree-shaking, code splitting, and dynamic imports.',
    codeSnippet: '// Dynamic import — only loads when needed\nconst Chart = dynamic(() => import(\'./Chart\'), {\n  loading: () => <Skeleton />,\n  ssr: false,\n});',
    docsUrl: 'https://web.dev/articles/unused-javascript',
  },
  'unused-css-rules': {
    fix: 'Remove unused CSS using PurgeCSS or Tailwind\'s content purging. Split critical CSS.',
    codeSnippet: '// tailwind.config.js\nmodule.exports = {\n  content: [\'./src/**/*.{js,ts,jsx,tsx}\'],\n  // Tailwind automatically purges unused styles in production\n}',
    docsUrl: 'https://web.dev/articles/unused-css-rules',
  },
  'dom-size': {
    fix: 'Reduce DOM nodes by removing unnecessary wrappers, using virtualization for long lists, and lazy-loading sections.',
    codeSnippet: '// Virtualize long lists with react-window\nimport { FixedSizeList } from \'react-window\';\n\n<FixedSizeList height={600} itemCount={1000} itemSize={50}>\n  {({ index, style }) => <Row key={index} style={style} />}\n</FixedSizeList>',
    docsUrl: 'https://web.dev/articles/dom-size',
  },
  'bootup-time': {
    fix: 'Reduce JS execution time by code splitting, tree shaking, and deferring non-critical scripts.',
    docsUrl: 'https://web.dev/articles/bootup-time',
  },
  'mainthread-work-breakdown': {
    fix: 'Minimize main thread work by breaking long tasks, deferring heavy computation to Web Workers.',
    codeSnippet: '// Break long tasks with scheduler.yield()\nasync function processItems(items) {\n  for (const item of items) {\n    processItem(item);\n    // Yield to main thread periodically\n    if (navigator.scheduling?.isInputPending()) {\n      await scheduler.yield();\n    }\n  }\n}',
    docsUrl: 'https://web.dev/articles/long-tasks-devtools',
  },
  'uses-rel-preload': {
    fix: 'Preload critical resources (fonts, hero images, key CSS) that are discovered late in the waterfall.',
    codeSnippet: '<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/hero.webp" as="image">',
    docsUrl: 'https://web.dev/articles/uses-rel-preload',
  },
  'uses-rel-preconnect': {
    fix: 'Preconnect to required third-party origins to save DNS + TCP + TLS setup time.',
    codeSnippet: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://cdn.example.com" crossorigin>',
    docsUrl: 'https://web.dev/articles/uses-rel-preconnect',
  },
  'font-display': {
    fix: 'Use font-display: swap to show fallback text immediately while web fonts load.',
    codeSnippet: '@font-face {\n  font-family: \'Inter\';\n  src: url(\'/fonts/Inter.woff2\') format(\'woff2\');\n  font-display: swap;\n}\n\n/* Google Fonts: add &display=swap parameter */\n<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">',
    docsUrl: 'https://web.dev/articles/font-display',
  },
  'efficient-animated-content': {
    fix: 'Replace GIF animations with video formats (MP4/WebM) for 80%+ smaller file sizes.',
    codeSnippet: '<video autoplay loop muted playsinline>\n  <source src="animation.webm" type="video/webm">\n  <source src="animation.mp4" type="video/mp4">\n</video>',
    docsUrl: 'https://web.dev/articles/replace-gifs-with-videos',
  },
  'uses-passive-event-listeners': {
    fix: 'Use passive event listeners for touch/wheel events to improve scroll performance.',
    codeSnippet: '// Before\nel.addEventListener(\'touchstart\', handler);\n\n// After: passive\nel.addEventListener(\'touchstart\', handler, { passive: true });',
    docsUrl: 'https://web.dev/articles/uses-passive-event-listeners',
  },
  'no-document-write': {
    fix: 'Replace document.write() with DOM manipulation methods (appendChild, insertAdjacentHTML).',
    codeSnippet: '// Before\ndocument.write(\'<script src="lib.js"></script>\');\n\n// After\nconst s = document.createElement(\'script\');\ns.src = \'lib.js\';\ndocument.head.appendChild(s);',
  },
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Look up a recommendation for a finding based on its ID prefix.
 */
export function getRecommendation(finding: AuditFinding): Recommendation | undefined {
  for (const rule of RECOMMENDATION_RULES) {
    if (finding.id.startsWith(rule.idPrefix)) {
      return rule.recommendation
    }
  }
  return undefined
}

/**
 * Estimate score uplift if a single finding is fixed.
 * Based on: severity weight × category weight, proportional to current score deficit.
 */
export function calculateFindingUplift(
  finding: AuditFinding,
  category: CategoryResult
): number {
  const sevWeight = SEVERITY_IMPACT[finding.severity] ?? 0
  const catWeight = CATEGORY_WEIGHT[category.category] ?? 1.0
  const totalFindings = category.findings.length

  if (totalFindings === 0 || sevWeight === 0) return 0

  // The score deficit that could be recovered
  const deficit = 100 - category.score

  // This finding's share of the deficit, weighted by severity
  const totalSeverityWeight = category.findings.reduce(
    (sum, f) => sum + (SEVERITY_IMPACT[f.severity] ?? 0), 0
  )

  if (totalSeverityWeight === 0) return 0

  const findingShare = sevWeight / totalSeverityWeight
  const rawUplift = deficit * findingShare * catWeight

  // Scale to overall health score contribution (custom audit = 40% of health)
  // Each category has ~12.5% weight (1/8 categories)
  const healthUplift = rawUplift * 0.4 * (catWeight / 7.7)

  return Math.min(Math.round(healthUplift * 10) / 10, 15) // cap at 15 points
}

/**
 * Enrich all findings in category results with recommendations and uplift estimates.
 */
export function enrichWithRecommendations(categories: CategoryResult[]): CategoryResult[] {
  return categories.map(cat => ({
    ...cat,
    findings: cat.findings.map(finding => {
      const recommendation = getRecommendation(finding)
      const estimatedUplift = calculateFindingUplift(finding, cat)
      return {
        ...finding,
        ...(recommendation ? { recommendation } : {}),
        ...(estimatedUplift > 0 ? { estimatedUplift } : {}),
      }
    }),
  }))
}

/**
 * Get fix suggestion for a Lighthouse opportunity by its ID.
 */
export function getOpportunityFix(opportunityId: string): OpportunityFix | undefined {
  return OPPORTUNITY_FIXES[opportunityId]
}
