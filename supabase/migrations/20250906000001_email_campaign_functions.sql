-- Additional functions for email campaign system

-- Function to get inactive users eligible for email campaigns
CREATE OR REPLACE FUNCTION get_inactive_users_for_campaigns(
  min_days integer DEFAULT 7,
  max_days integer DEFAULT 30,
  result_limit integer DEFAULT 100
)
RETURNS TABLE(
  user_id uuid,
  email_address text,
  days_inactive integer,
  preferred_character text,
  last_activity timestamp with time zone,
  total_conversations integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(ep.email_address, au.email) as email_address,
    EXTRACT(DAY FROM (now() - COALESCE(uat.last_activity, u.created_at)))::integer as days_inactive,
    COALESCE(ep.preferred_character, 'lexi') as preferred_character,
    COALESCE(uat.last_activity, u.created_at) as last_activity,
    COALESCE(es.total_conversations, 0) as total_conversations
  FROM auth.users u
  LEFT JOIN email_preferences ep ON ep.user_id = u.id
  LEFT JOIN (
    SELECT 
      user_id,
      MAX(created_at) as last_activity
    FROM user_activity_tracking
    WHERE activity_type IN ('login', 'chat_message')
    GROUP BY user_id
  ) uat ON uat.user_id = u.id
  LEFT JOIN emotional_states es ON es.user_id = u.id
  WHERE 
    -- User has email preferences (opted in to emails)
    ep.receive_retention_emails = true
    AND ep.unsubscribed_at IS NULL
    -- User is within inactive range
    AND EXTRACT(DAY FROM (now() - COALESCE(uat.last_activity, u.created_at))) BETWEEN min_days AND max_days
    -- Don't send to users who already have pending campaigns
    AND NOT EXISTS (
      SELECT 1 FROM email_campaign_queue ecq
      WHERE ecq.user_id = u.id
      AND ecq.status IN ('scheduled', 'processing')
    )
    -- Don't send to users who received an email recently (within 3 days)
    AND NOT EXISTS (
      SELECT 1 FROM email_sends es_recent
      WHERE es_recent.user_id = u.id
      AND es_recent.sent_at > (now() - INTERVAL '3 days')
      AND es_recent.send_status = 'sent'
    )
  ORDER BY days_inactive DESC, total_conversations DESC
  LIMIT result_limit;
END;
$$;

-- Function to create email preferences when user signs up
CREATE OR REPLACE FUNCTION create_user_email_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
  unsubscribe_token text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Generate unsubscribe token
  unsubscribe_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create default email preferences
  INSERT INTO email_preferences (
    user_id,
    email_address,
    receive_retention_emails,
    receive_character_updates,
    receive_promotional_emails,
    preferred_character,
    unsubscribe_token
  ) VALUES (
    NEW.id,
    user_email,
    true,
    true,
    false, -- Promotional emails off by default
    'lexi',
    unsubscribe_token
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create email preferences for new users
DROP TRIGGER IF EXISTS create_email_preferences_for_new_user ON auth.users;
CREATE TRIGGER create_email_preferences_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_email_preferences();

-- Function to track user login activity for email triggers
CREATE OR REPLACE FUNCTION track_user_login_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert login activity tracking
  INSERT INTO user_activity_tracking (
    user_id,
    activity_type,
    metadata
  ) VALUES (
    NEW.id,
    'login',
    jsonb_build_object(
      'auth_event', 'session_created',
      'timestamp', now()
    )
  );
  
  RETURN NEW;
END;
$$;

-- Note: This trigger would need to be set up on auth events, 
-- but Supabase auth triggers are handled differently.
-- Instead, we'll track this in the application code.

-- Function to get email campaign analytics
CREATE OR REPLACE FUNCTION get_email_campaign_analytics(
  campaign_key_param text DEFAULT NULL,
  date_from timestamp with time zone DEFAULT (now() - INTERVAL '30 days'),
  date_to timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  campaign_key text,
  template_name text,
  character_key text,
  total_sent bigint,
  total_delivered bigint,
  total_opened bigint,
  total_clicked bigint,
  total_bounced bigint,
  delivery_rate numeric,
  open_rate numeric,
  click_rate numeric,
  bounce_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.campaign_key,
    et.template_name,
    ec.character_key,
    COUNT(es.id) as total_sent,
    COUNT(CASE WHEN es.send_status IN ('delivered', 'opened', 'clicked') THEN 1 END) as total_delivered,
    COUNT(CASE WHEN es.send_status IN ('opened', 'clicked') THEN 1 END) as total_opened,
    COUNT(CASE WHEN es.send_status = 'clicked' THEN 1 END) as total_clicked,
    COUNT(CASE WHEN es.send_status = 'bounced' THEN 1 END) as total_bounced,
    ROUND(
      CASE WHEN COUNT(es.id) > 0 
      THEN (COUNT(CASE WHEN es.send_status IN ('delivered', 'opened', 'clicked') THEN 1 END)::numeric / COUNT(es.id)::numeric) * 100 
      ELSE 0 END, 2
    ) as delivery_rate,
    ROUND(
      CASE WHEN COUNT(CASE WHEN es.send_status IN ('delivered', 'opened', 'clicked') THEN 1 END) > 0
      THEN (COUNT(CASE WHEN es.send_status IN ('opened', 'clicked') THEN 1 END)::numeric / 
            COUNT(CASE WHEN es.send_status IN ('delivered', 'opened', 'clicked') THEN 1 END)::numeric) * 100
      ELSE 0 END, 2
    ) as open_rate,
    ROUND(
      CASE WHEN COUNT(CASE WHEN es.send_status IN ('opened', 'clicked') THEN 1 END) > 0
      THEN (COUNT(CASE WHEN es.send_status = 'clicked' THEN 1 END)::numeric / 
            COUNT(CASE WHEN es.send_status IN ('opened', 'clicked') THEN 1 END)::numeric) * 100
      ELSE 0 END, 2
    ) as click_rate,
    ROUND(
      CASE WHEN COUNT(es.id) > 0
      THEN (COUNT(CASE WHEN es.send_status = 'bounced' THEN 1 END)::numeric / COUNT(es.id)::numeric) * 100
      ELSE 0 END, 2
    ) as bounce_rate
  FROM email_campaigns ec
  JOIN email_templates et ON et.id = ec.template_id
  JOIN email_sends es ON es.campaign_id = ec.id
  WHERE 
    es.sent_at BETWEEN date_from AND date_to
    AND (campaign_key_param IS NULL OR ec.campaign_key = campaign_key_param)
  GROUP BY ec.campaign_key, et.template_name, ec.character_key
  ORDER BY total_sent DESC;
END;
$$;

-- Function to clean up old email records (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_email_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete email sends older than 6 months that are not successful
  DELETE FROM email_sends 
  WHERE created_at < (now() - INTERVAL '6 months')
  AND send_status NOT IN ('delivered', 'opened', 'clicked');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old completed/failed campaign queue items
  DELETE FROM email_campaign_queue
  WHERE created_at < (now() - INTERVAL '1 month')
  AND status IN ('sent', 'failed', 'cancelled');
  
  -- Delete old user activity tracking (keep last 3 months)
  DELETE FROM user_activity_tracking
  WHERE created_at < (now() - INTERVAL '3 months');
  
  RETURN deleted_count;
END;
$$;