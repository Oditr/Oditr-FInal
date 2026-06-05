-- ══════════════════════════════════════════════════════════════
-- VitalFix RUM — Database Schema
-- ══════════════════════════════════════════════════════════════
-- This schema stores real user monitoring beacons collected
-- by vf.js and ingested via /api/rum/collect.
--
-- Tables:
--   rum_events   — individual beacon events (high-volume insert)
--   rum_sites    — registered site configurations
--
-- Indexes are tuned for:
--   1. Fast writes (events table is append-only)
--   2. Time-range + siteId queries for aggregation
--   3. Route-level breakdown queries
-- ══════════════════════════════════════════════════════════════

-- ── Registered sites ──
CREATE TABLE IF NOT EXISTS rum_sites (
  id            TEXT PRIMARY KEY,                 -- siteId (matches script config)
  user_id       UUID REFERENCES auth.users(id),   -- owner
  domain        TEXT NOT NULL,                     -- verified domain
  label         TEXT,                              -- display name
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── RUM events (one row per beacon) ──
CREATE TABLE IF NOT EXISTS rum_events (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id         TEXT NOT NULL REFERENCES rum_sites(id),
  session_id      TEXT NOT NULL,
  route           TEXT NOT NULL,

  -- Core Web Vitals (nullable — not every beacon has all metrics)
  lcp_ms          REAL,
  cls_score       REAL,
  inp_ms          REAL,
  fcp_ms          REAL,
  ttfb_ms         REAL,

  -- Device + network context
  device_type     TEXT NOT NULL DEFAULT 'desktop',    -- 'mobile' | 'desktop' | 'tablet'
  connection_type TEXT NOT NULL DEFAULT 'unknown',    -- '4g' | '3g' | 'slow-2g' | etc

  -- Timestamps
  collected_at    TIMESTAMPTZ NOT NULL,  -- when vf.js collected the data
  ingested_at     TIMESTAMPTZ DEFAULT now(),

  -- Partition-friendly constraint
  CONSTRAINT rum_events_collected_at_check CHECK (collected_at > '2024-01-01')
);

-- ── Indexes for common query patterns ──

-- Primary lookup: site + time range (used by aggregator)
CREATE INDEX IF NOT EXISTS idx_rum_events_site_time
  ON rum_events (site_id, collected_at DESC);

-- Route-level breakdown
CREATE INDEX IF NOT EXISTS idx_rum_events_site_route
  ON rum_events (site_id, route, collected_at DESC);

-- Session analysis
CREATE INDEX IF NOT EXISTS idx_rum_events_session
  ON rum_events (site_id, session_id);

-- ── Row-Level Security ──

ALTER TABLE rum_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rum_events ENABLE ROW LEVEL SECURITY;

-- Sites: users can only see their own sites
CREATE POLICY rum_sites_owner ON rum_sites
  FOR ALL USING (user_id = auth.uid());

-- Events: users can only see events for their sites
CREATE POLICY rum_events_owner ON rum_events
  FOR SELECT USING (
    site_id IN (SELECT id FROM rum_sites WHERE user_id = auth.uid())
  );

-- Events: insert is allowed from service role only (API route uses service client)
-- The /api/rum/collect endpoint uses the service role key.

-- ── Helper function: percentile calculation ──
-- PostgreSQL doesn't have a simple p75 aggregate,
-- so we use percentile_cont for aggregation queries.
--
-- Example usage:
--   SELECT percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_ms) AS lcp_p75
--   FROM rum_events
--   WHERE site_id = 'xxx' AND collected_at > now() - interval '7 days';
