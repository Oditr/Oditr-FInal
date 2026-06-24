-- ──────────────────────────────────────────────────────────
-- VitalFix — Supabase Database Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- Scan history table matching StoredScan interface
create table if not exists public.scans (
  id                     text primary key,
  user_id                uuid references auth.users(id) on delete cascade,
  workspace_id           text references public.workspaces(id) on delete cascade,
  url                    text not null,
  strategy               text not null,
  fetched_at             timestamptz not null,
  health_score           integer not null,
  scores                 jsonb,           -- { performance, accessibility, bestPractices, seo }
  cwv_summary            jsonb,           -- { lcp, inp, cls, fcp, ttfb, tbt, si }
  custom_audit_score     integer,
  total_findings         integer default 0,
  critical               integer default 0,
  moderate               integer default 0,
  minor                  integer default 0,
  field_overall_category text,
  partial                boolean default false,
  created_at             timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_workspace_id on public.scans(workspace_id);
create index if not exists idx_scans_user_url on public.scans(user_id, url);
create index if not exists idx_scans_fetched_at on public.scans(user_id, fetched_at desc);

-- ── Row Level Security ──
alter table public.scans enable row level security;

-- Users can read scans in their workspace or their own scans
create policy "Users can read own or workspace scans"
  on public.scans for select
  using (
    auth.uid() = user_id OR
    exists (select 1 from public.workspace_members wm where wm.workspace_id = scans.workspace_id and wm.user_id = auth.uid())
  );

-- Users can insert scans (bound to their workspace or user)
create policy "Users can insert own or workspace scans"
  on public.scans for insert
  with check (
    auth.uid() = user_id OR
    exists (select 1 from public.workspace_members wm where wm.workspace_id = scans.workspace_id and wm.user_id = auth.uid())
  );

-- Users can delete their own scans or if they are admin in workspace
create policy "Users can delete own or workspace scans"
  on public.scans for delete
  using (
    auth.uid() = user_id OR
    exists (select 1 from public.workspace_members wm where wm.workspace_id = scans.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin'))
  );
