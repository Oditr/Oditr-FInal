-- Onboarding & Activation Schema

create table if not exists public.user_profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  role_type         text, -- 'founder', 'developer', 'agency', 'ecommerce', 'seo', 'other'
  primary_goal      text, -- 'purchase', 'lead_form', 'signup', etc.
  experience_level  text,
  company_type      text,
  team_size         text,
  preferred_usecase text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists public.onboarding_state (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  workspace_id         text references public.workspaces(id) on delete set null,
  current_step         text default 'welcome',
  completed_steps      text[] default '{}',
  skipped_steps        text[] default '{}',
  activation_score     integer default 0,
  first_project_id     text references public.projects(id) on delete set null,
  first_audit_report_id text references public.reports(id) on delete set null,
  is_completed         boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- RLS for user_profiles
alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

-- RLS for onboarding_state
alter table public.onboarding_state enable row level security;

create policy "Users can view their own onboarding state"
  on public.onboarding_state for select
  using (auth.uid() = user_id);

create policy "Users can update their own onboarding state"
  on public.onboarding_state for update
  using (auth.uid() = user_id);

create policy "Users can insert their own onboarding state"
  on public.onboarding_state for insert
  with check (auth.uid() = user_id);
