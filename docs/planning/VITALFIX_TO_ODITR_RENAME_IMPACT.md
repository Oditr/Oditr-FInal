# VITALFIX TO ØDITR: RENAME IMPACT REPORT

## 1. Executive Summary
This report outlines the impact of renaming the project from **VitalFix** to **Øditr** across the codebase. Due to the deep integration of the brand name into core logic, infrastructure, and storage mechanisms, a blind find-and-replace will cause severe regressions, data loss, and deployment failures.

The renaming will strictly follow these rules:
- **Øditr**: Visible brand text (UI, landing page, headings, marketing copy, meta titles).
- **Oditr**: Normal readable text where special characters are risky (e.g., PDF reports, plain text emails, some meta tags depending on encoding).
- **oditr**: Code identifiers, package names, folders, URLs, slugs, database names, localStorage keys.
- **ODITR**: Environment variable prefixes and constants.

## 2. Risk Areas & Critical Paths (High Danger)
Renaming "vitalfix" in these areas without careful coordination will break the application:

### A. Data Persistence & Local Storage
- **Keys**: `vitalfix-utm`, `vitalfix-synced`, `vitalfix-last-audit`, `vitalfix-scan-history`, `vitalfix-theme`, `vitalfix-lead-shown`, `vitalfix-exit-shown`.
- **Impact**: Changing these keys will reset user preferences, clear their scan history, and wipe their UTM tracking. If we change them, we must implement a one-time migration script or accept state loss.

### B. Infrastructure & Background Jobs
- **Inngest**: `new Inngest({ id: 'vitalfix' })` in `src/lib/inngest/client.ts`.
- **Impact**: Changing the Inngest app ID might orphan running background jobs or require resetting the Inngest dashboard.
- **Analytics Salt**: `ip + '_vitalfix_salt'` in `src/lib/analytics.ts`.
- **Impact**: Changing the salt will invalidate all previously hashed IP addresses, breaking unique visitor analytics.

### C. Database Schemas (Supabase)
- **Files**: Numerous files in `/supabase/` (e.g., `teams-schema.sql`, `rum-schema.sql`, `analytics-schema.sql`) contain comments and possibly schema names referencing VitalFix.
- **Impact**: Altering schema names or paths could break Supabase migrations and existing data.

### D. External Domains & Identifiers
- **URLs**: `https://vitalfix.dev`, `vitalfix.com/api/rum/collect`.
- **Emails**: `hello@vitalfix.dev`.
- **Impact**: Hardcoded URLs must be updated to the new domain, but only after the new domain is purchased and configured. Otherwise, links, canonical tags, and API endpoints will 404.

### E. Environment Variables
- **Vars**: `VITALFIX_LOG_LEVEL`.
- **Impact**: Requires synchronized updates in Vercel/hosting provider before merging the code change.

### F. RUM Script
- **Identifiers**: `USER_AGENT = 'VitalFix-AuditBot...'`, `getVfScriptSource()`.
- **Impact**: If existing clients have installed the `vf.js` snippet on their sites, changing the script name or endpoint paths will break their real-user monitoring.

## 3. Safe to Change (Low Risk - Phase 1)
These areas are purely cosmetic or documentation-focused and can be updated immediately:
- **UI Components**: `src/app/`, `src/components/` (e.g., Navbar text, Footer text, Pricing page copy, Dashboard headers).
- **Meta Tags & SEO**: Titles, descriptions, canonical tags (e.g., in `layout.tsx`, `page.tsx`).
- **Documentation**: `docs/`, `prd.md`, `.gsd/` templates, and `README.md`.
- **Guides & Content**: `src/data/guides.ts` and PDF export text (using "Oditr" to avoid PDF font encoding issues).

## 4. Phased Implementation Strategy

### **Phase 1: Cosmetic Rebrand (Safe)**
*Action: Apply Øditr / Oditr to all user-facing text.*
- Update all `<title>` and `<meta>` tags.
- Update UI components (Navbar, Footer, Modals, Dashboards).
- Update marketing copy, guides, and textual references.
- Use `Oditr` for PDF generator (`src/lib/pdf-export.ts`) to ensure font compatibility.

### **Phase 2: Code Identifiers & Internal Logic (Medium Risk)**
*Action: Apply oditr / ODITR to code variables, functions, and internal references.*
- Rename `computeVitalFixHealthScore` -> `computeOditrHealthScore`.
- Rename local variables, types (`vitalFixScore`), and test descriptions.
- Update internal log statements and agent output text (`VitalFix Agent` -> `Oditr Agent`).
- Keep LocalStorage keys as `vitalfix-*` temporarily to prevent state loss, or write a migration utility.

### **Phase 3: Infrastructure & Breaking Changes (High Risk)**
*Action: Coordinated updates with DevOps and external systems.*
- Update `package.json` names and paths.
- Update `.env` prefixes (`VITALFIX_` -> `ODITR_`).
- Update Inngest ID.
- Update external domains (`vitalfix.dev` -> new domain) once DNS is ready.
- Update Supabase schemas/scripts.

---
**Status**: Pending User Approval. 
**Next Step**: Please review this report. Once approved, I will begin executing **Phase 1 (Cosmetic Rebrand)** safely.
