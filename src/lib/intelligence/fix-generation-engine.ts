import type { CodeSnippet, Framework } from './types'

export function generateFixSnippet(issueId: string, framework: Framework): CodeSnippet | undefined {
  if (framework === 'nextjs') {
    if (issueId.startsWith('img-large') || issueId.startsWith('uses-optimized-images') || issueId.startsWith('uses-webp-images')) {
      return {
        language: 'tsx',
        code: `import Image from 'next/image'

export default function Hero() {
  return (
    <Image 
      src="/hero-image.jpg" 
      alt="Hero description"
      width={1200}
      height={600}
      priority // Add this for above-the-fold images
      sizes="(max-width: 768px) 100vw, 1200px"
    />
  )
}`,
        description: 'Replace standard <img> tags with next/image for automatic WebP/AVIF conversion, resizing, and caching.'
      }
    }
    
    if (issueId.startsWith('render-blocking-css')) {
      return {
        language: 'css',
        code: `/* Instead of a global import, use CSS Modules */
/* styles/Hero.module.css */
.hero {
  background: var(--bg);
}

// Hero.tsx
import styles from './Hero.module.css'

export default function Hero() {
  return <div className={styles.hero}>...</div>
}`,
        description: 'Use CSS Modules to scope CSS to the component and only load it when the component is rendered.'
      }
    }
    
    if (issueId.startsWith('font-display')) {
      return {
        language: 'tsx',
        code: `import { Inter } from 'next/font/google'

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // This prevents the invisible text issue
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}`,
        description: 'Use next/font to automatically handle font optimization and prevent layout shifts.'
      }
    }

    if (issueId.startsWith('missing-header-strict-transport-security') || issueId.startsWith('missing-header-content-security-policy')) {
      return {
        language: 'javascript',
        code: `// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
          }
        ]
      }
    ]
  }
}`,
        description: 'Add security headers via next.config.js to protect your site.'
      }
    }

    // SEO
    if (issueId.startsWith('document-title') || issueId.startsWith('meta-description')) {
      return {
        language: 'tsx',
        code: `import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Descriptive Page Title',
  description: 'A compelling meta description between 150-160 characters summarizing the page content.',
}`,
        description: 'Export a Metadata object from your layout.tsx or page.tsx to automatically generate proper title and meta description tags.'
      }
    }
  }

  if (framework === 'react') {
    if (issueId.startsWith('unused-javascript')) {
      return {
        language: 'jsx',
        code: `import React, { Suspense, lazy } from 'react';

// Lazy load the heavy component
const HeavyWidget = lazy(() => import('./HeavyWidget'));

export default function App() {
  return (
    <div>
      <h1>Main Content</h1>
      <Suspense fallback={<div>Loading widget...</div>}>
        <HeavyWidget />
      </Suspense>
    </div>
  );
}`,
        description: 'Use React.lazy and Suspense to split your bundle and load heavy components only when needed.'
      }
    }
  }
  
  if (framework === 'wordpress') {
    if (issueId.startsWith('uses-long-cache-ttl')) {
      return {
        language: 'apache',
        code: `# Add to your .htaccess file
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType text/html "access plus 600 seconds"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>`,
        description: 'Set Cache-Control headers via .htaccess to instruct the browser to cache static assets.'
      }
    }
  }

  // Fallback snippets for generic web
  if (issueId.startsWith('img-large') || issueId.startsWith('img-no-dims')) {
    return {
      language: 'html',
      code: `<img 
  src="image.jpg" 
  width="800" 
  height="600" 
  alt="Descriptive text" 
  loading="lazy" 
  decoding="async" 
/>`,
      description: 'Always include width and height to prevent layout shifts. Use loading="lazy" for below-the-fold images.'
    }
  }
  
  if (issueId.startsWith('font-display')) {
    return {
      language: 'css',
      code: `@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap; /* Add this line */
}`,
      description: 'Add font-display: swap to your @font-face declarations.'
    }
  }

  // Generic SEO & Best Practices
  if (issueId.startsWith('image-alt')) {
    return {
      language: 'html',
      code: `<img src="image.jpg" alt="Description of the image content" />`,
      description: 'Add an alt attribute to all images to improve accessibility and SEO.'
    }
  }

  if (issueId.startsWith('link-text')) {
    return {
      language: 'html',
      code: `<a href="/about">Learn more about our company</a>`,
      description: 'Use descriptive link text instead of "click here" or "learn more".'
    }
  }

  return undefined
}
