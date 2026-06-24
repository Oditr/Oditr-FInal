# Øditr Billing, Usage Metering & SaaS Access Control Engine Plan

## 1. Current Auth/User System
- **Authentication**: Handled via Supabase Auth.
- **User Profiles**: Stored in `public.profiles` which maps 1-to-1 with `auth.users`. Contains `plan` (free/starter/pro/enterprise), `stripe_customer_id`, `stripe_subscription_id`, and basic daily usage counters (`daily_audit_count`, `daily_audit_reset`).

## 2. Current Project/User Model
- Users own projects via the `public.projects` table (`user_id` foreign key). Row Level Security ensures users can only see their own projects.
- There is currently no hard-coded limit check on the number of projects a user can create in the API route, although the plans define it theoretically.

## 3. Current Audit/Report Usage
- Audits are stored in `public.audit_reports`. 
- Usage is metered using `checkQuota()` in `src/lib/plans.ts`, which restricts based on a `daily_audit_limit` (e.g., 5 for free tier). 
- Usage counter is reset based on `daily_audit_reset` timestamp mismatch.

## 4. Current Database Structure
- `profiles`: Holds plan and Stripe IDs.
- `projects`: Monitored websites.
- `audit_reports`: Snapshot data of audits.
- `regression_reports`: Monitoring comparisons.
- `rum_events`: RUM metrics.
- `agency_branding` & `clients` & `client_reports`: Agency tier features.

## 5. Current Pricing or Plan Logic
- Defined statically in `src/lib/plans.ts` (`PLANS` constant).
- Tiers: Free, Starter, Pro, Enterprise.
- Tracks `monthlyPrice`, `yearlyPrice`, `dailyAuditLimit`, `historyRetentionDays`, `shareableReportsLimit`.

## 6. Current Frontend Upgrade/Paywall UI
- `/pricing` page exists to trigger checkout.
- Basic upgrade prompt logic exists in `getUpgradeMessage()` inside `plans.ts`, but comprehensive feature-gated UI components (LockedFeatureCard, UsageDashboard) are missing.

## 7. Existing Payment Integration
- Basic Stripe checkout session creation (`/api/stripe/checkout`).
- Basic Stripe webhook handler (`/api/stripe/webhook`) that updates `stripe_subscription_id` and `plan` in the `profiles` table.

## 8. Backend Modules Required
- `billingProviderService` (Adapter interface for Stripe, Razorpay, Manual)
- `planService` (Config and DB access)
- `subscriptionService` (Status, billing period tracking)
- `usageMeteringService` (Increment, reset, limit checking)
- `featureAccessService` (Gatekeepers)
- `upgradeRecommendationService`

## 9. Frontend Components Required
- `UsageDashboard` / `BillingSettings` (Overview of current plan and usage meters)
- `PlanCard` & `PricingPage` (Refined for real SaaS limits)
- `FeatureGate` (Wrapper to lock UI elements)
- `LockedFeatureCard` / `UpgradeModal` (Graceful upgrade paths)

## 10. Database Changes Required
Create `billing-schema.sql`:
1. `public.subscriptions` (status, period_start, period_end, cancel_at_period_end)
2. `public.usage_records` (feature_key, quantity, billing_period)
3. `public.billing_events` (for idempotency and audit logs)
*Note*: We will migrate from the simple `profiles.plan` daily limit to monthly limits tied to the subscription's billing period.

## 11. Payment Provider Approach
- **Adapter Pattern**: We will define an abstract `BillingProvider` interface. 
- **Stripe Implementation**: `stripeBillingProvider` will implement session creation, customer management, and webhook parsing.
- **Manual Implementation**: `manualBillingProvider` for enterprise custom invoicing or local testing without keys.

## 12. Security Risks
- **Client-Side Tampering**: Frontend checks must only be for UI UX; backend must re-verify all usage and feature limits before executing DB inserts or running Puppeteer/Lighthouse.
- **Race Conditions**: Rapid concurrent requests could bypass usage limits if not handled carefully. `usage_records` should ideally aggregate, but `increment` needs to be transactional or rely on Postgres atomic increments.
- **Webhook Spoofing**: Must use strict signature verification (already partially implemented for Stripe). Webhook idempotency is critical to prevent double-processing.

## 13. Safe Implementation Order
1. **Database Schema & Models**: Execute `billing-schema.sql` and update TypeScript definitions.
2. **Provider Abstraction**: Create the `billingProviderService` adapter and migrate existing Stripe code.
3. **Usage Metering Service**: Implement server-side limit tracking for audits, projects, and RUM events.
4. **Feature Access Matrix**: Implement `featureAccessService` to gate monitoring, white-label, etc.
5. **API Routes**: Update or create endpoints (`/api/billing/current`, `/api/access/check`).
6. **Frontend Gateways**: Wrap existing UI components in `<FeatureGate>` and implement `UpgradeModal`.
7. **Frontend Dashboard**: Build the Usage and Billing management views.
8. **Testing**: Test fallback, manual billing, and Stripe local webhooks.
