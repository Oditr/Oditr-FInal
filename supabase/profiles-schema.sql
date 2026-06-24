-- ──────────────────────────────────────────────────────────
-- VitalFix — User Profiles + Plan Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- User profiles with plan and billing info
create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  plan                    text not null default 'free',       -- free | starter | pro | enterprise
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_expires_at         timestamptz,
  daily_audit_count       integer not null default 0,
  daily_audit_reset       date not null default current_date,
  default_workspace_id    text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Index for Stripe customer lookup (webhook handler)
create index if not exists idx_profiles_stripe_customer
  on public.profiles(stripe_customer_id);

-- ── Auto-create profile on user signup ──
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_workspace_id text;
begin
  new_workspace_id := 'ws_' || substr(md5(random()::text), 1, 12);

  -- Create personal workspace
  insert into public.workspaces (id, name, slug, type, owner_id)
  values (new_workspace_id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Workspace', new_workspace_id, 'individual', new.id);

  -- Add user as owner in workspace_members
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  -- Create profile
  insert into public.profiles (id, plan, default_workspace_id)
  values (new.id, 'free', new_workspace_id);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger: fires after auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS policies ──
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (but not plan — only webhook does that)
create policy "Users can update own non-plan fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role (webhook) can do anything — handled by Supabase service key
