-- ──────────────────────────────────────────────────────────
-- VitalFix — Teams & Workflow Integration
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- 1. Create Teams Table
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now()
);

-- 2. Create Team Members Table
create type team_role as enum ('owner', 'admin', 'member');

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        team_role not null default 'member',
  created_at  timestamptz default now(),
  unique(team_id, user_id)
);

create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);

-- 3. Update Scans Table to support Teams
alter table public.scans add column if not exists team_id uuid references public.teams(id) on delete cascade;
create index if not exists idx_scans_team_id on public.scans(team_id);

-- 4. Projects Table (Grouping inside a team)
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

alter table public.scans add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 5. RLS Policies for Teams
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;

-- Teams: users can read teams they are members of
create policy "Users can read teams they belong to"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Users can create teams"
  on public.teams for insert
  with check (auth.uid() is not null);

-- Team Members: users can read members of their teams
create policy "Users can read members of their teams"
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
    )
  );

-- Projects: users can read/write projects in their teams
create policy "Users can read projects in their teams"
  on public.projects for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = projects.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Users can insert projects in their teams"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.team_members
      where team_members.team_id = projects.team_id
      and team_members.user_id = auth.uid()
      and team_members.role in ('owner', 'admin')
    )
  );

-- Scans: update existing RLS for scans to allow team members to see them
-- First drop existing policy if it conflicts or just add a new OR policy.
-- Easiest is to add a new policy for team scans:
create policy "Users can read team scans"
  on public.scans for select
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

create policy "Users can insert team scans"
  on public.scans for insert
  with check (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );
