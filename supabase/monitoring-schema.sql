-- ──────────────────────────────────────────────────────────
-- Øditr — Monitoring & Regression Detection Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Monitored Projects ──
create table if not exists public.projects (
  id                   text primary key,
  user_id              uuid references auth.users(id) on delete cascade,
  workspace_id         text references public.workspaces(id) on delete cascade,
  name                 text not null,
  url                  text not null,
  normalized_domain    text not null,
  business_type        text,
  currency             text default 'USD',
  monitoring_enabled   boolean default false,
  monitoring_frequency text default 'manual',  -- manual | daily | weekly | monthly
  last_scan_at         timestamptz,
  next_scan_at         timestamptz,
  last_report_id       text,
  last_overall_score   integer,
  status               text default 'active',  -- active | paused | error
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_projects_workspace on public.projects(workspace_id);
create index if not exists idx_projects_due on public.projects(monitoring_enabled, next_scan_at)
  where monitoring_enabled = true;

-- RLS
alter table public.projects enable row level security;

create policy "Users can read workspace projects"
  on public.projects for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()));

create policy "Users can insert workspace projects"
  on public.projects for insert
  with check (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()));

create policy "Users can update workspace projects"
  on public.projects for update
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()));

create policy "Users can delete workspace projects"
  on public.projects for delete
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));


-- ── Audit Reports (full snapshots for comparison) ──
create table if not exists public.audit_reports (
  id                      text primary key,
  project_id              text not null references public.projects(id) on delete cascade,
  user_id                 uuid references auth.users(id) on delete cascade,
  workspace_id            text references public.workspaces(id) on delete cascade,
  url                     text not null,
  overall_score           integer not null,
  category_scores         jsonb,
  cwv                     jsonb,          -- { lcp, cls, inp, fcp, tbt, si, ttfb }
  issues                  jsonb default '[]',
  revenue_impact_summary  jsonb,
  ai_readiness_summary    jsonb,
  lighthouse_scores       jsonb,          -- { performance, accessibility, bestPractices, seo }
  scan_status             text default 'complete',  -- complete | partial | failed
  scan_duration           integer default 0,
  error_info              text,
  created_at              timestamptz default now()
);

create index if not exists idx_audit_reports_project on public.audit_reports(project_id, created_at desc);
create index if not exists idx_audit_reports_user on public.audit_reports(user_id);
create index if not exists idx_audit_reports_workspace on public.audit_reports(workspace_id);

-- RLS
alter table public.audit_reports enable row level security;

create policy "Users can read workspace audit reports"
  on public.audit_reports for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_reports.workspace_id and wm.user_id = auth.uid()));

create policy "Users can insert workspace audit reports"
  on public.audit_reports for insert
  with check (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_reports.workspace_id and wm.user_id = auth.uid()));

create policy "Users can delete workspace audit reports"
  on public.audit_reports for delete
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_reports.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));


-- ── Regression Reports (comparison results) ──
create table if not exists public.regression_reports (
  id                     text primary key,
  project_id             text not null references public.projects(id) on delete cascade,
  user_id                uuid references auth.users(id) on delete cascade,
  workspace_id           text references public.workspaces(id) on delete cascade,
  previous_report_id     text not null,
  current_report_id      text not null,
  overall_score_delta    integer,
  previous_score         integer,
  current_score          integer,
  category_score_deltas  jsonb,
  vitals_deltas          jsonb,
  revenue_risk_delta     numeric,
  ai_readiness_delta     integer,
  new_issues             jsonb default '[]',
  resolved_issues        jsonb default '[]',
  worsened_issues        jsonb default '[]',
  improved_issues        jsonb default '[]',
  severity               text not null,    -- critical_regression | high_regression | ...
  summary                text,
  recommended_actions    jsonb default '[]',
  alert_payload          jsonb,
  confidence             text default 'medium',
  created_at             timestamptz default now()
);

create index if not exists idx_regression_reports_project on public.regression_reports(project_id, created_at desc);
create index if not exists idx_regression_reports_workspace on public.regression_reports(workspace_id);

-- RLS
alter table public.regression_reports enable row level security;

create policy "Users can read workspace regression reports"
  on public.regression_reports for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = regression_reports.workspace_id and wm.user_id = auth.uid()));

create policy "Users can insert workspace regression reports"
  on public.regression_reports for insert
  with check (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = regression_reports.workspace_id and wm.user_id = auth.uid()));
