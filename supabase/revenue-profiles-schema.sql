-- ──────────────────────────────────────────────────────────
-- Oditr — Revenue Profiles Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL DEFAULT 'other',
  currency TEXT NOT NULL DEFAULT 'USD',
  monthly_visitors INTEGER,
  monthly_sessions INTEGER,
  conversion_rate NUMERIC(5,4),
  average_order_value NUMERIC(12,2),
  average_lead_value NUMERIC(12,2),
  average_customer_value NUMERIC(12,2),
  trial_to_paid_rate NUMERIC(5,4),
  primary_conversion_goal TEXT NOT NULL DEFAULT 'custom',
  important_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Row Level Security
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profiles
CREATE POLICY "Users can read own profiles"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own profiles
CREATE POLICY "Users can insert own profiles"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles"
  ON public.business_profiles FOR DELETE
  USING (auth.uid() = user_id);
