# 🧾 Product Requirements Document (PRD) — VitalFix

## 1. Product Overview
**Name:** VitalFix  
**One-liner:** Web performance intelligence platform — audit, fix, and monitor Core Web Vitals from a single dashboard.  
**Type:** SaaS Web App + REST API  
**Stack:** Next.js 14 · Supabase · Stripe · Google PSI + CrUX  

---

## 2. Problem Statement
- Developers lack a single tool that combines Lighthouse scores, CrUX field data, and actionable code fixes.
- Existing tools (PageSpeed Insights, GTmetrix) show problems but don't provide copy-paste solutions.
- No affordable option exists between free one-off tools and enterprise APM suites ($300+/mo).

---

## 3. Goals & Success Metrics

### Goals
- One-stop performance dashboard for individual developers and small teams.
- Actionable output: every finding links to a code snippet or fix.
- 4-tier SaaS monetization (Free → Starter → Pro → Enterprise).

### Metrics
- Free → Starter conversion: >5%
- Audit completion rate: >80%
- p95 audit response time: <30s
- Monthly churn (paid): <8%

---

## 4. Target Users

| Persona | Needs | Tier |
|---------|-------|------|
| **Indie Dev** | Quick audit, copy-paste fixes, free | Free |
| **Freelancer** | Client reports (PDF), history, export | Starter ($5/mo) |
| **Dev Team Lead** | API integration, CI/CD, monitoring, budgets | Pro ($19/mo) |
| **Agency / Enterprise** | Multi-site, team seats, white-label, SLA | Enterprise (custom) |

---

## 5. Core Features

### Feature: Lighthouse Audit Engine
- Inputs: URL, strategy (mobile/desktop), connection profile, location
- Outputs: 4 Lighthouse scores, 7 CWV metrics, opportunities, diagnostics
- Logic: PSI API key pool (round-robin + exhaustion cooldown), parallel custom audit
- Edge cases: timeout fallback (lite mode), SSRF protection, rate limiting (5 req/60s per IP)

### Feature: 8-Module Custom Site Audit
- Inputs: URL (fetched server-side via cheerio)
- Outputs: per-category score, findings with severity, actionable recommendations
- Modules: broken-links, images, assets, meta-tags, headings, security, mobile, accessibility
- Logic: weighted category scoring, enriched recommendations with estimated uplift

### Feature: Health Score
- Logic: `Lighthouse Performance × 0.6 + Custom Audit Score × 0.4`
- Range: 0–100, color-coded (green ≥90, yellow ≥50, red <50)

### Feature: Scan History + Trends
- Storage: localStorage (guest) + Supabase (authenticated)
- Per-URL sparklines when ≥2 scans exist
- Compare: side-by-side diff between any two scans
- Retention: Free=7 days, Starter=90 days, Pro=unlimited, Enterprise=2 years

### Feature: Export Engine
- JSON: all tiers
- CSV: Starter+ (gated with lock icon for Free)
- PDF: Starter+ (jsPDF, branded dark-theme A4 report)
  - Contents: health score, 4 Lighthouse boxes, CWV table, opportunities, site audit breakdown

