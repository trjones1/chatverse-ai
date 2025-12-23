-- Active Users and Concurrent Session Tracking
-- This tracks real-time active users and peak concurrent users

-- Table to track active sessions (heartbeat-based)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id text,
  character_key text,
  last_heartbeat timestamptz NOT NULL DEFAULT NOW(),
  first_seen timestamptz NOT NULL DEFAULT NOW(),
  user_agent text,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT NOW(),

  -- Composite unique constraint to prevent duplicates
  CONSTRAINT active_sessions_unique UNIQUE (session_id)
);

-- Table to track peak concurrent users (daily snapshots)
CREATE TABLE IF NOT EXISTS public.concurrent_users_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL DEFAULT NOW(),
  concurrent_count integer NOT NULL,
  authenticated_count integer NOT NULL DEFAULT 0,
  anonymous_count integer NOT NULL DEFAULT 0,
  character_breakdown jsonb DEFAULT '{}',
  is_peak_today boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_heartbeat
  ON public.active_sessions(last_heartbeat DESC);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id
  ON public.active_sessions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_active_sessions_character
  ON public.active_sessions(character_key);

CREATE INDEX IF NOT EXISTS idx_concurrent_stats_recorded_at
  ON public.concurrent_users_stats(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_concurrent_stats_peak_today
  ON public.concurrent_users_stats(is_peak_today) WHERE is_peak_today = true;

-- Function to clean up stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE last_heartbeat < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Function to get current active users count
CREATE OR REPLACE FUNCTION get_current_active_users()
RETURNS TABLE(
  total_active integer,
  authenticated integer,
  anonymous integer,
  by_character jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_auth integer;
  v_anon integer;
  v_chars jsonb;
BEGIN
  -- Clean up stale sessions first
  PERFORM cleanup_stale_sessions();

  -- Get total active (sessions with heartbeat in last 5 minutes)
  SELECT COUNT(*)
  INTO v_total
  FROM public.active_sessions
  WHERE last_heartbeat > NOW() - INTERVAL '5 minutes';

  -- Get authenticated count
  SELECT COUNT(*)
  INTO v_auth
  FROM public.active_sessions
  WHERE last_heartbeat > NOW() - INTERVAL '5 minutes'
    AND user_id IS NOT NULL;

  -- Get anonymous count
  v_anon := v_total - v_auth;

  -- Get breakdown by character
  SELECT jsonb_object_agg(character_key, count)
  INTO v_chars
  FROM (
    SELECT
      COALESCE(character_key, 'unknown') as character_key,
      COUNT(*)::integer as count
    FROM public.active_sessions
    WHERE last_heartbeat > NOW() - INTERVAL '5 minutes'
    GROUP BY character_key
  ) chars;

  RETURN QUERY SELECT v_total, v_auth, v_anon, COALESCE(v_chars, '{}'::jsonb);
END;
$$;

-- Function to record concurrent users snapshot
CREATE OR REPLACE FUNCTION record_concurrent_users_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current record;
  v_today_peak integer;
BEGIN
  -- Get current active users
  SELECT * INTO v_current FROM get_current_active_users();

  -- Get today's peak
  SELECT COALESCE(MAX(concurrent_count), 0)
  INTO v_today_peak
  FROM public.concurrent_users_stats
  WHERE recorded_at > CURRENT_DATE;

  -- Record snapshot
  INSERT INTO public.concurrent_users_stats (
    recorded_at,
    concurrent_count,
    authenticated_count,
    anonymous_count,
    character_breakdown,
    is_peak_today
  ) VALUES (
    NOW(),
    v_current.total_active,
    v_current.authenticated,
    v_current.anonymous,
    v_current.by_character,
    v_current.total_active > v_today_peak
  );

  -- Update previous peak markers for today
  IF v_current.total_active > v_today_peak THEN
    UPDATE public.concurrent_users_stats
    SET is_peak_today = false
    WHERE recorded_at > CURRENT_DATE
      AND id != (
        SELECT id FROM public.concurrent_users_stats
        WHERE recorded_at > CURRENT_DATE
        ORDER BY concurrent_count DESC
        LIMIT 1
      );
  END IF;
END;
$$;

-- Function to get peak concurrent users stats
CREATE OR REPLACE FUNCTION get_peak_concurrent_stats()
RETURNS TABLE(
  current_active integer,
  peak_today integer,
  peak_this_week integer,
  peak_all_time integer,
  peak_today_time timestamptz,
  peak_week_time timestamptz,
  peak_all_time_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current integer;
BEGIN
  -- Get current active
  SELECT total_active INTO v_current FROM get_current_active_users();

  RETURN QUERY
  SELECT
    v_current,
    -- Today's peak
    COALESCE(
      (SELECT concurrent_count FROM public.concurrent_users_stats
       WHERE recorded_at > CURRENT_DATE
       ORDER BY concurrent_count DESC LIMIT 1),
      0
    ),
    -- This week's peak
    COALESCE(
      (SELECT concurrent_count FROM public.concurrent_users_stats
       WHERE recorded_at > DATE_TRUNC('week', NOW())
       ORDER BY concurrent_count DESC LIMIT 1),
      0
    ),
    -- All-time peak
    COALESCE(
      (SELECT concurrent_count FROM public.concurrent_users_stats
       ORDER BY concurrent_count DESC LIMIT 1),
      0
    ),
    -- Today's peak time
    (SELECT recorded_at FROM public.concurrent_users_stats
     WHERE recorded_at > CURRENT_DATE
     ORDER BY concurrent_count DESC LIMIT 1),
    -- This week's peak time
    (SELECT recorded_at FROM public.concurrent_users_stats
     WHERE recorded_at > DATE_TRUNC('week', NOW())
     ORDER BY concurrent_count DESC LIMIT 1),
    -- All-time peak time
    (SELECT recorded_at FROM public.concurrent_users_stats
     ORDER BY concurrent_count DESC LIMIT 1);
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO service_role;
GRANT SELECT, INSERT ON public.concurrent_users_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION get_current_active_users() TO service_role;
GRANT EXECUTE ON FUNCTION record_concurrent_users_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION get_peak_concurrent_stats() TO service_role;

-- Add RLS policies
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concurrent_users_stats ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role can manage active sessions" ON public.active_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage concurrent stats" ON public.concurrent_users_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can only see their own active session
CREATE POLICY "Users can view their own session" ON public.active_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Anonymous users can view by anonymous_id (if we want to show them they're active)
CREATE POLICY "Anonymous can view own session" ON public.active_sessions
  FOR SELECT TO anon USING (anonymous_id IS NOT NULL);
