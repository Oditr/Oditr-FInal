-- ──────────────────────────────────────────────────────────
-- Øditr — Product Analytics, Feedback & Growth Intelligence
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Product Events ──
create table if not exists public.product_events (
  id              uuid primary key default gen_random_uuid(),
  event_name      text not null,
  user_id         uuid references auth.users(id) on delete set null,
  workspace_id    text,
  project_id      text,
  session_id      text,
  properties      jsonb not null default '{}',
  created_at      timestamptz default now()
);

create index if not exists idx_product_events_user     on public.product_events(user_id);
create index if not exists idx_product_events_name     on public.product_events(event_name);
create index if not exists idx_product_events_ws       on public.product_events(workspace_id);
create index if not exists idx_product_events_created  on public.product_events(created_at desc);

-- ── Feedback ──
create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  workspace_id    text,
  type            text not null default 'general',
    -- general | bug | feature_request | pricing | onboarding | report_quality
  message         text not null,
  rating          integer check (rating >= 1 and rating <= 5),
  page            text,
  status          text not null default 'new',
    -- new | reviewed | planned | closed
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_feedback_user    on public.feedback(user_id);
create index if not exists idx_feedback_type    on public.feedback(type);
create index if not exists idx_feedback_status  on public.feedback(status);

-- ── NPS Responses ──
create table if not exists public.nps_responses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  workspace_id    text,
  score           integer not null check (score >= 0 and score <= 10),
  reason          text,
  created_at      timestamptz default now()
);

create index if not exists idx_nps_user on public.nps_responses(user_id);

-- ── Growth Insights (generated/cached) ──
create table if not exists public.growth_insights (
  id              uuid primary key default gen_random_uuid(),
  scope           text not null default 'global', -- global | workspace
  workspace_id    text,
  insight_type    text not null,
    -- activation | conversion | churn_risk | feature_adoption | upgrade_intent
  title           text not null,
  description     text not null,
  metric          jsonb default '{}',
  recommendation  text,
  severity        text default 'info', -- info | warning | critical
  created_at      timestamptz default now()
);

-- ── RLS: product_events ──
alter table public.product_events enable row level security;

-- Only service role can insert (via API routes using service key)
-- Users cannot directly read/write raw events
create policy "Service role full access to product_events"
  on public.product_events
  using (auth.role() = 'service_role');

-- ── RLS: feedback ──
alter table public.feedback enable row level security;

create policy "Users can insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- ── RLS: nps_responses ──
alter table public.nps_responses enable row level security;

create policy "Users can insert own NPS"
  on public.nps_responses for insert
  with check (auth.uid() = user_id);

create policy "Users can read own NPS"
  on public.nps_responses for select
  using (auth.uid() = user_id);

-- ── RLS: growth_insights ──
alter table public.growth_insights enable row level security;

-- Workspace owners can read workspace-scoped insights
-- Global insights are internal only (service role)
create policy "Workspace owners can read workspace insights"
  on public.growth_insights for select
  using (
    scope = 'global' and auth.role() = 'service_role'
    or
    scope = 'workspace' and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role = 'owner'
    )
  );
