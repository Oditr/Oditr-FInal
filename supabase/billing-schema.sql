-- ──────────────────────────────────────────────────────────
-- Øditr — Billing, Usage Metering & SaaS Access Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Subscriptions ──
create table if not exists public.subscriptions (
  id                       text primary key,
  user_id                  uuid references auth.users(id) on delete cascade,
  workspace_id             text references public.workspaces(id) on delete cascade unique,
  plan_id                  text not null default 'free',
  status                   text not null default 'active', -- active, trialing, past_due, canceled, unpaid
  provider                 text not null default 'stripe', -- stripe, manual
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_start     timestamptz not null default now(),
  current_period_end       timestamptz not null default (now() + interval '1 month'),
  cancel_at_period_end     boolean default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- RLS
alter table public.subscriptions enable row level security;

create policy "Users can read workspace subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = subscriptions.workspace_id and wm.user_id = auth.uid()));

-- Only service role can modify subscriptions

-- ── Usage Records ──
-- Tracks monthly consumption of limits (e.g. audits, rum_events, projects)
create table if not exists public.usage_records (
  id             text primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  workspace_id   text references public.workspaces(id) on delete cascade,
  feature_key    text not null, -- audit.runs, rum.events, projects.created
  quantity       integer not null default 1,
  billing_period text not null, -- e.g., '2026-06' or linked to subscription period
  metadata       jsonb,
  created_at     timestamptz default now()
);

create index if not exists idx_usage_records_user_period on public.usage_records(user_id, feature_key, billing_period);
create index if not exists idx_usage_records_workspace_period on public.usage_records(workspace_id, feature_key, billing_period);

-- RLS
alter table public.usage_records enable row level security;

create policy "Users can read workspace usage records"
  on public.usage_records for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = usage_records.workspace_id and wm.user_id = auth.uid()));

-- ── Billing Events (Webhook Idempotency) ──
create table if not exists public.billing_events (
  id                text primary key,
  provider          text not null,
  event_type        text not null,
  provider_event_id text not null unique,
  payload           jsonb,
  processed_at      timestamptz default now(),
  created_at        timestamptz default now()
);

-- RLS
alter table public.billing_events enable row level security;
-- No public access
