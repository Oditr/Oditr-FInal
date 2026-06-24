-- ──────────────────────────────────────────────────────────
-- Oditr — Revenue Impact Results Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.revenue_impact_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_estimated_revenue_at_risk NUMERIC(12,2) DEFAULT 0,
  total_estimated_lead_value_at_risk NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  overall_confidence TEXT NOT NULL DEFAULT 'low',
  issue_impacts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying by user and project
CREATE INDEX IF NOT EXISTS idx_revenue_results_user_project 
  ON public.revenue_impact_results(user_id, project_id, created_at DESC);

-- Row Level Security
ALTER TABLE public.revenue_impact_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own results
CREATE POLICY "Users can read own results"
  ON public.revenue_impact_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own results"
  ON public.revenue_impact_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own results
CREATE POLICY "Users can delete own results"
  ON public.revenue_impact_results FOR DELETE
  USING (auth.uid() = user_id);
