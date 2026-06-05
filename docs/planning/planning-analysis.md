# VitalFix Implementation & Planning Strategy

## 5. Prioritized Implementation Backlog

### Sprint 1: Reliability & Tech Debt Closure (High Priority)
*   **Ticket 1.1**: Migrate `/api/audit/full/route.ts` rate limiting from in-memory `Map` to Redis (Upstash) to support distributed Vercel edge functions.
*   **Ticket 1.2**: Implement a resilient queuing system (Redis or Inngest) for long-running audit jobs to avoid Vercel's 180s synchronous timeout limit.
*   **Ticket 1.3**: Set up pre-aggregation materialized views or cron jobs for `rum_events` to optimize the `/api/rum/summary` endpoint for high traffic.

### Sprint 2: Intelligence Engine Expansion (Medium Priority)
*   **Ticket 2.1**: Add specific version detection logic (e.g., Next.js App vs Pages router, React 18 vs 19) in `framework-detector.ts`.
*   **Ticket 2.2**: Expand `business-impact-engine.ts` to include e-commerce specific revenue loss calculations based on latency increments.
*   **Ticket 2.3**: Map remaining raw PSI audit categories (SEO, Best Practices) into the Intelligence tab's "Fix Next" framework.

### Sprint 3: Advanced Diagnostics (Low Priority)
*   **Ticket 3.1**: Integrate Playwright/Browserless to allow authenticated route auditing (bypassing logins).
*   **Ticket 3.2**: Add continuous monitoring scheduling (daily/weekly automated audits) linked to user accounts.

---

## 6. Testing Strategy

### 1. Unit Testing (Current Focus)
*   **Framework**: Vitest (Currently 128 tests passing).
*   **Target**: Pure functions within `src/lib/intelligence` and `src/lib/audit-engine`.
*   **Requirement**: Maintain 100% pass rate. Ensure all new framework detectors and score algorithms have edge-case coverage.

### 2. Integration Testing
*   **Target**: API routes (`/api/audit/full`, `/api/rum/collect`).
*   **Approach**: Mock external APIs (Google PSI, Supabase) to test request validation, rate limiting, and error formatting without hitting real quotas.

### 3. End-to-End (E2E) Testing
*   **Framework**: Playwright (`e2e/app.spec.ts`).
*   **Target**: Critical User Journeys (CUJ).
*   **Flows**:
    1. User submits a URL → Audit runs → Intelligence Dashboard renders correct tiers.
    2. RUM script `vf.js` correctly beacons payload under simulated slow network conditions.

---

## 7. Production Readiness Checklist

**Infrastructure & Limits**
- [ ] Redis (Upstash) provisioned for global rate limiting.
- [ ] Supabase Database indexed optimized for `rum_events` (specifically time-series lookups by `site_id` and `created_at`).
- [ ] Vercel Function timeouts configured correctly for non-premium users.

**Monitoring & Alerting**
- [ ] Sentry environment configured (`production`) with source maps uploaded.
- [ ] Alerting rules set up for PSI 429 Exhaustion or timeout spikes.
- [ ] PostHog feature flags configured for gradual rollout of the Intelligence Dashboard.

**Security**
- [ ] SSRF protections verified against local network bypasses in the audit endpoint.
- [ ] RLS (Row Level Security) policies thoroughly tested on `rum_sites` and `rum_events` to prevent cross-tenant data leaks.
- [ ] Environment variables audited (ensure no `NEXT_PUBLIC_` secrets are exposed).

**User Experience**
- [ ] Fallback UI gracefully handles partial audit failures (e.g., PSI fails but Custom Audit succeeds).
- [ ] RUM installation documentation is clear, accurate, and easily accessible from the dashboard.
