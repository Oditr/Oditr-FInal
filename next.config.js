const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Prevent caching API responses at CDN/browser level
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },

  // Increase serverless function timeout for audit route (Vercel Pro: up to 300s)
  // Default Vercel timeout is 10s — our audit needs up to 45s
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Compress responses
  compress: true,

  // Disable x-powered-by header (security)
  poweredByHeader: false,
}

// Only wrap with Sentry webpack plugin in production.
// In dev, the Sentry plugin instruments every module at compile time,
// adding 30-90s overhead per page load — completely unnecessary since
// Sentry is disabled at runtime in dev anyway.
const finalConfig = process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG || "___ORG_SLUG___",
      project: process.env.SENTRY_PROJECT || "javascript-nextjs",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      silent: !process.env.CI,
    })
  : nextConfig

module.exports = finalConfig

