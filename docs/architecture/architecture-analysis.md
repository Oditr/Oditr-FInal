# Øditr Architecture Overview

## 1. Architecture Overview
Øditr is built as a highly scalable Next.js 15 (App Router) application. The architecture has evolved from a simple audit-reporting tool into an intelligent website performance decision engine.

### Core Stack
*   **Framework**: Next.js 15 (App Router, React Server Components)
*   **Database & Auth**: Supabase (PostgreSQL + Auth + RLS)
*   **Styling**: Tailwind CSS
*   **Payments**: Stripe
*   **Analytics & Monitoring**: PostHog (Events/Feature Flags) + Sentry (Error Tracking)

### System Layers
1.  **Diagnostic Layer**: 
    *   **PSI Pool (`src/lib/psi-pool.ts`)**: Manages rotated Google PageSpeed API keys for Lighthouse data.
    *   **Custom Audit Engine (`src/lib/audit-engine`)**: Cheerio-based static HTML parser for fast, supplementary checks (broken links, meta tags).
    *   **RUM (Real User Monitoring)**: Custom `vf.js` script collects zero-PII performance telemetry from client browsers.
2.  **Intelligence Layer (`src/lib/intelligence`)**:
    *   Transforms raw diagnostic data into actionable insights.
    *   Applies 4-factor prioritization (Fix First, Fix Next).
    *   Detects frameworks (Next.js, WordPress, etc.) to provide context-aware solutions.
3.  **Presentation Layer**:
    *   React-based dashboard where the **Intelligence Tab** is the primary user interface, abstracting away raw Lighthouse metrics.

---

## 2. Current Technical Debt
*   **In-Memory Rate Limiting**: The `/api/audit/full/route.ts` uses a JavaScript `Map` for rate limiting. This fails in serverless environments across multiple edge instances. Needs migration to a distributed store (e.g., Redis).
*   **Static HTML Parsing**: The custom audit engine uses `cheerio`. While fast, it misses client-side rendered (CSR) issues that a full headless browser would catch.
*   **Synchronous Processing**: Heavy audits run synchronously within the Vercel 180s max duration limit. This risks timeouts for large sites.
*   **RUM Aggregation on Read**: Aggregating `rum_events` currently happens dynamically. For high-traffic sites, this will cause database strain. Needs pre-aggregated materialized views or cron workers.

---

## 3. Missing Environment Variables
To address technical debt and finalize the architecture, the following environment variables need to be introduced:

*   `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Required for implementing global rate limiting and a dead-letter queue for RUM beacons.
*   `CRON_SECRET_KEY`: To secure background endpoints (e.g., daily RUM aggregation) from unauthorized access.
*   `PUPPETEER_ENDPOINT` (Optional Future): If migrating from Cheerio to headless browser APIs (e.g., Browserless.io).

---

## 4. Lighthouse → PageSpeed API Migration Plan
*Note: Øditr already utilizes the PageSpeed Insights API (PSI) for backend collection. This migration plan details the architectural shift of moving the **user experience** away from raw Lighthouse scores to the Intelligence Engine.*

### Phase 1: Abstraction (Completed)
*   Create the `IntelligenceEngine` to wrap raw PSI data.
*   Make the Intelligence Tab the default landing view.

### Phase 2: Deprecation of Raw Metrics (Next)
*   Remove direct references to "Lighthouse" in the user interface.
*   Replace standard 0-100 Lighthouse gauges with Business Impact & UX Confidence scores.
*   Map all remaining underlying Lighthouse Audit IDs to framework-specific playbooks in the DB.

### Phase 3: Decoupling (Future)
*   Abstract the PSI data ingestion so that if Google PageSpeed API fails or rate-limits, the system gracefully falls back strictly to Custom Audits + RUM data without breaking the report generation.
