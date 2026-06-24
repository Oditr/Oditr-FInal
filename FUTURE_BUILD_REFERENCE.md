# Øditr - Future Build Reference

This document tracks pending features, technical debt, and ideas for future implementation phases.

## 1. Alerting & Notifications Infrastructure
- **Email Dispatch**: Implement email dispatching in `src/lib/monitoring/alert-service.ts`.
- **Slack/Discord/Webhooks**: Implement dispatch integrations for Slack, Discord, and generic webhooks in `src/lib/monitoring/alert-service.ts`.
- **Scheduled Digests**: Implement the logic for sending scheduled email digests using the existing `digests` database table placeholder.

## 2. Advanced Monitoring & Telemetry
- **Full Real User Monitoring (RUM)**: Expand beyond synthetic checks to track actual user experiences on monitored projects.
- **Session Replay**: Integrate session replay functionality to visualize specific user flows and JavaScript errors.

## 3. DevOps & CI/CD Integrations
- **CI/CD Plugins**: Build GitHub Actions / GitLab CI integrations to run Øditr audits as part of the build pipeline and block deployments if regression thresholds are crossed.

## 4. Enterprise & Agency Features
- **Agency White-Labeling**: Allow agencies to customize reports with their branding, custom domains, and specific messaging.
- **Multi-Tenant Alert Routing**: More complex enterprise alert routing (e.g., routing specific categories of errors to specific teams).

## 5. Global Cron / Scheduling
- **Bypass RLS for Cron**: The current `getDueProjects` uses the standard Supabase client which is bound by RLS. For a true global Vercel cron to check all users' due projects simultaneously, implement a Supabase `service_role` query that fetches all due projects while bypassing RLS, or create an edge function to do this securely.
