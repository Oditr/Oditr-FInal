# Øditr — Feature Matrix

> **Detailed build guide:** See [ODITR_FUTURE_BUILD_REFERENCE.md](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md) for exact file paths, SQL schemas, and step-by-step instructions.

---

## ✅ Implemented Features

| Feature | Location | Status |
|---------|----------|--------|
| URL input scanner | `src/app/dashboard/page.tsx` | ✅ Live |
| Lighthouse / PSI integration | `src/lib/psi-pool.ts` | ✅ Live |
| Core Web Vitals display | `src/app/dashboard/OverviewTab.tsx` | ✅ Live |
| Technical SEO checks (basic) | `src/lib/audit-engine/meta-tags.ts` | ✅ Live |
| Accessibility checks (basic) | `src/lib/audit-engine/accessibility.ts` | ✅ Live |
| Security headers checks (basic) | `src/lib/audit-engine/security.ts` | ✅ Live |
| Broken links checker | `src/lib/audit-engine/broken-links.ts` | ✅ Live |
| Image optimization checker | `src/lib/audit-engine/images.ts` | ✅ Live |
| Mobile responsiveness checks | `src/lib/audit-engine/mobile.ts` | ✅ Live |
| Issue severity scoring | `src/lib/intelligence/prioritization-engine.ts` | ✅ Live |
| Developer fix snippets | `src/lib/intelligence/fix-generation-engine.ts` | ✅ Live |
| Intelligence engine | `src/lib/intelligence/index.ts` | ✅ Live |
| Report history (scan-store) | `src/lib/scan-store.ts` | ✅ Live |
| Regression detection | `src/lib/intelligence/regression-engine.ts` | ✅ Live |
| Revenue Impact Engine (core) | `src/lib/revenue-impact/` | ✅ Live |
| Business profile form | `src/components/revenue-impact/BusinessProfileForm.tsx` | ✅ Live |
| Revenue dashboard tab | `src/components/revenue-impact/RevenueImpactTab.tsx` | ✅ Live |
| Shareable report page | `src/app/report/` | ✅ Live |
| PDF export | `src/lib/pdf-export.ts` | ✅ Live |
| API key system | `src/lib/api-auth.ts` | ✅ Live |
| Teams / multi-tenant | `supabase/teams-schema.sql` | ✅ Live |

## ❌ Pending Features (with Build References)

| Feature | Reference | Priority |
|---------|-----------|----------|
| Revenue Impact — DB persistence | [§1.1–§1.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#11-supabase-persistence-for-business-profiles) | High |
| Revenue Impact — historical charts | [§1.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#13-historical-revenue-impact-comparison-charts) | Medium |
| AI-Agent Readiness score | [§2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#2-ai-agent-readiness-module) | High |
| Deep SEO (sitemap, structured data) | [§3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#3-technical-seo--deep-checks) | High |
| Security expansion (CORS, mixed content) | [§4](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#4-security--protocol-auditing--expansion) | Medium |
| Accessibility expansion (contrast, keyboard) | [§5](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#5-accessibility--expansion) | Medium |
| Scheduled monitoring | [§6.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#61-scheduled-audit-configuration) | Medium |
| Alerts (Email/Slack/Discord) | [§6.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#62-alert-system-email--slack--discord) | Medium |
| GitHub Action CI/CD | [§7.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#71-github-action) | Low |
| RUM script | [§8](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#8-rum-real-user-monitoring) | Low |
| White-label agency reports | [§9.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#91-white-label-pdf-reports) | Low |
| Interactive Playwright audits | [§9.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#93-interactive-playwright-audits) | Low |

## Features to Avoid in v1
- Backlink checker & keyword rank tracker
- Full Semrush/Ahrefs replacement
- Full Datadog-style logs infrastructure or session replay
- AMP-focused auditing
- Overcomplicated dashboard
