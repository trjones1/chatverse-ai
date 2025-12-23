-- Fix for ambiguous column reference error
-- Run this in Supabase SQL Editor to replace the function

DROP FUNCTION IF EXISTS get_retention_targets();

CREATE OR REPLACE FUNCTION get_retention_targets()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  last_message_at TIMESTAMPTZ,
  hours_since_last_message NUMERIC,
  message_count BIGINT,
  character_key TEXT,
  hit_limit BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_last_messages AS (
    -- Get last message time for each authenticated user
    SELECT
      il.user_id,
      MAX(il.created_at) as last_message_at,
      COUNT(*) as message_count,
      il.character_key,
      COUNT(*) >= 5 as hit_limit
    FROM interaction_log il
    WHERE il.user_id IS NOT NULL
      AND il.role = 'user'
      AND il.created_at >= NOW() - INTERVAL '8 days'
    GROUP BY il.user_id, il.character_key
  ),
  user_info AS (
    SELECT
      ulm.user_id,
      u.email::TEXT,
      ulm.last_message_at,
      EXTRACT(EPOCH FROM (NOW() - ulm.last_message_at)) / 3600 as hours_since,
      ulm.message_count,
      ulm.character_key,
      ulm.hit_limit
    FROM user_last_messages ulm
    JOIN auth.users u ON u.id = ulm.user_id
    WHERE u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
  ),
  recent_retention_emails AS (
    SELECT DISTINCT el.user_id
    FROM email_logs el
    WHERE el.campaign_type LIKE 'retention%'
      AND el.sent_at >= NOW() - INTERVAL '24 hours'
  ),
  unsubscribed_users AS (
    SELECT DISTINCT eu.user_id
    FROM email_unsubscribes eu
  ),
  active_subscribers AS (
    SELECT DISTINCT us.user_id
    FROM user_subscriptions us
    WHERE us.status = 'active'
      AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
  )
  SELECT
    ui.user_id,
    ui.email,
    ui.last_message_at,
    ui.hours_since::NUMERIC,
    ui.message_count,
    ui.character_key,
    ui.hit_limit
  FROM user_info ui
  WHERE ui.user_id NOT IN (SELECT rre.user_id FROM recent_retention_emails rre)
    AND ui.user_id NOT IN (SELECT uu.user_id FROM unsubscribed_users uu)
    AND ui.user_id NOT IN (SELECT asub.user_id FROM active_subscribers asub)
    AND (
      (ui.hours_since >= 24 AND ui.hours_since < 48)
      OR (ui.hours_since >= 72 AND ui.hours_since < 96)
      OR (ui.hours_since >= 168 AND ui.hours_since < 192)
    )
  ORDER BY ui.hours_since DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_retention_targets() TO service_role;
