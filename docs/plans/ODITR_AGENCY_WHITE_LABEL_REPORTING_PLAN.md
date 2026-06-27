# Øditr Agency & White-Label Reporting Engine Plan

## 1. Current Project/Report Structure
Currently, Øditr handles projects via a `projects` table (in `monitoring-schema.sql`). Each project belongs to a user (via Supabase auth) and holds URL, business type, and currency. When a project is scanned, it creates an `audit_reports` entry containing all scores, issues, core web vitals, revenue impact summary, and AI readiness summary.
- The `monitoring-schema.sql` links `audit_reports` to `projects`.

## 2. Current Dashboard/Report UI
The existing UI uses `/monitoring/[projectId]` to display the project overview, containing regression summaries, vitals trends, and issue changes.
The `/report/[id]` page shows a single static-like report view for a completed scan, containing Revenue Impact, Performance, SEO, Accessibility, Security, and AI-Agent readiness.
The RUM dashboard lives at `/monitoring/[projectId]/rum`.

## 3. Existing User/Project Model
Users are identified via `auth.users(id)` from Supabase.
Projects (`public.projects`) have a strict RLS policy tying them to `user_id`. There is currently no `clients` concept. Projects exist flatly under users.

## 4. Existing Audit Report Data
Available inside `public.audit_reports` as large JSONB payloads:
- `category_scores`, `cwv`, `issues`, `revenue_impact_summary`, `ai_readiness_summary`, `lighthouse_scores`
- This provides an extremely robust base for extracting any level of detail (Executive or Technical).

## 5. Existing Revenue Impact Data
Stored inside `revenue_impact_summary` JSONB on `audit_reports`. Contains `monthlyRevenueRisk`, `confidence`, and detailed issue-by-issue revenue impact calculations.

## 6. Existing Monitoring/Regression Data
Stored in `public.regression_reports` linking `previous_report_id` and `current_report_id`.
Provides `overall_score_delta`, `revenue_risk_delta`, `new_issues`, `resolved_issues`, and `vitals_deltas` — perfectly suited for the "Before/After Progress Report".

## 7. Existing Export/Share Functionality
None currently exists. There are no public share links with UUIDs, and no PDF export functionality.

## 8. Backend Modules Required
- **`src/lib/agency/client-service.ts`**: CRUD for Clients and linking ClientProjects.
- **`src/lib/agency/branding-service.ts`**: Save/Retrieve White-Label Brand Settings.
- **`src/lib/agency/report-builder-service.ts`**: Logic to aggregate an AuditReport, RegressionReport (if applicable), and RUM stats into a unified `ClientReport`.
- **`src/lib/agency/report-share-service.ts`**: Handle generation and retrieval of shareable links (public/private).
- **`src/app/api/agency/...`**: API routes matching the suggested endpoints.

## 9. Frontend Components Required
- **`ClientsDashboard` & `ClientForm`**: To manage clients.
- **`AgencyBrandingSettings`**: Form for colors, logos, and custom texts.
- **`ReportBuilder` & `ReportSectionSelector`**: UI to customize the client report contents.
- **`ClientReportPage`**: The beautiful, printable, white-labeled client-facing report route (`/reports/share/[shareId]`).
- **`PriorityFixMatrix`**: Component mapping issues into "Fix Immediately", "Plan This Sprint", "Quick Wins", "Backlog".

## 10. Database Changes Required
Create `supabase/agency-schema.sql` defining:
1. `public.clients` (id, user_id, name, company, website, industry, contact, etc.)
2. Add `client_id` foreign key to `public.projects` OR create a mapping table `client_projects`. Since a project already exists, it is easiest to add `client_id` (nullable) to `public.projects`.
3. `public.agency_branding` (id, user_id, agency_name, logo_url, colors, footer text, hide_oditr_branding).
4. `public.client_reports` (id, project_id, source_audit_report_id, branding, report_data, share_id, is_public, expires_at).

## 11. PDF/Export Approach
**Phase 1:** Build a print-optimized, CSS `@media print` ready HTML page for the share link. The agency can hit `Ctrl+P` -> Save as PDF. This is standard, zero-dependency, and extremely reliable.
**Phase 2 (Future):** Introduce Puppeteer or jsPDF if server-side PDF generation is explicitly mandated.

## 12. Risks and Limitations
- **Data Privacy**: Shareable links bypass RLS by design (for public viewing). Must ensure the `client_reports` table only exposes safe, aggregated JSON, not underlying project keys.
- **Auth Missing**: We will rely on the existing `getSupabaseUser()` pseudo-auth. If a user is not logged in, we will handle them as "anonymous" or enforce strict local-storage fallbacks if Supabase is offline.
- **Complexity**: Building a dynamic report builder with multiple sections is UI-heavy. We must keep the component architecture modular.

## 13. Safe Implementation Order
1. **Database Schema**: Execute `agency-schema.sql` and update `projects`.
2. **Backend Services (Clients & Branding)**: `client-service.ts` and `branding-service.ts` + API routes.
3. **Frontend Management**: Client Dashboard and Branding Settings UI.
4. **Backend Services (Report Builder)**: `report-builder-service.ts` + share ID generation.
5. **Frontend Report Builder**: UI to select report type (Executive, Technical, etc.) and generate it.
6. **Shareable Client Report View**: The actual public facing report page (`/reports/share/[shareId]`) with CSS Print optimizations.
