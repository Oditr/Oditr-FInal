-- ──────────────────────────────────────────────────────────
-- Øditr — Real User Monitoring (RUM) Schema
-- ──────────────────────────────────────────────────────────

-- ── RUM Project Configs ──
create table if not exists public.rum_configs (
  project_id      text primary key references public.projects(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  enabled         boolean default true,
  allowed_domains jsonb default '[]',  -- List of allowed origin domains for CORS/security
  sample_rate     numeric default 100, -- 0-100 percentage
  retention_days  integer default 30,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- RLS for rum_configs
alter table public.rum_configs enable row level security;

create policy "Users can read own rum configs"
  on public.rum_configs for select
  using (auth.uid() = user_id);

create policy "Users can update own rum configs"
  on public.rum_configs for update
  using (auth.uid() = user_id);

create policy "Users can insert own rum configs"
  on public.rum_configs for insert
  with check (auth.uid() = user_id);

-- ── RUM Events (High Volume) ──
create table if not exists public.rum_events (
  id              uuid primary key default gen_random_uuid(),
  project_id      text not null references public.projects(id) on delete cascade,
  pageview_id     text not null, -- anonymous short-lived id generated client side
  session_id      text not null, -- anonymous short-lived id
  url             text not null,
  path            text not null,
  hostname        text not null,
  metric_name     text not null, -- 'LCP', 'CLS', 'INP', 'FCP', 'TTFB'
  metric_value    numeric not null,
  metric_rating   text not null, -- 'good', 'needs-improvement', 'poor'
  device_type     text,          -- 'mobile', 'tablet', 'desktop'
  browser         text,
  os              text,
  viewport_width  integer,
  viewport_height integer,
  connection_type text,          -- '4g', '3g', etc.
  navigation_type text,          -- 'navigate', 'reload', 'back_forward', 'prerender'
  timestamp       timestamptz not null default now(),
  created_at      timestamptz default now()
);

create index if not exists idx_rum_events_project_time on public.rum_events(project_id, timestamp desc);
create index if not exists idx_rum_events_metric on public.rum_events(metric_name);
create index if not exists idx_rum_events_path on public.rum_events(project_id, path);

-- RLS for rum_events
-- Note: ingestion endpoint runs on server-side and uses admin privileges to bypass RLS for inserts.
-- Selects are protected by RLS.
alter table public.rum_events enable row level security;

create policy "Users can read own rum events"
  on public.rum_events for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );
