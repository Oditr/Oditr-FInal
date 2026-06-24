# Core Audit Intelligence Engine - Implementation Plan

## 1. Current audit system
Currently, Øditr runs an orchestrated audit engine (`src/lib/audit-engine/index.ts`) that runs Lighthouse (PageSpeed Insights API via `src/lib/psi-pool.ts`) and a Custom Audit Engine in parallel.
The Custom Audit Engine runs 8 modular checks (`broken-links`, `images`, `assets`, `meta-tags`, `headings`, `security`, `mobile`, `accessibility`) via `cheerio` HTML parsing.

## 2. Current frontend report/dashboard structure
The main shared report view is at `src/app/report/[id]/page.tsx`. It displays:
- Overall Health Score (combination of Lighthouse + Custom Audit)
- 4 Lighthouse Category Scores (Performance, Accessibility, Best Practices, SEO)
- Core Web Vitals (LCP, INP, CLS, FCP, TTFB, TBT)
- Top Issues (sliced to top 5)
- Custom findings summary (Critical, Moderate, Minor counts)

## 3. Current backend audit routes/services
The primary route is `src/app/api/audit/full/route.ts`. It takes a URL, runs PSI and Custom Audit with individual timeouts, handles caching, rate limiting, SSRF protection, and plan-based quotas, and returns a unified structure.

## 4. Current data format returned by audits
The result returns a `UnifiedAuditResult` with:
- `lighthouse`: PSI metrics, scores, fieldData, opportunities, diagnostics.
- `customAudit`: Output from custom modules returning `CategoryResult` and `AuditFinding`. The finding schema currently includes `id`, `title`, `description`, `severity`, `category`, `value`, `element`, `recommendation` (with `fix`, `codeSnippet`, `docsUrl`, `estimatedImpact`), and `estimatedUplift`.

## 5. Existing scoring logic
- `calculateHealthScore`: 60% Lighthouse Performance, 40% Custom Audit Score.
- `calculateOverallScore` (Custom Audit): Weighted average of the 8 custom categories.

## 6. Existing missing areas
- **Unified Issue Schema**: Needs to normalize BOTH Lighthouse and Custom Audit results into the exact requested structure (including fields like `revenueRelevant`, `affectedUrl`, `evidence`, `impact`, `fixDifficulty`).
- **AI-Agent Readiness**: Needs a basic module to check `llms.txt`, `robots.txt`, and basic AI crawler blocks.
- **New Scoring Formula**: Performance 25%, SEO 20%, Accessibility 15%, Security 15%, AI-Agent Readiness 10%, Mobile/UX/Images/Broken Links 15%.
- **Revenue Impact Linkage**: Ensuring `businessImpactCategory` and `revenueRelevant` fields are available for the future Revenue Engine.

## 7. What modules need to be created
- `src/lib/audit-engine/ai-readiness.ts`: New module to check `llms.txt` and `robots.txt`.
- `src/lib/audit-engine/issue-normalizer.ts`: Converter to unify PSI and Custom Audit findings into the new `AuditIssue` schema.
- Frontend Panels: `AIAgentReadinessPanel`, `IssueList`, `SeverityBadge`, etc.

## 8. What modules need to be modified
- `src/lib/audit-engine/types.ts`: Update `AuditFinding` / `UnifiedAuditResult` to match the new Unified Issue Schema.
- `src/lib/audit-engine/scorer.ts`: Implement the new scoring formula.
- `src/lib/audit-engine/index.ts`: Add `ai-readiness` to the orchestrated modules.
- `src/lib/audit-engine/recommendations.ts`: Enhance to provide richer snippets and map `fixDifficulty` / `revenueRelevant`.
- `src/app/api/audit/full/route.ts`: Plumb the normalized issues and updated scoring system through the API response.
- `src/app/report/[id]/page.tsx`: Update to display the new category scores and panels.

## 9. What risks exist
- **Timeout/Performance:** Checking `llms.txt` and `robots.txt` adds more network requests. We must fetch these efficiently.
- **Data Volume:** Normalizing *all* Lighthouse issues alongside custom audits might produce huge JSON payloads. We should filter low-value/info PSI audits if the payload grows too large.
- **Frontend Breaking:** The new scoring and data schema may break existing dashboard components that expect `healthScore` to be a certain shape.
- **Database Schema:** Need to ensure the saved JSON in the database tables can accept the new schema without strict type failures.

## 10. Implementation order
1. **Types Update:** Update `types.ts` to include the `Unified Issue Schema` and new category weights.
2. **AI Readiness Module:** Build `ai-readiness.ts` and integrate it into the `audit-engine`.
3. **Issue Normalizer:** Build the normalization logic to convert raw PSI and cheerio data into the new schema.
4. **Scoring Logic:** Update `scorer.ts` to implement the new percentage-based category weights.
5. **API & Database:** Update the `/api/audit/full/route.ts` to return the new format.
6. **Frontend UI:** Build/Update the report dashboard components to render the new Unified Issue Schema and score categories.
