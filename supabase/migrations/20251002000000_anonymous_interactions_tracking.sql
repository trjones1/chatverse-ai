-- Anonymous Interactions Tracking
-- Critical: Track all anonymous user chat activity for conversion analytics

-- Create table for anonymous user interactions
CREATE TABLE IF NOT EXISTS public.anonymous_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (fingerprint, session ID, or any anon identifier)
  anonymous_id text NOT NULL,

  -- Character interaction
  character_key text NOT NULL,

  -- Message data
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,

  -- Metadata
  topics text[] DEFAULT '{}',
  emotional_tone text,
  nsfw boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',

  -- Session tracking
  session_id text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),

  -- Indexes for analytics
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_anon_interactions_anonymous_id
  ON public.anonymous_interactions(anonymous_id);

CREATE INDEX IF NOT EXISTS idx_anon_interactions_character
  ON public.anonymous_interactions(character_key);

CREATE INDEX IF NOT EXISTS idx_anon_interactions_created_at
  ON public.anonymous_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anon_interactions_session
  ON public.anonymous_interactions(session_id)
  WHERE session_id IS NOT NULL;

-- Composite index for user activity queries
CREATE INDEX IF NOT EXISTS idx_anon_interactions_user_char_time
  ON public.anonymous_interactions(anonymous_id, character_key, created_at DESC);

-- Enable RLS (but allow all inserts for now since these are anonymous)
ALTER TABLE public.anonymous_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert anonymous interactions
CREATE POLICY "Anyone can insert anonymous interactions"
  ON public.anonymous_interactions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can read all anonymous interactions
CREATE POLICY "Admins can read anonymous interactions"
  ON public.anonymous_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- Add comment
COMMENT ON TABLE public.anonymous_interactions IS
  'Tracks all anonymous user chat interactions for conversion analytics and product insights';

-- Create analytics function for anonymous user engagement
CREATE OR REPLACE FUNCTION get_anonymous_engagement_stats(
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  total_anonymous_users bigint,
  total_messages bigint,
  messages_last_24h bigint,
  avg_messages_per_user numeric,
  character_breakdown jsonb,
  hourly_activity jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz;
  v_24h_ago timestamptz;
BEGIN
  v_start_date := now() - (p_days_back || ' days')::interval;
  v_24h_ago := now() - interval '24 hours';

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT anonymous_id) as unique_users,
      COUNT(*) as total_msgs,
      COUNT(*) FILTER (WHERE created_at >= v_24h_ago) as recent_msgs
    FROM anonymous_interactions
    WHERE created_at >= v_start_date
  ),
  char_stats AS (
    SELECT
      character_key,
      COUNT(*) as message_count,
      COUNT(DISTINCT anonymous_id) as unique_users
    FROM anonymous_interactions
    WHERE created_at >= v_start_date
    GROUP BY character_key
  ),
  hourly_stats AS (
    SELECT
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as message_count
    FROM anonymous_interactions
    WHERE created_at >= v_start_date
    GROUP BY hour
  )
  SELECT
    s.unique_users,
    s.total_msgs,
    s.recent_msgs,
    ROUND(s.total_msgs::numeric / NULLIF(s.unique_users, 0), 2),
    (SELECT jsonb_object_agg(character_key, jsonb_build_object(
      'messages', message_count,
      'users', unique_users
    )) FROM char_stats),
    (SELECT jsonb_object_agg(hour::text, message_count) FROM hourly_stats)
  FROM stats s;
END;
$$;

-- Grant execute permission to authenticated users (for admin dashboard)
GRANT EXECUTE ON FUNCTION get_anonymous_engagement_stats(integer) TO authenticated;

COMMENT ON FUNCTION get_anonymous_engagement_stats IS
  'Analytics function for anonymous user engagement metrics';
