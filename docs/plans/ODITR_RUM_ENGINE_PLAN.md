# Øditr Real User Monitoring (RUM) Engine — Implementation Plan

## 1. Current Backend Structure
- Built on Next.js 15 App Router.
- Supabase used for PostgreSQL data persistence and Auth.
- Existing core logical services organized in `src/lib/audit-engine/` (Core Audit, AI Readiness) and `src/lib/monitoring/` (Monitoring & Regression).
- Existing analytics (`src/lib/analytics.ts`) tracks standard product usage via PostHog, but we need a distinct structure specifically for the RUM product that customers will embed.

## 2. Current Frontend Structure
- React 19 UI with Tailwind CSS.
- Dashboard under `src/app/dashboard/` and monitoring components under `src/app/monitoring/[projectId]/`.
- No existing UI for real user data—currently only lab-based snapshot data (Lighthouse) is presented.

## 3. Current Project/Report Model
- Recently added `MonitoredProject` model (`projects` table) to group audits by website.
- RUM data will map directly to this existing `projects` table using the `projectId`.

## 4. Existing Analytics or Tracking Code
- `src/hooks/useAnalytics.ts` tracks internal usage (client-side event tracking).
- This is strictly internal; RUM will require an entirely separate ingestion path, isolated from internal product analytics.

## 5. Existing Database/Storage Setup
- Supabase (PostgreSQL).
- Tables: `projects`, `audit_reports`, `regression_reports`.
- Needs new RUM-specific tables designed to handle high write volume.

## 6. Existing Core Web Vitals Handling
- Currently parsed statically via Google PageSpeed Insights API in `audit-engine/types.ts` & `monitoring/vitals-diff-service.ts`.
- Values are handled as raw numbers (ms or decimal) and classified against fixed thresholds. RUM will reuse these exact thresholds.

## 7. Where RUM Should Connect
- **Ingestion**: A new edge-friendly POST endpoint to receive beacons.
- **Reporting**: New tabs/components inside the `src/app/monitoring/[projectId]/` dashboard.
- **Revenue Impact**: RUM field data will ultimately be queried to replace assumptions in the Revenue Engine (e.g., using actual mobile poor INP percentage).
- **Monitoring Engine**: RUM regressions over time will feed into the Regression Report.

## 8. Backend Modules Required
Location: `src/lib/rum/`
- `types.ts`: Define `RumEvent`, `RumProjectConfig`, etc.
- `ingestion-service.ts`: Validates project IDs, applies sample rates, handles rate-limiting, and queues/inserts events.
- `aggregation-service.ts`: Computes p75 metrics for Vitals over specified time ranges.
- `project-config-service.ts`: Retrieves/caches allowed domains and sampling rules.

## 9. Frontend/Dashboard Components Required
Location: `src/components/rum/` and `src/app/monitoring/[projectId]/rum/`
- `RumSetupGuide.tsx`: Copy-paste script UI and verification status.
- `RumVitalsSummary.tsx`: Top-level p75 stats for LCP, CLS, INP.
- `RumPageTable.tsx`: Worst performing pages based on field data.
- `RumDeviceBreakdown.tsx`: Desktop vs Mobile breakdown.
- `RumTrendChart.tsx`: Time-series chart for field vitals.

## 10. Public Tracking Script Requirements
Location: `public/rum/oditr.js`
- Extremely lightweight (no large libraries like React).
- Reads `data-project-id` from the script tag.
- Uses `web-vitals` library logic (minified directly into the script) to capture LCP, CLS, INP, FCP, TTFB.
- Uses `navigator.sendBeacon` to dispatch events to `/api/rum/collect` on visibility change or page unload.
- Fails silently. Never blocks the main thread.

## 11. Privacy/Security Risks
- **Privacy**: The script must never capture DOM contents, input values, PII, or explicit IP addresses. We will only store derived coarse metrics (Device type, OS, Browser, performance timing).
- **Security**: The ingestion endpoint must validate CORS origins using the `projects` table `normalized_domain` to prevent malicious actors from spamming another customer's Project ID.

## 12. Data-Volume Risks
- High traffic websites can overload a standard Postgres database if inserting row-by-row synchronously.
- **Mitigation**: 
  1. Rely on Supabase's high throughput capabilities for the MVP.
  2. Implement aggressive rate limiting per IP in the ingestion route.
  3. Introduce a sampling rate (e.g., 10%) configurable per project.
  4. Optionally implement a short-lived memory queue (or Vercel KV) before batch inserting, or just rely on Vercel's fast execution with standard inserts for now.

## 13. Safe Implementation Order
1. **Database Schema**: Add `rum_configs` and `rum_events` tables to Supabase.
2. **Backend Types & Config**: Build `types.ts` and `project-config-service.ts`.
3. **Ingestion Route**: Build `/api/rum/collect` with strict CORS/domain validation.
4. **Public Script**: Author and minify the tracking script in `/public/rum/oditr.js`.
5. **Aggregation Service**: Build queries to calculate p75 and group by pages.
6. **Frontend UI**: Build the Setup Guide and Dashboard components.
7. **Integration**: Tie RUM data into the Revenue Impact Engine's assumption model.
