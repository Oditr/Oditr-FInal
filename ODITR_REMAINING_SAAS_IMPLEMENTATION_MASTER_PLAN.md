# ODITR Remaining SaaS Implementation Master Plan
_Generated: 2026-06-24 — Based on full codebase inspection_

---

## 1. Current Codebase State

Øditr is a Next.js 15 (App Router) + Supabase project with TypeScript throughout. The build is clean (60/60 pages pass static generation). PostHog is connected. Stripe billing exists. The codebase is modular and well-structured.

### Tech Stack
- **Framework**: Next.js 15 (App Router, RSC)
- **Auth**: Supabase Auth + custom workspace/role system
- **Database**: Supabase (PostgreSQL) with RLS
- **Payments**: Stripe (checkout + webhooks)
- **Analytics**: PostHog (existing) + new product analytics service
- **Deployment**: Vercel-targeted

---

## 2. Engines Already Implemented

| # | Engine | Status |
|---|--------|--------|
| 1 | Revenue Impact Engine | ✅ Exists in dashboard tabs |
| 2 | Core Audit Intelligence Engine | ✅ Full — PSI + custom audit engine |
| 3 | AI-Agent Readiness Engine | ✅ `/lib/audit-engine/ai-readiness/` |
| 4 | Monitoring & Regression Detection | ✅ `/lib/monitoring/` + cron |
| 5 | CI/CD & Deployment Guard | ✅ API tokens + v1/audit route |
| 6 | Real User Monitoring (RUM) | ✅ `/lib/rum/` + collect endpoint |
| 7 | Interactive User Journey Audit | ✅ (part of audit engine) |
| 8 | Agency & White-Label Reporting | ✅ `/lib/agency/` + branding |
| 9 | Billing, Usage & Access Control | ✅ Stripe + `/lib/billing/` |
| 10 | Auth, Workspaces & Permissions | ✅ `/lib/auth/` full RBAC |
| 11 | Onboarding & Guided Activation | ✅ `/app/onboarding/` + checklist |
| 12 | Product Analytics & Feedback | ✅ Just implemented — `/lib/analytics/` |

---

## 3. Missing Modules (Engines 13–20)

| # | Engine | Status |
|---|--------|--------|
| 13 | Admin/Internal Operations Engine | ❌ Missing |
| 14 | Notification & Alert Delivery Engine | ⚠️ Partial (alert-service builds payloads, no delivery) |
| 15 | Integrations & Webhooks Engine | ❌ Missing (GitHub snippet exists in docs only) |
| 16 | Data Export, Import & Backup Engine | ⚠️ Partial (pdf-export.ts client-side only) |
| 17 | Audit Log, Compliance & Security Hardening | ⚠️ Partial (SSRF blocking in v1/audit, no audit log table) |
| 18 | Public API & Developer Platform | ⚠️ Partial (`/api/v1/audit` exists, needs expansion) |
| 19 | Docs, Help Center & In-App Education | ⚠️ Partial (`/docs` page exists as guides, not structured help) |
| 20 | Production Readiness, QA & Launch Hardening | ❌ No health check, no launch checklist |

---

## 4. Existing Database Models (from SQL files)

### `supabase/schema.sql`
- `analytics_events` (audit-level events)
- `analytics_daily` (aggregated daily)

### `supabase/auth-workspace-schema.sql`
- `workspaces`
- `workspace_members`
- `invites`

### `supabase/profiles-schema.sql`
- `profiles` (plan, stripe, usage)

### `supabase/billing-schema.sql`
- Stripe subscription state

### `supabase/monitoring-schema.sql`
- `projects`, `scan_history`, `regression_events`

### `supabase/rum-schema.sql`
- `rum_events`, `rum_projects`

### `supabase/agency-schema.sql`
- `agency_clients`, `shared_reports`, `agency_branding`

### `supabase/api-keys-schema.sql`
- `api_tokens`

### `supabase/reports-schema.sql`
- `reports`

### `supabase/product-analytics-schema.sql` (just added)
- `product_events`, `feedback`, `nps_responses`, `growth_insights`

### `supabase/onboarding-schema.sql` (just added)
- `user_profiles`, `onboarding_state`

### **Missing Tables**:
- `notifications`
- `notification_preferences`
- `integrations`
- `webhook_endpoints`
- `webhook_deliveries`
- `audit_logs`

---

## 5. Existing API Routes

### Auth
- `GET /api/auth/me`
- `GET/POST /api/auth/workspaces`
- `POST /api/auth/workspaces/switch`

### Audit
- `POST /api/audit/full`
- `POST /api/v1/audit` (public API)
- `GET /api/v1/audit`
- `POST/DELETE /api/v1/key`

### Projects
- `GET/POST /api/projects`
- `GET/PATCH/DELETE /api/projects/[projectId]`
- `GET /api/projects/[projectId]/history`
- `POST /api/projects/[projectId]/scan`
- `GET /api/projects/[projectId]/trends`
- `PATCH /api/projects/[projectId]/monitoring`
- `GET /api/projects/[projectId]/rum/summary`
- `GET /api/projects/[projectId]/rum/pages`

### Reports
- `POST /api/report/create`
- `GET/DELETE /api/reports/[reportId]/share`
- `GET /api/reports/share/[shareId]`
- `GET /api/reports/[reportId]/comparison`

### Analytics
- `POST /api/analytics` (old event batch endpoint)
- `POST /api/analytics/track` (new product analytics)
- `GET /api/analytics/activation`
- `GET /api/analytics/funnels`
- `GET /api/analytics/features`
- `GET /api/analytics/growth-insights`
- `POST /api/analytics/growth-insights`
- `GET /api/analytics/summary`

### Feedback
- `POST /api/feedback`
- `POST /api/feedback/feature-request`
- `POST /api/feedback/bug-report`
- `POST /api/feedback/nps`

### Billing
- `POST /api/stripe/checkout`
- `POST /api/stripe/webhook`
- `GET /api/billing/current`
- `GET /api/access/check`

### Agency
- `GET/POST /api/agency/clients`
- `GET/PATCH /api/agency/branding`

### Onboarding
- `GET/POST /api/onboarding/state`
- `POST /api/onboarding/step`
- `GET/POST /api/onboarding/profile`

### Monitoring
- `GET /api/cron/monitoring`

### Misc
- `GET /api/stats/live`
- `POST /api/leads`

### **Missing Routes**:
- `/api/admin/*`
- `/api/notifications/*`
- `/api/integrations/*`
- `/api/webhooks/*`
- `/api/export/*`
- `/api/audit-logs`
- `/api/health`
- `/api/v1/projects`
- `/api/v1/reports/*`

---

## 6. Existing Frontend Dashboards

- `/dashboard` — Main audit dashboard (tabs: Overview, Opportunities, Diagnostics, AI Readiness, Analytics, History, Field Data, Site Audit)
- `/dashboard/growth` — Growth Intelligence (just added)
- `/dashboard/settings/billing` — Billing settings
- `/monitoring` — Project monitoring list
- `/monitoring/[projectId]` — Project monitoring detail
- `/monitoring/[projectId]/rum` — RUM dashboard
- `/agency/clients` — Agency client list
- `/agency/branding` — White-label branding
- `/onboarding` — Multi-step onboarding wizard
- `/checklist` — Activation checklist
- `/pricing` — Pricing page
- `/docs` — Tech docs/guides
- `/library` — Web vitals library
- `/tools` — Tools page
- `/report/[id]` — Report viewer
- `/reports/share/[shareId]` — Shared report

### **Missing Dashboard Pages**:
- `/admin` — Admin panel
- `/dashboard/notifications` — Notification center
- `/dashboard/integrations` — Integrations manager
- `/dashboard/developer` — API token manager + docs
- `/dashboard/export` — Data export
- `/help` — Help center

---

## 7. Safe to Implement Now

These are safe and self-contained additions:

1. **Notifications engine** — New DB table, new API routes, bell component. Low risk.
2. **Audit log service** — New DB table, server-side only. Zero frontend risk.
3. **Data export** — New API routes returning CSV/JSON. Zero DB schema risk.
4. **Health check endpoint** — Single route. Zero risk.
5. **Admin panel** — New protected routes. No existing routes touched.
6. **Integrations/webhooks** — New DB table + new routes. No existing flow touched.
7. **Help center** — Static content. Zero risk.
8. **Public API expansion** — Additive to existing `/api/v1/` namespace.
9. **Developer settings page** — New page, uses existing api-token-service.
10. **Launch checklist** — Documentation only.

---

## 8. Risky Changes (Approach with Caution)

| Risk | Area | Mitigation |
|------|------|-----------|
| Breaking audit flow | `/api/audit/full` | Do NOT touch this route |
| Breaking billing | Stripe webhook handler | Do NOT modify |
| Breaking auth | Supabase callback + middleware | Only extend, never replace |
| Breaking RUM | `/api/rum/collect` | Do NOT touch |
| Breaking workspace isolation | RLS policies | Review before adding new tables |
| SSRF | Any URL-scanning code | SSRF protection already exists in v1/audit — replicate for any new scanner |

---

## 9. Placeholder-Only (Don't Build Yet)

