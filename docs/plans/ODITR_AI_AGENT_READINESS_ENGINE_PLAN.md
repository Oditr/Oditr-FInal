# Øditr AI-Agent Readiness Engine — Implementation Plan

## 1. Current audit architecture
The audit engine lives in `src/lib/audit-engine/`. An orchestrator (`index.ts`) fetches a page once, parses with Cheerio, then runs 9 modules in parallel (broken-links, images, assets, meta-tags, headings, security, mobile, accessibility, ai-readiness). Results flow through `scorer.ts` → `issue-normalizer.ts` and are served via `GET /api/audit/full`.

## 2. Existing SEO/crawler logic
- `meta-tags.ts`: Checks title, description, OG, Twitter, canonical, favicon, charset.
- `headings.ts`: Validates H1 count, heading hierarchy, empty headings.
- No dedicated robots.txt parsing beyond the basic check in `ai-readiness.ts`.

## 3. Existing robots.txt/sitemap checks
The current `ai-readiness.ts` does a basic regex check on robots.txt for 4 AI crawlers (GPTBot, ClaudeBot, Google-Extended, PerplexityBot). No sitemap.xml validation exists.

## 4. Existing structured data checks
`ai-readiness.ts` checks `$('script[type="application/ld+json"]').length > 0` — a simple exists/missing boolean. No schema type detection, field validation, or quality scoring.

## 5. Existing accessibility checks
`accessibility.ts` checks: html lang, img alt, form labels, button names, ARIA landmarks (main, nav, header), skip links, generic link text, tabindex abuse. These are reusable as "accessibility tree signals" for AI readiness.

## 6. Where the AI-Agent Readiness Engine should connect
Replace the current lightweight `ai-readiness.ts` with a full engine composed of sub-services. The orchestrator will import the new top-level `checkAiReadiness` which internally runs all sub-checks. The output feeds through the existing `issue-normalizer.ts` and `scorer.ts` pipeline.

## 7. Backend modules to create
- `src/lib/audit-engine/ai-readiness/llms-txt.ts` — Deep llms.txt analysis
- `src/lib/audit-engine/ai-readiness/robots-analysis.ts` — Full robots.txt AI crawler analysis
- `src/lib/audit-engine/ai-readiness/sitemap-discovery.ts` — Sitemap and page discoverability
- `src/lib/audit-engine/ai-readiness/schema-analysis.ts` — Structured data deep analysis
- `src/lib/audit-engine/ai-readiness/semantic-html.ts` — Semantic HTML quality
- `src/lib/audit-engine/ai-readiness/renderability.ts` — JS dependency / CSR warnings
- `src/lib/audit-engine/ai-readiness/content-clarity.ts` — Content purpose clarity
- `src/lib/audit-engine/ai-readiness/scoring.ts` — AI readiness scoring (weighted 100-point scale)
- `src/lib/audit-engine/ai-readiness/index.ts` — Orchestrator that calls sub-services

## 8. Frontend components to create
- `src/app/dashboard/AIReadinessTab.tsx` — New dashboard tab

## 9. Database/report fields needed
The existing Supabase `public_reports` table stores JSON blobs (`categoryScores`, `issues`). The new AI readiness data will flow through these existing fields. No schema migration needed.

## 10. Risks and limitations
- Network requests to `/llms.txt`, `/robots.txt`, `/sitemap.xml` add latency. Mitigated with parallel fetching + 5s timeouts.
- Large sitemaps could be slow to parse. Mitigated by reading only the first 500KB.
- Structured data validation is best-effort without a full JSON-LD validator library.
- Renderability checks from static HTML are heuristic — we cannot truly detect CSR issues without a headless browser.

## 11. Implementation order
1. Create `ai-readiness/` sub-directory with all service modules
2. Wire up the new orchestrator as the replacement for old `ai-readiness.ts`
3. Add `experimental` field to `AuditIssue` type
4. Update `issue-normalizer.ts` to pass through `experimental` and `businessImpactCategory`
5. Create `AIReadinessTab.tsx` dashboard component
6. Wire tab into the dashboard page
