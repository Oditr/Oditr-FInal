-- ── VitalFix RUM Pre-aggregation ──

-- This creates a materialized view to aggregate RUM events per site per day.
-- This optimizes the /api/rum/summary endpoint which otherwise would scan millions of rows.

CREATE MATERIALIZED VIEW IF NOT EXISTS rum_daily_summary AS
SELECT
    site_id,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS total_events,
    
    -- LCP Aggregations
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp_value) AS lcp_p75,
    AVG(lcp_score) AS lcp_avg_score,
    
    -- CLS Aggregations
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls_value) AS cls_p75,
    AVG(cls_score) AS cls_avg_score,
    
    -- INP Aggregations
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY inp_value) AS inp_p75,
    AVG(inp_score) AS inp_avg_score,
    
    -- TTFB Aggregations
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ttfb_value) AS ttfb_p75,
    AVG(ttfb_score) AS ttfb_avg_score,

    -- Overall Health Score proxy (average of metric scores)
    AVG((COALESCE(lcp_score, 0) + COALESCE(cls_score, 0) + COALESCE(inp_score, 0) + COALESCE(ttfb_score, 0)) / NULLIF(
      (CASE WHEN lcp_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN cls_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN inp_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN ttfb_score IS NOT NULL THEN 1 ELSE 0 END), 0
    )) AS avg_health_score

FROM rum_events
GROUP BY site_id, DATE_TRUNC('day', created_at);

-- Create a unique index so we can refresh the view concurrently
CREATE UNIQUE INDEX IF NOT EXISTS idx_rum_daily_summary_site_day ON rum_daily_summary(site_id, day);

-- ── Setup pg_cron to refresh the view every hour ──
-- Requires pg_cron extension to be enabled in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'refresh-rum-summary',
    '0 * * * *', -- Every hour at minute 0
    $$ REFRESH MATERIALIZED VIEW CONCURRENTLY rum_daily_summary $$
);

-- RLS for the materialized view isn't supported directly, so we must 
-- wrap queries in a secure function or handle RLS in the API endpoint.
