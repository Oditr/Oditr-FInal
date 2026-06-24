-- ──────────────────────────────────────────────────────────
-- Øditr — Agency & White-Label Reporting Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Clients ──
create table if not exists public.clients (
  id             text primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  workspace_id   text references public.workspaces(id) on delete cascade,
  client_name    text not null,
  company_name   text,
  website        text,
  industry       text,
  contact_name   text,
  contact_email  text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_clients_user on public.clients(user_id);
create index if not exists idx_clients_workspace on public.clients(workspace_id);

-- RLS
alter table public.clients enable row level security;

create policy "Users can read workspace clients"
  on public.clients for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = clients.workspace_id and wm.user_id = auth.uid()));

create policy "Users can insert workspace clients"
  on public.clients for insert
  with check (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = clients.workspace_id and wm.user_id = auth.uid()));

create policy "Users can update workspace clients"
  on public.clients for update
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = clients.workspace_id and wm.user_id = auth.uid()));

create policy "Users can delete workspace clients"
  on public.clients for delete
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = clients.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));


-- ── Modify Projects ──
-- Link projects to clients
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='projects' and column_name='client_id'
  ) then
    alter table public.projects add column client_id text references public.clients(id) on delete set null;
  end if;
end $$;


-- ── Agency Branding ──
create table if not exists public.agency_branding (
  id                  text primary key,
  user_id             uuid references auth.users(id) on delete cascade,
  workspace_id        text references public.workspaces(id) on delete cascade unique,
  agency_name         text not null,
  logo_url            text,
  primary_color       text default '#2563eb',
  secondary_color     text default '#1e40af',
  contact_email       text,
  website_url         text,
  footer_text         text,
  hide_oditr_branding boolean default false,
  custom_intro_text   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS
alter table public.agency_branding enable row level security;

create policy "Users can read workspace branding"
  on public.agency_branding for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = agency_branding.workspace_id and wm.user_id = auth.uid()));

create policy "Users can insert workspace branding"
  on public.agency_branding for insert
  with check (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = agency_branding.workspace_id and wm.user_id = auth.uid()));

create policy "Users can update workspace branding"
  on public.agency_branding for update
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = agency_branding.workspace_id and wm.user_id = auth.uid()));


-- ── Client Reports (Shareable) ──
create table if not exists public.client_reports (
  id                     text primary key,
  project_id             text not null references public.projects(id) on delete cascade,
  user_id                uuid references auth.users(id) on delete cascade,
  workspace_id           text references public.workspaces(id) on delete cascade,
  source_audit_report_id text not null references public.audit_reports(id) on delete cascade,
  report_type            text not null, -- executive | technical | custom | before_after
  selected_sections      jsonb not null default '[]',
  title                  text,
  summary                text,
  branding               jsonb, -- Snapshot of branding at generation time
  report_data            jsonb not null, -- Flattened, safe copy of audit/regression data
  share_id               text not null unique, -- Unguessable link identifier
  is_public              boolean default true,
  password_protected     boolean default false,
  expires_at             timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index if not exists idx_client_reports_share on public.client_reports(share_id);
create index if not exists idx_client_reports_user on public.client_reports(user_id);
create index if not exists idx_client_reports_workspace on public.client_reports(workspace_id);

-- RLS
alter table public.client_reports enable row level security;

-- Owner can read/write
create policy "Users can read workspace client reports"
  on public.client_reports for select
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = client_reports.workspace_id and wm.user_id = auth.uid()));

create policy "Users can insert workspace client reports"
  on public.client_reports for insert
  with check (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = client_reports.workspace_id and wm.user_id = auth.uid()));

create policy "Users can update workspace client reports"
  on public.client_reports for update
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = client_reports.workspace_id and wm.user_id = auth.uid()));

create policy "Users can delete workspace client reports"
  on public.client_reports for delete
  using (auth.uid() = user_id OR exists (select 1 from public.workspace_members wm where wm.workspace_id = client_reports.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));

-- Public access based on share_id
create policy "Anyone can read public client reports"
  on public.client_reports for select
  using (is_public = true and (expires_at is null or expires_at > now()));