### Feature: REST API (Pro+)
- Auth: Bearer token (`vf_` prefix, 24-byte base64url)
- Endpoints: `POST /api/v1/audit`, `GET /api/v1/audit` (usage), `POST/DELETE /api/v1/key`
- Rate limits: Pro=1,000 req/day, Enterprise=10,000 req/day
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Used`, `X-RateLimit-Remaining`
- SSRF protection mirrors internal audit route

### Feature: 4-Tier Plan System
- Config: `src/lib/plans.ts` — single source of truth for all quotas
- Quota enforcement: `checkQuota()` in API routes, `useAuth()` in client
- Stripe checkout: `POST /api/stripe/checkout`, webhook updates `profiles.plan`

### Feature: Shareable Reports
- `POST /api/report/create` → generates public URL with audit snapshot
- Free=3/month, Starter+=unlimited

### Feature: Analytics Dashboard
- `POST /api/analytics` — batch event tracking
- `GET /api/analytics/summary` — aggregated metrics
- Live stats: `GET /api/stats/live`

### Feature: Growth Engine
- Lead capture modal (email gate after 2nd audit)
- Exit intent modal
- Social proof toast
- Audit reminder (re-engagement)

---

## 6. User Flow
1. User lands on homepage → sees value prop + metric pills
2. Clicks "Audit Your Site Free" → `/dashboard`
3. Enters URL → selects strategy/connection/location → runs audit
4. Results render: Overview → Opportunities → Diagnostics → Field Data → Site Audit tabs
5. Scan auto-saved to History tab (sparklines, compare, export)
6. After 2 audits: lead capture prompt → sign-up → plan upgrade path
7. Paid users: PDF export, CSV export, API key generation

---

## 7. Functional Requirements
- Audits must run Lighthouse + custom engine in parallel (Promise.allSettled)
- PSI failures must not crash the audit — degrade gracefully (partial/lite mode)
- All API routes must validate input and return structured errors
- Quota checks must happen before any expensive work
- Daily counters auto-reset at midnight UTC
- API keys are one-time display — only last 4 chars shown after creation

---

## 8. Non-Functional Requirements
- **Performance:** audit API <30s p95, dashboard <2s FCP
- **Security:** SSRF blocklist, RLS on all Supabase tables, input sanitization, no eval()
- **Scalability:** serverless (Vercel), stateless API, PSI key pool handles burst
- **Availability:** Vercel Edge + Supabase managed — target 99.9%

---

## 9. Data Model

### Entities
- **profiles** — plan, stripe IDs, daily counters, API key
- **analytics_events** — event tracking (page views, features, errors)
- **daily_counters** — per-day aggregated metrics
- **reports** — shareable audit snapshots
- **leads** — email captures
- **digests** — scheduled email digests (future)

### Relationships
- User (auth.users) → has one → Profile
- Profile → has many → Reports
- Profile → has one → API Key

---

## 10. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/audit/full` | Session (optional) | Run full audit |
| POST | `/api/v1/audit` | Bearer API key | REST API audit |
| GET | `/api/v1/audit` | Bearer API key | API usage info |
| POST | `/api/v1/key` | Session | Generate API key |
| DELETE | `/api/v1/key` | Session | Revoke API key |
| POST | `/api/stripe/checkout` | None | Create Stripe session |
| POST | `/api/stripe/webhook` | Stripe signature | Handle subscription events |
| POST | `/api/report/create` | Session | Create shareable report |
| POST | `/api/analytics` | None | Batch event tracking |
| GET | `/api/analytics/summary` | None | Analytics summary |
| GET | `/api/stats/live` | None | Live platform stats |
| POST | `/api/leads` | None | Capture email lead |

---

## 11. Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, lucide-react icons
- **Styling:** Vanilla CSS (dark theme, glassmorphism, micro-animations)
- **Backend:** Next.js API routes (serverless)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Payments:** Stripe (subscriptions + webhooks)
- **Audit Engine:** Google PSI API (key pool) + custom cheerio-based crawler
- **PDF:** jsPDF (client-side generation)
- **Monitoring:** Sentry (error tracking)
- **CI/CD:** GitHub Actions (planned)

---

## 12. Constraints & Assumptions
- PSI API has per-key rate limits (~25 req/100s) — mitigated by key pool
- Vercel serverless has 180s max execution time
- No server-side PDF rendering (Puppeteer too heavy for serverless)
- Stripe not yet fully configured — checkout routes exist but need price IDs
- CrUX field data only available for sites with sufficient Chrome traffic

---

## 13. Out of Scope (Current Phase)
- Native mobile app
- Real-time WebSocket monitoring
- Custom domain for white-label reports
- SSO / SAML (Enterprise — future)
- Multi-region deployment
- AI-powered fix suggestions

---

## 14. Future Enhancements
- **Phase 2:** Scheduled monitoring (cron, 10 URLs for Pro), performance budgets, alerts
- **Phase 3:** CLI tool (`npx vitalfix audit`), GitHub Action for CI/CD
- **Phase 4:** Team/org management, white-label branding, custom SLA
- **Phase 5:** AI fix recommendations, competitive benchmarking

---

## 15. Acceptance Criteria

### Audit Engine
- ✅ Returns valid scores for any public URL in <30s
- ✅ Handles PSI timeout gracefully (lite mode fallback)
- ✅ Blocks SSRF attempts (localhost, private IPs, metadata)
- ✅ Respects plan-based daily quota limits

### 4-Tier System
- ✅ Free users limited to 5 audits/day, 7-day history
- ✅ Starter users get PDF export, CSV, 90-day history
- ✅ Pro users get unlimited audits, REST API (1K/day)
- ✅ Plan badge shows correctly in dashboard header
- ✅ Upgrade prompts are context-aware (suggest next tier)

### REST API
- ✅ Returns 401 for missing/invalid API key
- ✅ Returns 403 for Free/Starter plans (no API access)
- ✅ Returns 429 when daily limit exceeded
- ✅ Includes X-RateLimit-* headers on every response
- ✅ API key generation requires active session + Pro+ plan

### Exports
- ✅ JSON export works for all tiers
- ✅ CSV export blocked for Free (shows lock + upgrade link)
- ✅ PDF generates branded A4 report with all audit data
- ✅ PDF download triggers analytics tracking
