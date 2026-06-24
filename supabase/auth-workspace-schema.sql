-- ──────────────────────────────────────────────────────────
-- Øditr — Authentication, Workspaces & Permissions Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Workspaces ──
create table if not exists public.workspaces (
  id             text primary key, -- e.g., 'ws_abc123'
  name           text not null,
  slug           text not null unique,
  type           text not null default 'individual', -- individual, startup, agency, enterprise
  owner_id       uuid not null references auth.users(id) on delete cascade, -- Main creator
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- RLS
alter table public.workspaces enable row level security;

-- We will allow reading a workspace if the user is a member
create policy "Users can read their workspaces"
  on public.workspaces for select
  using (exists (
    select 1 from public.workspace_members wm 
    where wm.workspace_id = id and wm.user_id = auth.uid()
  ));

create policy "Owners can update workspace"
  on public.workspaces for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── Workspace Members ──
create table if not exists public.workspace_members (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   text not null references public.workspaces(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           text not null default 'member', -- owner, admin, member, viewer, client_viewer
  status         text not null default 'active', -- active, invited, removed
  invited_by     uuid references auth.users(id) on delete set null,
  invited_at     timestamptz default now(),
  joined_at      timestamptz default now(),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(workspace_id, user_id)
);

-- RLS
alter table public.workspace_members enable row level security;

create policy "Users can view members of their workspaces"
  on public.workspace_members for select
  using (exists (
    select 1 from public.workspace_members self 
    where self.workspace_id = workspace_members.workspace_id and self.user_id = auth.uid()
  ));

-- ── Invites ──
create table if not exists public.invites (
  id             text primary key,
  workspace_id   text not null references public.workspaces(id) on delete cascade,
  email          text not null,
  role           text not null default 'member',
  token_hash     text not null unique,
  invited_by     uuid not null references auth.users(id) on delete cascade,
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  created_at     timestamptz default now(),
  unique(workspace_id, email)
);

-- RLS
alter table public.invites enable row level security;

create policy "Workspace admins can read invites"
  on public.invites for select
  using (exists (
    select 1 from public.workspace_members wm 
    where wm.workspace_id = invites.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
  ));

-- ── API Tokens (CI/CD) ──
create table if not exists public.api_tokens (
  id             text primary key,
  workspace_id   text not null references public.workspaces(id) on delete cascade,
  project_id     text, -- optional scope
  name           text not null,
  token_hash     text not null unique,
  scopes         text[] not null default '{"audits.run"}',
  last_used_at   timestamptz,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  created_by     uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz default now()
);

-- RLS
alter table public.api_tokens enable row level security;

create policy "Workspace admins can manage API tokens"
  on public.api_tokens for all
  using (exists (
    select 1 from public.workspace_members wm 
    where wm.workspace_id = api_tokens.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
  ));
