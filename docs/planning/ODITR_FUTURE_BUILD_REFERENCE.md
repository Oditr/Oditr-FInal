# Øditr — Future Build Reference

> **Purpose:** This is the single source of truth for everything that is planned but not yet implemented.
> Every item includes where it belongs in the codebase, how to proceed, and what it depends on.
> Sorted by priority and grouped by domain.

---

## Table of Contents

1. [Revenue Impact Engine — Remaining Work](#1-revenue-impact-engine--remaining-work)
2. [AI-Agent Readiness Module](#2-ai-agent-readiness-module)
3. [Technical SEO — Deep Checks](#3-technical-seo--deep-checks)
4. [Security & Protocol Auditing — Expansion](#4-security--protocol-auditing--expansion)
5. [Accessibility — Expansion](#5-accessibility--expansion)
6. [Monitoring & Alerting SaaS Layer](#6-monitoring--alerting-saas-layer)
7. [CI/CD & Developer Workflow Integrations](#7-cicd--developer-workflow-integrations)
8. [RUM (Real User Monitoring)](#8-rum-real-user-monitoring)
9. [Agency & Enterprise Features](#9-agency--enterprise-features)
10. [Infrastructure & Rebranding — Phase 3](#10-infrastructure--rebranding--phase-3)
11. [Database Schema Backlog](#11-database-schema-backlog)

---

## 1. Revenue Impact Engine — Remaining Work

**Status:** Core engine ✅ Done | Persistence & polish ❌ Pending

### 1.1 Supabase Persistence for Business Profiles

| Detail | Value |
|--------|-------|
| **What** | Persist `BusinessProfile` data to Supabase instead of in-memory `Map` |
| **Why** | Server restarts currently wipe all saved profiles |
| **Where** | `src/app/api/v1/revenue/profile/route.ts` |
| **Schema location** | Create `supabase/revenue-profiles-schema.sql` |
| **Depends on** | Supabase project access, env vars configured |
| **How to proceed** | 1. Create SQL migration (see §11.1) → 2. Replace `profileStore` Map with `supabase.from('business_profiles')` calls → 3. Add RLS policies for user-scoped access |

### 1.2 Supabase Persistence for Revenue Impact Results

| Detail | Value |
|--------|-------|
| **What** | Save each revenue impact calculation result to DB |
| **Why** | Enables historical comparison ("your revenue risk dropped 30% since last month") |
| **Where** | `src/lib/revenue-impact/index.ts` → after `buildRevenueImpactReport()` |
| **Schema location** | Create `supabase/revenue-results-schema.sql` |
| **How to proceed** | 1. Create SQL migration (see §11.2) → 2. Add `saveRevenueReport()` to the orchestrator → 3. Add GET endpoint at `src/app/api/v1/revenue/report/[reportId]/route.ts` |

### 1.3 Historical Revenue Impact Comparison Charts

| Detail | Value |
|--------|-------|
| **What** | Show trend chart of `totalEstimatedRevenueAtRisk` over time |
| **Why** | Users can see if their fixes are reducing business risk |
| **Where** | New component: `src/components/revenue-impact/RevenueHistoryChart.tsx` |
| **Depends on** | §1.2 (saved results in DB) |
| **How to proceed** | 1. Query `revenue_impact_results` by `projectId` ordered by `createdAt` → 2. Render via `Sparkline` component (already exists at `src/components/Sparkline.tsx`) or a new chart lib |

### 1.4 PDF Export — Revenue Impact Section

| Detail | Value |
|--------|-------|
| **What** | Include revenue impact summary in the existing PDF export |
| **Where** | `src/lib/pdf-export.ts` (existing, 9KB) |
| **How to proceed** | 1. Accept optional `RevenueImpactResult` param → 2. Add a "Revenue Impact" page with top risks table and assumptions |

### 1.5 Inngest Auto-Trigger After Audit

| Detail | Value |
|--------|-------|
| **What** | Automatically run revenue impact calculation after every background audit |
| **Where** | `src/lib/inngest/functions.ts` → `runAsyncAudit` function |
| **How to proceed** | 1. Add a third `step.run('calculate-revenue-impact', ...)` after `save-to-db` → 2. Load the user's `BusinessProfile` from DB → 3. Save result to `revenue_impact_results` |
| **Depends on** | §1.1 and §1.2 (DB persistence) |

### 1.6 Impact Factor Calibration UI

| Detail | Value |
|--------|-------|
| **What** | Let users customize severity impact percentages for their industry |
| **Where** | New component: `src/components/revenue-impact/ImpactFactorSettings.tsx` |
| **How to proceed** | 1. Add `customImpactFactors` field to `BusinessProfile` → 2. Override defaults from `src/lib/revenue-impact/assumptions.ts` at calculation time |
| **Priority** | Low — only after real user feedback on defaults |

---

## 2. AI-Agent Readiness Module

**Status:** ❌ Not yet implemented — placeholder only in product docs

### 2.1 Core AI-Agent Readiness Service

| Detail | Value |
|--------|-------|
| **What** | New audit module that scores how AI crawlers/agents can understand a site |
| **Why** | Unique differentiator for Øditr — no competitor does this |
| **Where** | Create `src/lib/audit-engine/ai-agent-readiness.ts` |
| **How to proceed** | 1. Fetch `/llms.txt` and parse → 2. Parse `robots.txt` for GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended → 3. Check for structured data (JSON-LD) → 4. Check semantic HTML (landmarks, headings) → 5. Return a 0–100 readiness score |

### 2.2 Checks Required

| Check | Method | Difficulty |
|-------|--------|------------|
| `llms.txt` detection | `fetch(url + '/llms.txt')` | Easy |
| `robots.txt` AI bot analysis | Parse existing robots fetch | Easy |
| Structured data (JSON-LD, schema.org) | Parse HTML `<script type="application/ld+json">` | Easy |
| Semantic HTML (landmarks, headings) | Reuse `src/lib/audit-engine/headings.ts` | Easy |
| Content not hidden behind JS-only | Check if `<noscript>` exists, or if body is empty without JS | Medium |
| Crawlable key pages (pricing, about) | Parse sitemap or nav links | Medium |

### 2.3 Frontend Panel

| Detail | Value |
|--------|-------|
| **Where** | Create `src/app/dashboard/AIAgentReadinessTab.tsx` |
| **How to proceed** | 1. Wire into dashboard tab bar (same pattern as Revenue tab) → 2. Display per-check pass/fail → 3. Show overall AI readiness score → 4. Mark experimental checks with a badge |

### 2.4 Integration Point

| Detail | Value |
|--------|-------|
| **Where** | `src/lib/audit-engine/index.ts` → `runCustomAudit()` |
| **How to proceed** | Import and call `runAiAgentReadinessAudit(html, headers, url)` alongside existing modules |

---

## 3. Technical SEO — Deep Checks

**Status:** Basic meta-tag checks ✅ exist | Deep checks ❌ pending

### 3.1 Missing Deep SEO Checks

| Check | Current File | Status | How to Add |
|-------|-------------|--------|------------|
| Canonical tag validation | `src/lib/audit-engine/meta-tags.ts` | ⚠️ Basic | Validate against actual URL, check for duplicate canonicals |
| Open Graph completeness | `meta-tags.ts` | ⚠️ Partial | Check `og:title`, `og:description`, `og:image`, `og:url`, `og:type` |
| Twitter Card validation | `meta-tags.ts` | ❌ Missing | Check `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` |
| Sitemap.xml existence | ❌ None | ❌ Missing | Create check in `meta-tags.ts` or new `sitemap-checker.ts` — `fetch(url + '/sitemap.xml')` |
| Indexability (noindex/nofollow) | ❌ None | ❌ Missing | Check `<meta name="robots">` and `X-Robots-Tag` header |
| Duplicate metadata detection | ❌ None | ❌ Missing | Flag if multiple `<title>` or `<meta name="description">` exist |
| Structured data validation | ❌ None | ❌ Missing | Parse JSON-LD and validate against schema.org |

### 3.2 Where to Build

| Detail | Value |
|--------|-------|
| **Expand** | `src/lib/audit-engine/meta-tags.ts` (existing, 4.9KB) |
| **New file** | `src/lib/audit-engine/sitemap.ts` for sitemap/robots.txt deep checks |
| **New file** | `src/lib/audit-engine/structured-data.ts` for JSON-LD validation |

---

## 4. Security & Protocol Auditing — Expansion

**Status:** Basic headers ✅ exist | Protocol checks ❌ pending

### 4.1 Missing Security Checks

| Check | Current File | Status | How to Add |
|-------|-------------|--------|------------|
| HSTS detection | `src/lib/audit-engine/security.ts` | ⚠️ Basic | Verify `max-age`, `includeSubDomains`, `preload` |
| CSP (Content Security Policy) | `security.ts` | ⚠️ Basic | Parse directives, flag `unsafe-inline`, `unsafe-eval` |
| CORS warnings | ❌ None | ❌ Missing | Check `Access-Control-Allow-Origin: *` as potential risk |
| Mixed content detection | ❌ None | ❌ Missing | Scan HTML for `http://` resources on `https://` pages |
| HTTP/2 or HTTP/3 support | ❌ None | ❌ Missing | May require backend-level `fetch` with protocol inspection (limited from serverless) |
| Permissions-Policy header | `security.ts` | ❌ Missing | Check for `Permissions-Policy` header presence |

### 4.2 Where to Build

| Detail | Value |
|--------|-------|
| **Expand** | `src/lib/audit-engine/security.ts` (existing, 4.4KB) |
| **Risk** | CDNs (Cloudflare, Vercel) may add/strip headers, causing false positives. Add a disclaimer. |

---

## 5. Accessibility — Expansion

**Status:** Partial checks ✅ exist | Deep WCAG ❌ pending

### 5.1 Missing Accessibility Checks

| Check | Status | How to Add |
|-------|--------|------------|
| Color contrast ratio | ❌ Missing | Requires computed styles — hard without browser rendering. Consider axe-core integration. |
| Keyboard navigation | ❌ Missing | Check `tabindex`, focusable elements, skip-nav links |
| Focus visibility | ❌ Missing | Check for `:focus` styles or `outline: none` misuse |
| ARIA landmark structure | ⚠️ Basic | Validate `<main>`, `<nav>`, `<header>`, `<footer>` usage |
| Button/link accessible names | ⚠️ Basic | Flag `<button>` or `<a>` without text content or `aria-label` |

### 5.2 Where to Build

| Detail | Value |
|--------|-------|
| **Expand** | `src/lib/audit-engine/accessibility.ts` (existing, 6.3KB) |
| **Future** | Consider axe-core or Playwright-based auditing for computed-style checks |

---

## 6. Monitoring & Alerting SaaS Layer

**Status:** Basic Inngest cron ✅ exists | User-facing monitoring ❌ pending

### 6.1 Scheduled Audit Configuration

| Detail | Value |
|--------|-------|
| **What** | Let users set up recurring audits (daily/weekly) per URL |
| **Where** | New: `src/app/api/v1/monitoring/schedule/route.ts` |
| **Backend** | `src/lib/monitoring/cron.ts` (existing) + `src/lib/inngest/functions.ts` |
| **Frontend** | New: `src/components/MonitoringSetup.tsx` → add to dashboard |
| **Schema** | New table: `monitoring_schedules` (see §11.3) |

### 6.2 Alert System (Email / Slack / Discord)

| Detail | Value |
|--------|-------|
| **What** | Notify users when scores drop, CWV worsen, or security headers disappear |
| **Where** | New: `src/lib/alerting/` directory |
| **Services** | Email (Resend or SendGrid), Slack webhook, Discord webhook |
| **How to proceed** | 1. Create `src/lib/alerting/email.ts`, `slack.ts`, `discord.ts` → 2. Trigger from Inngest after scheduled audit compares old vs new scores → 3. Use `src/lib/intelligence/regression-engine.ts` (already exists) for diff detection |

### 6.3 Historical Score Charts

| Detail | Value |
|--------|-------|
| **What** | Visual trend lines showing score history per URL |
| **Where** | Expand `src/app/dashboard/HistoryTab.tsx` (exists) |
| **How to proceed** | Query `scans` table grouped by URL, render with `Sparkline.tsx` or a charting library |

---

## 7. CI/CD & Developer Workflow Integrations

**Status:** Simulated PR engine ✅ exists | Real integrations ❌ pending

### 7.1 GitHub Action

| Detail | Value |
|--------|-------|
| **What** | Official GitHub Action that runs Øditr audit on PR or deploy |
| **Where** | New: `.github/actions/oditr-audit/action.yml` |
| **How to proceed** | 1. Create a lightweight Node CLI that calls `/api/v1/audit` → 2. Parse response and post PR comment with score summary → 3. Fail CI if score drops below threshold |

### 7.2 Vercel / Netlify Deploy Hooks

| Detail | Value |
|--------|-------|
| **What** | Auto-trigger audit when a new deployment goes live |
| **Where** | New: `src/app/api/v1/webhooks/vercel/route.ts` |
| **How to proceed** | 1. Accept Vercel deploy webhook → 2. Extract deployment URL → 3. Trigger Inngest `audit/run` event |

### 7.3 PR Regression Comments

| Detail | Value |
|--------|-------|
| **What** | Post a comment on GitHub PR showing before/after scores |
| **Where** | `src/lib/agent/fix-pr-engine.ts` (exists, 3.9KB) — currently simulated |
| **How to proceed** | 1. Replace simulation with GitHub API calls → 2. Use `regression-engine.ts` to compare scores |

---

## 8. RUM (Real User Monitoring)

**Status:** Schema + stub code ✅ exist | Full implementation ❌ pending

### 8.1 Existing RUM Files

These files already exist but are not fully connected:

| File | Contents |
|------|----------|
| `src/lib/rum/types.ts` (4.5KB) | RUM event types, session types, metric types |
| `src/lib/rum/vf-script-source.ts` (6.7KB) | Client-side JS snippet that captures web-vitals |
| `src/lib/rum/aggregator.ts` (7.5KB) | Server-side aggregation logic |
| `supabase/rum-schema.sql` (3.8KB) | DB schema for RUM events |
| `supabase/rum-aggregation.sql` (2KB) | Aggregation functions |

### 8.2 What Remains

| Task | Where | How to Proceed |
|------|-------|----------------|
| Create intake API | `src/app/api/v1/rum/ingest/route.ts` | Accept batched RUM events, validate, insert to `rum_events` table |
| NPM package / embeddable script | New repo or `packages/oditr-rum` | Publish the `vf-script-source.ts` as an installable snippet |
| RUM Dashboard Panel | `src/app/dashboard/RumTab.tsx` | Show real-user LCP/CLS/INP by page, device, browser |
| Privacy controls | New: `src/lib/rum/privacy.ts` | Strip PII, anonymize IPs, respect DNT header |
| High-throughput ingestion | May need to move from Supabase to ClickHouse/TimescaleDB | Only if volume exceeds Supabase limits |

---

## 9. Agency & Enterprise Features

**Status:** ❌ Not started — future phase

### 9.1 White-Label PDF Reports

| Detail | Value |
|--------|-------|
| **What** | Branded PDF exports with agency logo, custom colors |
| **Where** | Expand `src/lib/pdf-export.ts` |
| **How to proceed** | Add `brandConfig` param (logo URL, primary color, company name) → render into PDF header/footer |

### 9.2 Multi-Client Dashboard

| Detail | Value |
|--------|-------|
| **What** | Agency users can manage multiple client projects from one account |
| **Where** | Already partially supported via `teams` and `team_members` tables |
| **How to proceed** | Build a `/agency` route with project cards, aggregate health scores, and per-client drill-down |

### 9.3 Interactive Playwright Audits

| Detail | Value |
|--------|-------|
| **What** | Simulate real user flows (login, checkout, form fills) using Playwright |
| **Where** | New: `src/lib/audit-engine/interactive/` directory |
| **How to proceed** | 1. Set up Playwright on a backend worker (not serverless) → 2. Define audit scripts per flow → 3. Capture screenshots + performance traces |
| **Risk** | Cannot run Playwright on Vercel serverless. Needs a separate worker (e.g., Railway, Fly.io, or Cloud Run) |

---

## 10. Infrastructure & Rebranding — Phase 3

**Status:** UI rebrand ✅ Done | Infra rebrand ❌ Pending

### 10.1 Environment Variable Migration

| Detail | Value |
|--------|-------|
| **What** | Rename env var prefixes from `VITALFIX_` to `ODITR_` |
| **Where** | `.env`, `.env.example`, Vercel project settings |
| **Risk** | Will break production if Vercel env vars aren't updated simultaneously |
| **How to proceed** | 1. Update `.env.example` → 2. Update all `process.env.VITALFIX_*` references → 3. Coordinate with Vercel dashboard update |

### 10.2 Inngest Task ID Migration

| Detail | Value |
|--------|-------|
| **What** | Rename Inngest function IDs from `vitalfix/*` to `oditr/*` |
| **Where** | `src/lib/inngest/functions.ts`, `src/lib/inngest/client.ts` |
| **Risk** | Running cron jobs may fail if IDs change without Inngest dashboard sync |

### 10.3 localStorage Key Migration

| Detail | Value |
|--------|-------|
| **What** | Migrate `vitalfix-last-audit` → `oditr-last-audit` |
| **Where** | `src/app/dashboard/page.tsx` (line 36), `src/lib/scan-store.ts` |
| **Risk** | Existing users lose saved data unless a migration script reads old key and writes new |

---

## 11. Database Schema Backlog

All schema files live in `supabase/`. Run them via Supabase SQL Editor or CLI.

### 11.1 Business Profiles Table

**File to create:** `supabase/revenue-profiles-schema.sql`

```sql
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL DEFAULT 'other',
  currency TEXT NOT NULL DEFAULT 'USD',
  monthly_visitors INTEGER,
  monthly_sessions INTEGER,
  conversion_rate NUMERIC(5,4),
  average_order_value NUMERIC(12,2),
  average_lead_value NUMERIC(12,2),
  average_customer_value NUMERIC(12,2),
  trial_to_paid_rate NUMERIC(5,4),
  primary_conversion_goal TEXT NOT NULL DEFAULT 'custom',
  important_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profiles"
  ON business_profiles FOR ALL
  USING (auth.uid() = user_id);
```

### 11.2 Revenue Impact Results Table

**File to create:** `supabase/revenue-results-schema.sql`

```sql
CREATE TABLE IF NOT EXISTS revenue_impact_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  total_estimated_revenue_at_risk NUMERIC(12,2) DEFAULT 0,
  total_estimated_lead_value_at_risk NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  overall_confidence TEXT NOT NULL DEFAULT 'low',
  issue_impacts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE revenue_impact_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own results"
  ON revenue_impact_results FOR SELECT
  USING (auth.uid() = user_id);
```

### 11.3 Monitoring Schedules Table

**File to create:** `supabase/monitoring-schedules-schema.sql`

```sql
CREATE TABLE IF NOT EXISTS monitoring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'mobile',
  frequency TEXT NOT NULL DEFAULT 'weekly',
  alert_email TEXT,
  alert_slack_webhook TEXT,
  alert_discord_webhook TEXT,
  score_threshold INTEGER DEFAULT 50,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE monitoring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedules"
  ON monitoring_schedules FOR ALL
  USING (auth.uid() = user_id);
```

### 11.4 Monitoring Alert Configs Table

**File to create:** `supabase/monitoring-alert-configs-schema.sql`

```sql
CREATE TABLE IF NOT EXISTS monitoring_alert_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  project_id uuid references projects,
  email_enabled boolean default false,
  email_to text,
  slack_enabled boolean default false,
  slack_webhook_url text,
  discord_enabled boolean default false,
  discord_webhook_url text,
  score_drop_threshold integer default 5,
  dashboard_url text,
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);

ALTER TABLE monitoring_alert_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert configs"
  ON monitoring_alert_configs FOR ALL
  USING (auth.uid() = user_id);
```

---

## Quick Navigation

| If you want to build... | Jump to |
|------------------------|---------|
| Save business profiles to DB | §1.1 + §11.1 |
| Historical revenue comparison | §1.3 (depends on §1.2) |
| AI-agent readiness scoring | §2.1 |
| Deep SEO (sitemap, structured data) | §3.1 |
| Security header expansion | §4.1 |
| Scheduled monitoring | §6.1 + §11.3 |
| Email/Slack alerts | §6.2 |
| GitHub Action CI/CD | §7.1 |
| Real User Monitoring | §8 |
| White-label agency reports | §9.1 |
| Environment variable migration | §10.1 |

---

> **Last updated:** 2026-06-24
> **Maintained by:** Development team
> **Rule:** When any item above is completed, mark it as ✅ and add the implementation date.
