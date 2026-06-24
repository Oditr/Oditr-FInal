-- ──────────────────────────────────────────────────────────
-- Øditr — Notifications, Integrations, Audit Logs Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Notifications ──
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    text not null,
  user_id         uuid references auth.users(id) on delete cascade,
  type            text not null,
    -- regression | deployment_failed | audit_complete | billing_failed
    -- limit_reached | invite | report_shared | rum_alert | general
  title           text not null,
  message         text not null,
  severity        text not null default 'info',
    -- info | warning | critical
  source          text,       -- monitoring | deployment_guard | billing | audit | rum | system
  source_id       text,       -- projectId, reportId, etc.
  action_url      text,       -- optional deep-link
  read_at         timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_notifications_user     on public.notifications(user_id);
create index if not exists idx_notifications_ws       on public.notifications(workspace_id);
create index if not exists idx_notifications_unread   on public.notifications(user_id, read_at) where read_at is null;
create index if not exists idx_notifications_created  on public.notifications(created_at desc);

-- ── Notification Preferences ──
create table if not exists public.notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade unique,
  workspace_id      text,
  email_enabled     boolean not null default false,
  in_app_enabled    boolean not null default true,
  slack_enabled     boolean not null default false,
  minimum_severity  text not null default 'info',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_notif_prefs_user on public.notification_preferences(user_id);

-- ── Integrations ──
create table if not exists public.integrations (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    text not null,
  type            text not null,
    -- slack_webhook | discord_webhook | generic_webhook
  name            text not null,
  status          text not null default 'active', -- active | disabled | error
  config          jsonb not null default '{}',
    -- For webhooks: { "url": "...", "events": [...] }
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_integrations_ws on public.integrations(workspace_id);

-- ── Webhook Endpoints ──
create table if not exists public.webhook_endpoints (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    text not null,
  url             text not null,
  events          text[] not null default '{}',
  secret_hash     text,   -- HMAC secret stored as hash — raw secret shown only once
  enabled         boolean not null default true,
  description     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_webhooks_ws on public.webhook_endpoints(workspace_id);

-- ── Webhook Deliveries ──
create table if not exists public.webhook_deliveries (
  id              uuid primary key default gen_random_uuid(),
  webhook_id      uuid references public.webhook_endpoints(id) on delete cascade,
  event_type      text not null,
  payload         jsonb not null default '{}',
  status          text not null default 'pending',
    -- pending | success | failed
  response_code   integer,
  attempt_count   integer not null default 0,
  last_attempt_at timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_webhook_deliveries_endpoint on public.webhook_deliveries(webhook_id);
create index if not exists idx_webhook_deliveries_status   on public.webhook_deliveries(status);

-- ── Audit Logs ──
create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    text not null,
  user_id         uuid references auth.users(id) on delete set null,
  action          text not null,
    -- Examples: user.login | workspace.member_invited | billing.plan_changed
    -- api_token.created | report.shared | project.deleted
  target_type     text,       -- user | workspace | project | report | token | member
  target_id       text,
  metadata        jsonb not null default '{}',
  ip_hash         text,       -- SHA-256 hash of IP — never raw IP
  user_agent      text,
  created_at      timestamptz default now()
);

create index if not exists idx_audit_logs_ws      on public.audit_logs(workspace_id);
create index if not exists idx_audit_logs_user    on public.audit_logs(user_id);
create index if not exists idx_audit_logs_action  on public.audit_logs(action);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- ── RLS Policies ──

-- notifications: users can read/write their own
alter table public.notifications enable row level security;
create policy "Users can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());
create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'service_role');
create policy "Users can mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- notification_preferences: user-scoped
alter table public.notification_preferences enable row level security;
create policy "Users can read own preferences"
  on public.notification_preferences for select
  using (user_id = auth.uid());
create policy "Users can upsert own preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- integrations: workspace members can manage
alter table public.integrations enable row level security;
create policy "Workspace members can view integrations"
  on public.integrations for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );
create policy "Service role full access to integrations"
  on public.integrations
  using (auth.role() = 'service_role');

-- webhook_endpoints: workspace members can manage
alter table public.webhook_endpoints enable row level security;
create policy "Workspace members can view webhooks"
  on public.webhook_endpoints for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );
create policy "Service role full access to webhooks"
  on public.webhook_endpoints
  using (auth.role() = 'service_role');

-- webhook_deliveries: service role only
alter table public.webhook_deliveries enable row level security;
create policy "Service role full access to webhook deliveries"
  on public.webhook_deliveries
  using (auth.role() = 'service_role');

-- audit_logs: workspace owners can read their own
alter table public.audit_logs enable row level security;
create policy "Workspace owners can read audit logs"
  on public.audit_logs for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "Service role full access to audit logs"
  on public.audit_logs
  using (auth.role() = 'service_role');
