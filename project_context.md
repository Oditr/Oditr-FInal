# VitalFix - Project Context & Architecture Summary

This document provides a comprehensive overview of the **VitalFix** codebase to help AI assistants (like ChatGPT) understand the project's purpose, tech stack, architecture, and configuration.

## 1. Product Overview
- **Name:** VitalFix
- **One-liner:** Web performance intelligence platform — audit, fix, and monitor Core Web Vitals from a single dashboard.
- **Type:** SaaS Web App + REST API
- **Problem Solved:** Providing developers with a single tool combining Lighthouse scores, CrUX field data, and actionable copy-paste code fixes.

## 2. Tech Stack & Dependencies
This project is built using modern JavaScript/TypeScript tooling. Here are the core technologies based on `package.json`:

- **Framework:** Next.js 15 (App Router)
- **Frontend Library:** React 19 / React DOM 19
- **Styling:** Tailwind CSS 3.4 (with Vanilla CSS for micro-animations/glassmorphism)
- **Database & Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Payments:** Stripe (`stripe` SDK)
- **Monitoring & Analytics:** 
  - Sentry (`@sentry/nextjs`) for error tracking
  - PostHog (`posthog-js`, `posthog-node`) for product analytics
- **Testing:** 
  - Vitest / React Testing Library (Unit tests)
  - Playwright (E2E tests)
- **Core Features/Utilities:**
  - Cheerio: Server-side DOM manipulation for custom site audits.
  - jsPDF: Client-side PDF report generation.
  - Bottleneck: Rate limiting for the API/Lighthouse requests.
  - Motion (Framer Motion equivalent): For UI animations.
  - Lucide React: Icons.

## 3. Project Directory Structure
The workspace follows the standard Next.js 15 structure:

```
prozect/
├── .github/          # GitHub Actions / workflows
├── e2e/              # Playwright End-to-End tests
├── scripts/          # Utility scripts
├── src/
│   ├── app/          # Next.js 15 App Router pages and API routes
│   ├── components/   # Reusable React components
│   ├── data/         # Data fetching, models, constants
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utilities, external service wrappers (Stripe, Supabase, Plans)
├── supabase/         # Supabase migrations, seed data, configuration
├── .env.local        # Environment variables
├── next.config.js    # Next.js configuration (includes security headers, Sentry integration)
├── tailwind.config.js # Tailwind theme configuration (custom colors, animations)
├── package.json      # Dependencies and scripts
└── prd.md            # Product Requirements Document
```

## 4. Key Configurations

### Next.js (`next.config.js`)
- **Security Headers:** Strict headers applied (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy).
- **Caching:** API routes (`/api/*`) are set to `no-store, no-cache, must-revalidate` to prevent CDN/browser caching of audit results.
- **Timeouts:** Uses `experimental.serverActions.bodySizeLimit` and targets Vercel Pro extended timeouts for the audit route (up to 45s execution time).
- **Sentry:** `withSentryConfig` wraps the production build, with a tunnel route `/monitoring`. It is intentionally disabled in development to prevent 30-90s compile overhead.

### Tailwind CSS (`tailwind.config.js`)
- **Dark Mode:** Enabled via `class`.
- **Custom Theme:**
  - Font: Inter (sans) and JetBrains Mono (mono).
  - Colors: Brand palette (blue shades), neon (`#22d3ee`), accent (`#a855f7`), success, warning, and danger.
  - Backgrounds: Custom radial gradients (`hero-mesh`, `card-glow`) for the glassmorphism aesthetic.
  - Animations: Custom keyframes for `gradient-x`, `float`, and `pulse-slow`.

## 5. System Architecture & Features

### The Audit Engine
1. **Lighthouse Engine:** Uses the Google PageSpeed Insights (PSI) API via a key pool (round-robin) to fetch scores. Supports graceful degradation (lite mode fallback on timeout) and blocks SSRF (localhost/private IPs).
2. **Custom Site Audit (8-Module):** Server-side HTML parsing via Cheerio to check broken links, images, assets, meta-tags, headings, security, mobile readiness, and accessibility.

### The SaaS Tier System
Configured centrally in `src/lib/plans.ts`.
- **Free:** 5 audits/day, 7-day history.
- **Starter ($5/mo):** PDF/CSV export, 90-day history.
- **Pro ($19/mo):** API Access (Bearer tokens, rate-limited via headers), unlimited history.
- **Enterprise:** Custom limits, white-labeling.

### API & Rate Limiting
- REST API is available for Pro+ users under `/api/v1/audit`.
- Follows strict rate limiting using standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`).
- Authentication uses a custom `vf_` prefixed 24-byte base64url Bearer token.

## 6. Development Scripts
- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the production application.
- `npm run lint`: Runs ESLint.
- `npm run type-check`: Runs TypeScript compiler (`tsc --noEmit`).
- `npm run test`: Runs Vitest test suite.
- `npm run test:e2e`: Runs Playwright test suite.
