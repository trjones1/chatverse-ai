-- Page View Tracking for Bounce Rate Analysis
-- Track every page load to understand true bounce rate (visitors who don't engage)

CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Visitor identification (anonymous or authenticated)
  visitor_id text NOT NULL, -- Can be anon ID or user UUID
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous

  -- Page context
  character_key text NOT NULL,
  page_path text NOT NULL,
  referrer text,

  -- Device/Browser info
  user_agent text,
  device_type text, -- mobile, tablet, desktop

  -- Engagement tracking
  engaged boolean DEFAULT false, -- Set to true when user sends first message
  time_on_page_seconds integer, -- Can be updated via heartbeat

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),

  -- Indexes
  CONSTRAINT valid_character CHECK (character_key IN ('lexi', 'nyx', 'aria', 'zara', 'knox', 'blaze'))
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON public.page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_character ON public.page_views(character_key);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_engaged ON public.page_views(engaged);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id) WHERE user_id IS NOT NULL;

-- Composite index for bounce rate queries
CREATE INDEX IF NOT EXISTS idx_page_views_character_engaged_created
  ON public.page_views(character_key, engaged, created_at DESC);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert page views (tracking)
CREATE POLICY "Anyone can insert page views"
  ON public.page_views
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own page views (for engagement tracking)
CREATE POLICY "Users can update own page views"
  ON public.page_views
  FOR UPDATE
  USING (
    visitor_id = current_setting('request.headers')::json->>'x-visitor-id' OR
    user_id = auth.uid()
  );

-- Policy: Admins can read all page views
CREATE POLICY "Admins can read page views"
  ON public.page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- Analytics function for true bounce rate
CREATE OR REPLACE FUNCTION get_page_view_analytics(
  p_character_key text DEFAULT NULL,
  p_days_back integer DEFAULT 7
)
RETURNS TABLE (
  total_page_views bigint,
  unique_visitors bigint,
  engaged_visitors bigint,
  true_bounce_rate numeric,
  avg_time_on_page numeric,
  authenticated_views bigint,
  anonymous_views bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
BEGIN
  v_start_date := now() - (p_days_back || ' days')::interval;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_views,
      COUNT(DISTINCT visitor_id) as unique_vis,
      COUNT(*) FILTER (WHERE engaged = true) as engaged_count,
      AVG(time_on_page_seconds) FILTER (WHERE time_on_page_seconds IS NOT NULL) as avg_time,
      COUNT(*) FILTER (WHERE user_id IS NOT NULL) as auth_views,
      COUNT(*) FILTER (WHERE user_id IS NULL) as anon_views
    FROM page_views
    WHERE
      created_at >= v_start_date
      AND (p_character_key IS NULL OR character_key = p_character_key)
  )
  SELECT
    total_views,
    unique_vis,
    engaged_count,
    CASE
      WHEN unique_vis > 0 THEN ROUND(((unique_vis - engaged_count)::numeric / unique_vis) * 100, 2)
      ELSE 0
    END as bounce_rate,
    ROUND(avg_time, 2),
    auth_views,
    anon_views
  FROM stats;
END;
$$;

-- Grant execute to authenticated users (for admin dashboard)
GRANT EXECUTE ON FUNCTION get_page_view_analytics(text, integer) TO authenticated;

COMMENT ON TABLE public.page_views IS
  'Tracks all page visits to measure true bounce rate and engagement. Updated when user sends first message.';

COMMENT ON FUNCTION get_page_view_analytics IS
  'Analytics function for page view metrics including true bounce rate (visitors who never engage).';
