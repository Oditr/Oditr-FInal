# Øditr — Implementation Roadmap

> **Detailed build guide:** See [ODITR_FUTURE_BUILD_REFERENCE.md](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md) for exact file paths, SQL schemas, and step-by-step instructions for every pending feature.

---

## Phase 1: Core Intelligence & Dashboard Foundation ✅ Done
- [x] URL input scanner
- [x] Lighthouse/PageSpeed audit integration (`src/lib/psi-pool.ts`)
- [x] Core Web Vitals display (`src/app/dashboard/OverviewTab.tsx`)
- [x] Technical SEO audit module (`src/lib/audit-engine/meta-tags.ts`)
- [x] Accessibility audit module (`src/lib/audit-engine/accessibility.ts`)
- [x] Security headers audit module (`src/lib/audit-engine/security.ts`)
- [x] Broken links checker (`src/lib/audit-engine/broken-links.ts`)
- [x] Image optimization checker (`src/lib/audit-engine/images.ts`)
- [x] Issue severity scoring (`src/lib/intelligence/prioritization-engine.ts`)
- [x] Developer recommendations & snippets (`src/lib/intelligence/fix-generation-engine.ts`)
- [x] Intelligence engine (`src/lib/intelligence/`)
- [x] Rebranding: VitalFix → Øditr (UI + code identifiers)

## Phase 2: Revenue Impact Engine ✅ Done (Core)
- [x] Business profile intake form (`src/components/revenue-impact/BusinessProfileForm.tsx`)
- [x] Revenue calculator with transparent formulas (`src/lib/revenue-impact/calculator.ts`)
- [x] Assumption engine with labeled defaults (`src/lib/revenue-impact/assumptions.ts`)
- [x] Confidence scoring system (`src/lib/revenue-impact/assumptions.ts`)
- [x] Priority matrix and revenue risk dashboard (`src/components/revenue-impact/RevenueImpactTab.tsx`)
- [x] Dashboard tab integration (`src/app/dashboard/page.tsx`)
- [ ] Supabase persistence for profiles → [§1.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#11-supabase-persistence-for-business-profiles)
- [ ] Supabase persistence for results → [§1.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#12-supabase-persistence-for-revenue-impact-results)
- [ ] Historical revenue comparison charts → [§1.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#13-historical-revenue-impact-comparison-charts)
- [ ] PDF export inclusion → [§1.4](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#14-pdf-export--revenue-impact-section)
- [ ] Inngest auto-trigger → [§1.5](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#15-inngest-auto-trigger-after-audit)

## Phase 3: AI-Agent Readiness ❌ Pending
- [ ] `llms.txt` detection → [§2.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#21-core-ai-agent-readiness-service)
- [ ] `robots.txt` AI bot analysis → [§2.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#22-checks-required)
- [ ] Structured data / schema.org checks → [§2.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#22-checks-required)
- [ ] AI Readiness dashboard tab → [§2.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#23-frontend-panel)

## Phase 4: Deep Audit Expansion ❌ Pending
- [ ] Deep SEO (sitemap, canonicals, Twitter cards) → [§3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#3-technical-seo--deep-checks)
- [ ] Security expansion (CORS, mixed content, Permissions-Policy) → [§4](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#4-security--protocol-auditing--expansion)
- [ ] Accessibility expansion (contrast, focus, keyboard) → [§5](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#5-accessibility--expansion)

## Phase 5: Monitoring & SaaS Layer ❌ Pending
- [ ] User-configurable scheduled audits → [§6.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#61-scheduled-audit-configuration)
- [ ] Email / Slack / Discord alerts → [§6.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#62-alert-system-email--slack--discord)
- [ ] Historical score trend charts → [§6.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#63-historical-score-charts)

## Phase 6: CI/CD & Developer Workflow ❌ Pending
- [ ] GitHub Action → [§7.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#71-github-action)
- [ ] Vercel/Netlify deploy hooks → [§7.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#72-vercel--netlify-deploy-hooks)
- [ ] PR regression comments → [§7.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#73-pr-regression-comments)

## Phase 7: Premium & Enterprise ❌ Pending
- [ ] RUM script + intake API → [§8](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#8-rum-real-user-monitoring)
- [ ] White-label PDF reports → [§9.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#91-white-label-pdf-reports)
- [ ] Agency multi-client dashboard → [§9.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#92-multi-client-dashboard)
- [ ] Interactive Playwright audits → [§9.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#93-interactive-playwright-audits)

## Infrastructure Backlog
- [ ] Env var migration (VITALFIX_ → ODITR_) → [§10.1](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#101-environment-variable-migration)
- [ ] Inngest task ID migration → [§10.2](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#102-inngest-task-id-migration)
- [ ] localStorage key migration → [§10.3](docs/planning/ODITR_FUTURE_BUILD_REFERENCE.md#103-localstorage-key-migration)