These should be created as stubs/UI placeholders only:

- **Email notification delivery** — No email provider configured. Create DB schema + stub service.
- **Slack/Discord OAuth** — Complex. Use simple webhook URL input only.
- **Jira/Linear integrations** — Future milestone.
- **Zapier/Make** — Future milestone.
- **Import from CSV** — UI only, backend stub.
- **Full admin analytics superpanel** — Basic overview only.
- **Predictive churn ML** — Rule-based signals only (already done).
- **Session replay** — Not in scope.

---

## 10. Recommended Implementation Order

1. **`/api/health`** — 5 minutes, zero risk, validates DB connection
2. **Audit Log schema + service** — Foundation for security hardening
3. **SSRF protection review** — Verify it covers all scan paths
4. **Notifications engine** — DB schema → service → API routes → Bell component
5. **Integrations/Webhooks engine** — DB schema → service → simple webhook delivery
6. **Data Export engine** — CSV/JSON export endpoints
7. **Admin engine** — Protected admin panel (basic user/workspace/feedback view)
8. **Public API expansion** — `/api/v1/projects`, `/api/v1/reports`, `/api/v1/monitoring`
9. **Developer Settings page** — Token manager UI
10. **Help center pages** — Static content pages
11. **Production checklist** — `ODITR_PRODUCTION_LAUNCH_CHECKLIST.md`

---

## 11. Technical Dependencies

```
Health Check → DB connection check
Audit Log → workspaces, auth.users (FK)
Notifications → workspaces, auth.users, audit_logs (optional)
Integrations → workspaces, webhook_endpoints
Webhook Delivery → webhook_endpoints, product_events
Export → reports, projects, rum_events (all read-only)
Admin → All tables (service role reads)
Public API expansion → api_tokens, projects, reports
Developer Settings → api_tokens
Help Center → No dependencies
```

---

## 12. Possible Breaking Effects

| Change | Could Break | Prevention |
|--------|-------------|-----------|
| New DB tables | Nothing (additive) | Apply SQL in Supabase first |
| New API routes | Nothing (additive) | Follow existing route patterns |
| Modifying auth callback | Login flow | Use only `await` fixes already made |
| Modifying dashboard layout | All dashboard pages | Only add to layout, never remove |
| Modifying billing routes | Checkout + plan gates | DO NOT TOUCH |
| Adding RLS policies | Existing data access | Test with anon + user + service role |

---

## 13. Testing Plan

### Unit Tests
- Notification service: message building
- Audit log service: event recording
- Export service: CSV/JSON generation
- SSRF: blocked IP ranges
- Webhook signature: HMAC verification

### Integration Tests
- `POST /api/health` returns 200 with DB status
- `GET /api/notifications` returns empty array for new user
- `POST /api/webhooks` creates endpoint record
- `GET /api/export/report/:id/csv` returns valid CSV
- `GET /api/admin/overview` returns 403 for non-admin

### Manual Tests
- Notification bell shows unread count
- Admin panel loads without breaking dashboard
- Export downloads a real file
- Webhook fires when audit completes
- Developer page shows existing tokens

---

## 14. Launch-Readiness Checklist Summary

> See `ODITR_PRODUCTION_LAUNCH_CHECKLIST.md` for full checklist.

**Blockers before launch**:
- [ ] Health check endpoint
- [ ] SSRF protection on all scan paths
- [ ] Rate limiting on all public routes
- [ ] Secure headers verified
- [ ] All API tokens hashed (not plaintext)
- [ ] No secrets in frontend bundle
- [ ] Stripe webhook signature verification
- [ ] Error pages don't leak stack traces
- [ ] Supabase RLS enabled on all new tables
- [ ] Admin routes protected

**Nice-to-have before launch**:
- [ ] Notification bell
- [ ] Data export
- [ ] Help center
- [ ] Developer API docs page
- [ ] Webhook delivery

---

## Implementation Notes

### Engine 13 (Admin): Use service role key only on server. Never expose admin routes to client without permission check.

### Engine 14 (Notifications): Start with in-app only. Email = stub. Slack = webhook URL only.

### Engine 15 (Integrations): Webhooks with HMAC signing. No OAuth integrations in MVP.

### Engine 16 (Export): Streaming CSV for large datasets. PDF stays client-side via jsPDF.

### Engine 17 (Audit Log + Security): IP hashing for privacy. No raw IPs in DB.

### Engine 18 (Public API): Rate limit by token, not IP. Scope validation per endpoint.

### Engine 19 (Docs/Help): Static MDX or simple page components. No CMS needed at launch.

### Engine 20 (Launch Hardening): Run `npm run build` must pass. All routes must return proper error shapes.
