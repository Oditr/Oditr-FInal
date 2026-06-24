# Product Analytics, Feedback & Growth Intelligence Engine Plan

## 1. Current Analytics Setup
- **Existing Files**: `src/lib/analytics.ts`, `src/hooks/useAnalytics.ts`, `src/app/api/analytics/route.ts`
- **Current tracking**:
  - Client side: Uses `navigator.sendBeacon` (batched) to `/api/analytics` tracking `page_view`, `feature_use`, `button_click`, `session_start`.
  - Server side: Tracking `audit_run`, `audit_success`, `audit_fail`, etc., tracking IP hashes, and updating `analytics_daily` table for overall system health.
- **Current Limitation**: Analytics are somewhat basic and heavily skewed towards audit engine metrics. They lack a unified user/workspace event schema geared toward funnels, activation, or churn signals.

## 2. Current Auth/Workspace Structure
- Uses Supabase Auth (`auth.users`).
- Custom `profiles` table stores plan, usage, etc.
- Workspaces and Workspace Members manage multi-tenant boundaries.
- Users can switch workspaces via `active_workspace_id` cookie.

## 3. Current Onboarding Flow
- Tracked via `onboarding_state` table containing `is_completed`, `current_step` and `activation_score`.
- Redirect mechanism in place for first-time users.

## 4. Current Billing/Usage System
- `profiles` table tracks `plan`, `stripe_customer_id`, `stripe_subscription_id`, `daily_audit_count`, and `daily_audit_reset`.

## 5. Current Audit/Report Flows
- Handled by Core Audit Engine, triggering `audit_run` and saving reports in JSON blobs.

## 6. Existing Event Tracking
- Mostly `analytics_events` table tracking specific enum types (`audit_run`, `page_view`, etc.). Need a more robust and typed event tracking system specific to user actions (e.g., `user.signed_up`, `onboarding.completed`).

## 7. Existing Feedback Forms
- None currently exist.

## 8. Backend Modules Required
- `src/lib/analytics/product-analytics-service.ts` (Core tracking engine)
- `src/lib/analytics/funnel-service.ts`
- `src/lib/analytics/growth-insights-service.ts`
- `src/lib/analytics/feedback-service.ts`
- `src/app/api/analytics/track/route.ts` (API for clients)
- `src/app/api/feedback/route.ts` (Feedback API)

## 9. Frontend Components Required
- `ProductAnalyticsProvider.tsx` (or update existing `useAnalytics.ts`)
- `FeedbackWidget.tsx`
- `NpsSurveyModal.tsx`
- Dashboard Analytics views (Internal / Admin / Owner scope)

## 10. Database Changes Required
- `product_events` table (Normalized schema for product analytics)
- `feedback` table (To track feature requests, bugs, NPS)
- `growth_insights` table (Optional generated insights)

## 11. Privacy/Security Risks
- **Data Leakage**: Do not log sensitive user data in event properties (PII, tokens, private reports).
- **Abuse**: Feedback endpoints should be rate-limited to prevent spam.
- **Environment control**: Disable analytics tracking in Dev environments by default or via `PRODUCT_ANALYTICS_ENABLED` flag.

## 12. Safe Implementation Order
1. **Database Schema**: Add `product_events` and `feedback` tables via SQL script.
2. **Backend Services**: Implement `product-analytics-service.ts` and `feedback-service.ts`.
3. **API Routes**: Create endpoints for `/api/analytics/track` and `/api/feedback`.
4. **Frontend Tracking**: Update `useAnalytics` or create `useProductAnalytics` hook.
5. **Component Integration**: Inject tracking into onboarding, billing modals, project creation.
6. **Feedback UI**: Create and integrate `FeedbackWidget` and `NpsSurveyModal`.
7. **Growth Engine Analytics (Internal)**: Build funnel calculation scripts and growth insights service/dashboard.

---

### User Review Required
- Please review this plan and let me know if the safe implementation order looks correct or if you'd like to adjust the scope (e.g., limiting the Internal Growth dashboard for this phase).
