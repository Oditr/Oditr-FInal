# ODITR Production Launch Checklist
_Generated: 2026-06-24_

Use this checklist to verify that Øditr is ready for a production launch.

---

## 1. Environment Variables & Configuration

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set to production URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set securely (never in frontend)
- [ ] `STRIPE_SECRET_KEY` is set to production live key
- [ ] `STRIPE_WEBHOOK_SECRET` is set to production webhook signing secret
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set to production key
- [ ] `NEXT_PUBLIC_APP_URL` is set to `https://www.oditr.com` or final domain
- [ ] `PRODUCT_ANALYTICS_ENABLED` is set to `true`
- [ ] PostHog / Google Analytics keys are set (if used)

---

## 2. Security Hardening

- [x] **SSRF Protection**: Verified `v1/audit/route.ts` blocks private IPs (`localhost`, `10.x.x.x`, `192.168.x.x`, `169.254.x.x`).
- [ ] **SSRF Coverage**: Ensure any future URL fetcher (e.g., custom crawler) uses the same `BLOCKED_PATTERNS` logic.
- [ ] **Rate Limiting**: Enabled on public API routes (`/api/v1/audit`, `/api/v1/key`).
- [x] **Token Hashing**: `api_tokens` stores only `token_hash`, never plaintext API tokens.
- [x] **Webhook Signatures**: Outbound webhooks include `X-Oditr-Signature` (HMAC-SHA256).
- [ ] **Stripe Webhook Signature**: `stripe.webhooks.constructEvent` is used in `/api/stripe/webhook`.
- [x] **Admin Route Protection**: `/api/admin/*` and `/admin/*` verify system admin status.

---

## 3. Database & RLS

- [ ] **RLS Enabled**: Verify all tables have Row Level Security enabled.
  - `workspaces`, `projects`, `reports`, `profiles`
  - `analytics_events`, `product_events`, `feedback`, `growth_insights`
  - `api_tokens`, `notifications`, `integrations`, `audit_logs`
- [ ] **Indexes**: Ensure indexes exist for foreign keys and common queries (e.g., `workspace_id`, `user_id`, `created_at`).
- [x] **Audit Logging**: `audit_logs` table exists and records key events. IPs are hashed, not stored plaintext.

---

## 4. Performance & Reliability

- [x] **Health Check**: `/api/health` route is live and monitors DB latency.
- [x] **Build Status**: `npm run build` succeeds cleanly (60/60 static/dynamic pages).
- [ ] **PSI API Key**: Google PageSpeed Insights API key is configured (prevents rate limiting from Google).
- [ ] **Timeout Handling**: Audit scans handle 60s+ timeouts gracefully without crashing the server.
- [ ] **Background Jobs**: (Optional) Consider moving heavy audits to a background worker if Vercel serverless functions time out.

---

## 5. User Experience & Testing

- [ ] **Signup Flow**: End-to-end test signup, workspace creation, and onboarding completion.
- [ ] **Stripe Checkout**: End-to-end test upgrading to Pro plan and back down to Free (handling cancellations).
- [ ] **Audit Completeness**: Run an audit on a real site, ensure Revenue Impact and AI Readiness tabs populate.
- [ ] **RUM Ingestion**: Send test RUM events to `/api/rum/collect` and verify they appear in the dashboard.
- [ ] **Email Delivery**: Verify Supabase Auth emails (signup, password reset) are branded and use a custom SMTP server (not the default Supabase generic emails).

---

## 6. Public Pages & Legal

- [ ] **Pricing Page**: Verified all tiers, features, and limits match Stripe products.
- [ ] **Terms of Service**: Published at `/terms` (or external link).
- [ ] **Privacy Policy**: Published at `/privacy` (or external link).
- [ ] **Support Email**: `support@oditr.com` (or similar) is active and receives emails.
- [ ] **Help Center**: `/help` routes to correct documentation.

---

## 7. Final Verification

- Run `npm run lint` and verify zero errors.
- Run `npm run type-check` (tsc) and verify zero errors.
- Deploy to a staging environment (`staging.oditr.com`).
- Perform one final QA pass on staging.
- Deploy to production.
