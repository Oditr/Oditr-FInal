# Øditr Monitoring & Regression Detection Engine — Implementation Plan

## 1. Current audit/report storage system

Two-tier persistence:
- **localStorage** (`scan-history.ts`): Stores up to 50 `StoredScan` objects (slimmed AuditResult). Keyed by `vitalfix-scan-history`. Guests always use this.
- **Supabase `scans` table** (`scan-store.ts`): Mirrors `StoredScan` for authenticated users. Has RLS. `scan-store.ts` acts as a unified facade that writes to both localStorage and Supabase when a `userId` is present.

The `StoredScan` shape captures: url, strategy, fetchedAt, healthScore, scores (LH 4-category), cwvSummary, customAuditScore, totalFindings, critical/moderate/minor, partial flag.

**Missing for monitoring:**
- No full audit result blob stored (just the slimmed summary)
- No project concept — scans are URL-based, not grouped by "project"
- No comparison/regression data
- No categoryScores, issues list, or AI readiness score stored in history

## 2. Existing database models

Supabase tables:
- `scans` — per-user scan history (matches StoredScan)
- `public_reports` — shareable read-only snapshots (public)
- `profiles` — user plan, stripe info, daily counters
- `analytics_events` — event tracking
- `daily_counters` — aggregated metrics
- `leads` — email captures
- `digests` — scheduled email digests (future)
- `api_keys` — REST API bearer tokens

## 3. Existing project/user structure

No "project" concept exists. Users run ad-hoc audits on any URL. Auth is Supabase + `AuthProvider`. Plan tiers exist (free/starter/pro/enterprise) via `plans.ts`.

## 4. Existing audit API routes

- `POST /api/audit/full` — Main audit endpoint. Runs PSI + Custom Audit Engine in parallel. Returns LH scores, CWV, custom audit categories, normalized issues, categoryScores, healthScore, aiReadiness detail.

## 5. Existing frontend dashboard/report history

- `HistoryTab.tsx` — Shows scan history with sparklines, grouping by date, compare mode (side-by-side A vs B), export.
- `SiteAuditTab.tsx` — Displays custom audit category cards with findings.
- `AIReadinessTab.tsx` — Displays AI readiness detail.
- `OverviewTab.tsx` — CWV overview.

## 6. Scheduled jobs / cron

None exist. Vercel supports cron via `vercel.json` pointing to API routes. This is the recommended approach.

## 7. Where monitoring should connect

- Reuses the existing `runCustomAudit()` + `fetchPSI()` pipeline from `/api/audit/full`.
- Stores full audit snapshots to a new `audit_reports` table.
- New `projects` and `regression_reports` tables for project/monitoring/regression tracking.
- Frontend: new `/monitoring` page with project list, trends, regression cards.

## 8. Backend modules to create

- `src/lib/monitoring/types.ts` — Project, AuditReport, RegressionReport types
- `src/lib/monitoring/project-service.ts` — CRUD for monitored projects
- `src/lib/monitoring/audit-history-service.ts` — Save/retrieve full audit reports
- `src/lib/monitoring/regression-service.ts` — Compare two reports, classify regression
- `src/lib/monitoring/issue-diff-service.ts` — Match and classify issues between scans
- `src/lib/monitoring/vitals-diff-service.ts` — CWV delta detection
- `src/lib/monitoring/score-trend-service.ts` — Historical score trends
- `src/lib/monitoring/alert-service.ts` — Build alert payloads (email placeholder)
- `src/lib/monitoring/scheduler-service.ts` — Find due projects, run scans
- `src/app/api/projects/route.ts` — POST/GET projects
- `src/app/api/projects/[projectId]/route.ts` — GET/PATCH single project
- `src/app/api/projects/[projectId]/monitoring/route.ts` — PATCH monitoring settings
- `src/app/api/projects/[projectId]/history/route.ts` — GET audit history
- `src/app/api/projects/[projectId]/scan/route.ts` — POST trigger manual scan
- `src/app/api/projects/[projectId]/trends/route.ts` — GET score trends
- `src/app/api/reports/[reportId]/comparison/route.ts` — GET regression comparison
- `src/app/api/cron/monitoring/route.ts` — Vercel cron endpoint

## 9. Frontend components to create

- `src/app/monitoring/page.tsx` — Monitoring dashboard
- `src/app/monitoring/[projectId]/page.tsx` — Project detail with history/trends
- `src/components/monitoring/ProjectCard.tsx`
- `src/components/monitoring/ScoreTrendChart.tsx`
- `src/components/monitoring/RegressionSummaryCard.tsx`
- `src/components/monitoring/VitalsTrendPanel.tsx`
- `src/components/monitoring/IssueChangesPanel.tsx`
- `src/components/monitoring/MonitoringStatusBadge.tsx`

## 10. Database changes needed

New tables:
- `projects` — monitored websites
- `audit_reports` — full audit snapshots (JSONB blobs)
- `regression_reports` — comparison results

## 11. Risks and limitations

- Vercel cron runs max 1/minute, max 60s execution. Multi-project scheduling must be batched.
- Full audit result JSONB blobs can be large (~50-200KB each). Keep only the last N per project.
- PSI key pool rate limits apply to scheduled scans too.
- No email infrastructure exists — alert service will be interface + TODO.

## 12. Implementation order

1. Types (`monitoring/types.ts`)
2. Issue diff service
3. Vitals diff service
4. Regression detection service
5. Score trend service
6. Alert payload service
7. Project service
8. Audit history service
9. Scheduler service
10. Supabase migration SQL
11. API routes
12. Frontend monitoring page + components
13. Vercel cron config
14. Tests
