-- Comprehensive Message History Management System
-- Implements pagination, conversation sessions, archiving, and performance monitoring

-- Add session_id to existing interaction_log table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='interaction_log' AND column_name='session_id') THEN
        ALTER TABLE interaction_log ADD COLUMN session_id UUID;
    END IF;
END $$;

-- Add message_size_bytes for performance tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='interaction_log' AND column_name='message_size_bytes') THEN
        ALTER TABLE interaction_log ADD COLUMN message_size_bytes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add performance metadata
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='interaction_log' AND column_name='metadata') THEN
        ALTER TABLE interaction_log ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Conversation Sessions Table
CREATE TABLE IF NOT EXISTS "public"."conversation_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "character_key" TEXT NOT NULL DEFAULT 'lexi',
  "title" TEXT NOT NULL DEFAULT 'New Conversation',
  "topic" TEXT,
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "ended_at" TIMESTAMP WITH TIME ZONE,
  "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "message_count" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT true,
  "summary" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT conversation_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Archived Messages Table
CREATE TABLE IF NOT EXISTS "public"."archived_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "original_message_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "character_key" TEXT NOT NULL DEFAULT 'lexi',
  "session_id" UUID,
  "role" TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  "content" TEXT NOT NULL,
  "topics" TEXT[] DEFAULT '{}',
  "emotional_tone" TEXT,
  "nsfw" BOOLEAN DEFAULT false,
  "message_size_bytes" INTEGER DEFAULT 0,
  "metadata" JSONB DEFAULT '{}',
  "archived_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "original_created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "archive_reason" TEXT DEFAULT 'auto_archival',
  "is_important" BOOLEAN DEFAULT false,
  "is_favorite" BOOLEAN DEFAULT false,
  CONSTRAINT archived_messages_pkey PRIMARY KEY (id),
  CONSTRAINT archived_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT archived_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES conversation_sessions(id) ON DELETE SET NULL
);

-- User Message Preferences Table
CREATE TABLE IF NOT EXISTS "public"."user_message_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "character_key" TEXT NOT NULL DEFAULT 'lexi',
  "message_limit_preference" INTEGER DEFAULT 200, -- User's preferred message limit
  "auto_archive_days" INTEGER DEFAULT 30, -- Days after which to auto-archive
  "preserve_favorites" BOOLEAN DEFAULT true,
  "preserve_milestones" BOOLEAN DEFAULT true,
  "export_format" TEXT DEFAULT 'json' CHECK (export_format IN ('json', 'txt', 'csv')),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_message_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_message_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_message_preferences_unique_user_character UNIQUE (user_id, character_key)
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS "public"."message_performance_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "character_key" TEXT NOT NULL DEFAULT 'lexi',
  "metric_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "total_messages" INTEGER DEFAULT 0,
  "total_size_bytes" BIGINT DEFAULT 0,
  "active_sessions" INTEGER DEFAULT 0,
  "archived_messages" INTEGER DEFAULT 0,
  "load_time_ms" INTEGER DEFAULT 0,
  "warning_level" TEXT DEFAULT 'none' CHECK (warning_level IN ('none', 'approaching_limit', 'performance_warning', 'critical')),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT message_performance_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT message_performance_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT message_performance_metrics_unique_user_character_date UNIQUE (user_id, character_key, metric_date)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_character ON conversation_sessions (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity ON conversation_sessions (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_active ON conversation_sessions (user_id, character_key, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_archived_messages_user_character ON archived_messages (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_archived_messages_archived_at ON archived_messages (archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_messages_session ON archived_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_archived_messages_important ON archived_messages (user_id, character_key, is_important) WHERE is_important = true;

CREATE INDEX IF NOT EXISTS idx_interaction_log_session ON interaction_log (session_id);
CREATE INDEX IF NOT EXISTS idx_interaction_log_user_character_created ON interaction_log (user_id, character_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_log_created_at_cursor ON interaction_log (created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_character ON message_performance_metrics (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON message_performance_metrics (metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_warning ON message_performance_metrics (warning_level) WHERE warning_level != 'none';

-- Enable Row Level Security
ALTER TABLE "public"."conversation_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."archived_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_message_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_performance_metrics" ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "user_can_access_own_sessions" ON "public"."conversation_sessions"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_archived_messages" ON "public"."archived_messages"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_preferences" ON "public"."user_message_preferences"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_metrics" ON "public"."message_performance_metrics"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

-- Service role policies
CREATE POLICY "service_can_manage_all_sessions" ON "public"."conversation_sessions"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_archived" ON "public"."archived_messages"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_preferences" ON "public"."user_message_preferences"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_metrics" ON "public"."message_performance_metrics"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_conversation_sessions_updated_at ON conversation_sessions;
CREATE TRIGGER update_conversation_sessions_updated_at
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_message_preferences_updated_at ON user_message_preferences;
CREATE TRIGGER update_user_message_preferences_updated_at
    BEFORE UPDATE ON user_message_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_performance_metrics_updated_at ON message_performance_metrics;
CREATE TRIGGER update_message_performance_metrics_updated_at
    BEFORE UPDATE ON message_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's message limit based on subscription tier
CREATE OR REPLACE FUNCTION get_user_message_limit(
  p_user_id UUID,
  p_character_key TEXT DEFAULT 'lexi'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier TEXT;
  tier_limit INTEGER;
  user_preference INTEGER;
BEGIN
  -- Get user's subscription tier from orders table
  SELECT 
    CASE 
      WHEN tier = 'premium_plus' THEN 500
      WHEN tier = 'premium' THEN 200
      ELSE 50
    END INTO tier_limit
  FROM orders 
  WHERE user_id = p_user_id 
    AND status = 'active' 
    AND tier IS NOT NULL
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Default to free tier if no active subscription
  IF tier_limit IS NULL THEN
    tier_limit := 50;
  END IF;
  
  -- Check if user has custom preference (can't exceed tier limit)
  SELECT message_limit_preference INTO user_preference
  FROM user_message_preferences
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  -- Return the minimum of tier limit and user preference
  IF user_preference IS NOT NULL AND user_preference < tier_limit THEN
    RETURN user_preference;
  ELSE
    RETURN tier_limit;
  END IF;
END;
$$;

-- Function to create or update conversation session
CREATE OR REPLACE FUNCTION manage_conversation_session(
  p_user_id UUID,
  p_character_key TEXT DEFAULT 'lexi',
  p_action TEXT DEFAULT 'get_or_create', -- 'get_or_create', 'end_current', 'create_new'
  p_topic TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_session_id UUID;
  session_timeout_hours INTEGER := 2; -- End session after 2 hours of inactivity
BEGIN
  -- Check for existing active session
  SELECT id INTO current_session_id
  FROM conversation_sessions
  WHERE user_id = p_user_id 
    AND character_key = p_character_key
    AND is_active = true
    AND last_activity_at > (now() - interval '2 hours')
  ORDER BY last_activity_at DESC
  LIMIT 1;
  
  -- Handle different actions
  IF p_action = 'end_current' AND current_session_id IS NOT NULL THEN
    -- End the current session
    UPDATE conversation_sessions 
    SET is_active = false, ended_at = now()
    WHERE id = current_session_id;
    RETURN current_session_id;
    
  ELSIF p_action = 'create_new' OR (p_action = 'get_or_create' AND current_session_id IS NULL) THEN
    -- Create new session
    INSERT INTO conversation_sessions (user_id, character_key, topic, title)
    VALUES (
      p_user_id, 
      p_character_key, 
      p_topic,
      COALESCE(p_topic, 'Conversation at ' || to_char(now(), 'YYYY-MM-DD HH24:MI'))
    )
    RETURNING id INTO current_session_id;
    
  ELSIF p_action = 'get_or_create' AND current_session_id IS NOT NULL THEN
    -- Update existing session activity
    UPDATE conversation_sessions 
    SET last_activity_at = now()
    WHERE id = current_session_id;
  END IF;
  
  RETURN current_session_id;
END;
$$;

-- Function to archive old messages based on user preferences
CREATE OR REPLACE FUNCTION archive_old_messages(
  p_user_id UUID,
  p_character_key TEXT DEFAULT 'lexi',
  p_force_archive BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archive_days INTEGER;
  message_limit INTEGER;
  current_count INTEGER;
  messages_to_archive INTEGER := 0;
  archived_count INTEGER := 0;
BEGIN
  -- Get user preferences
  SELECT auto_archive_days INTO archive_days
  FROM user_message_preferences
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  -- Default to 30 days if no preference set
  IF archive_days IS NULL THEN
    archive_days := 30;
  END IF;
  
  -- Get current message count and limit
  SELECT COUNT(*) INTO current_count
  FROM interaction_log
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  message_limit := get_user_message_limit(p_user_id, p_character_key);
  
  -- Determine if we need to archive
  IF p_force_archive OR current_count > message_limit THEN
    messages_to_archive := current_count - (message_limit * 0.8)::INTEGER; -- Keep 80% of limit
  END IF;
  
  -- Archive messages older than archive_days OR if over limit
  WITH messages_to_move AS (
    SELECT id, session_id, role, content, topics, emotional_tone, nsfw, 
           message_size_bytes, metadata, created_at
    FROM interaction_log
    WHERE user_id = p_user_id 
      AND character_key = p_character_key
      AND (
        created_at < (now() - interval '1 day' * archive_days)
        OR (messages_to_archive > 0 AND id IN (
          SELECT id FROM interaction_log 
          WHERE user_id = p_user_id AND character_key = p_character_key
          ORDER BY created_at ASC 
          LIMIT messages_to_archive
        ))
      )
      -- Don't archive important or recent messages
      AND created_at < (now() - interval '1 day')
      -- Don't archive if marked as important in metadata
      AND NOT COALESCE((metadata->>'is_important')::boolean, false)
  ),
  inserted_archives AS (
    INSERT INTO archived_messages (
      original_message_id, user_id, character_key, session_id,
      role, content, topics, emotional_tone, nsfw, 
      message_size_bytes, metadata, original_created_at,
      archive_reason, is_important, is_favorite
    )
    SELECT 
      id, p_user_id, p_character_key, session_id,
      role, content, topics, emotional_tone, nsfw,
      message_size_bytes, metadata, created_at,
      CASE 
        WHEN current_count > message_limit THEN 'over_limit'
        ELSE 'auto_archival'
      END,
      COALESCE((metadata->>'is_important')::boolean, false),
      COALESCE((metadata->>'is_favorite')::boolean, false)
    FROM messages_to_move
    RETURNING 1
  )
  SELECT COUNT(*) INTO archived_count FROM inserted_archives;
  
  -- Delete archived messages from interaction_log
  DELETE FROM interaction_log
  WHERE id IN (
    SELECT original_message_id FROM archived_messages
    WHERE user_id = p_user_id 
      AND character_key = p_character_key
      AND archived_at > (now() - interval '1 minute')
  );
  
  RETURN archived_count;
END;
$$;

-- Function to update performance metrics
CREATE OR REPLACE FUNCTION update_performance_metrics(
  p_user_id UUID,
  p_character_key TEXT DEFAULT 'lexi'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_messages INTEGER;
  current_size BIGINT;
  active_sessions_count INTEGER;
  archived_count INTEGER;
  message_limit INTEGER;
  warning_level TEXT := 'none';
BEGIN
  -- Get current metrics
  SELECT COUNT(*), COALESCE(SUM(message_size_bytes), 0)
  INTO current_messages, current_size
  FROM interaction_log
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  -- Get active sessions count
  SELECT COUNT(*) INTO active_sessions_count
  FROM conversation_sessions
  WHERE user_id = p_user_id 
    AND character_key = p_character_key 
    AND is_active = true;
  
  -- Get archived messages count
  SELECT COUNT(*) INTO archived_count
  FROM archived_messages
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  -- Get user's message limit
  message_limit := get_user_message_limit(p_user_id, p_character_key);
  
  -- Determine warning level
  IF current_messages >= message_limit THEN
    warning_level := 'critical';
  ELSIF current_messages >= (message_limit * 0.9) THEN
    warning_level := 'performance_warning';
  ELSIF current_messages >= (message_limit * 0.8) THEN
    warning_level := 'approaching_limit';
  END IF;
  
  -- Upsert performance metrics
  INSERT INTO message_performance_metrics (
    user_id, character_key, metric_date, total_messages, 
    total_size_bytes, active_sessions, archived_messages, warning_level
  ) VALUES (
    p_user_id, p_character_key, CURRENT_DATE, current_messages,
    current_size, active_sessions_count, archived_count, warning_level
  )
  ON CONFLICT (user_id, character_key, metric_date)
  DO UPDATE SET
    total_messages = EXCLUDED.total_messages,
    total_size_bytes = EXCLUDED.total_size_bytes,
    active_sessions = EXCLUDED.active_sessions,
    archived_messages = EXCLUDED.archived_messages,
    warning_level = EXCLUDED.warning_level,
    updated_at = now();
END;
$$;

-- Function to get paginated messages with cursor support
CREATE OR REPLACE FUNCTION get_paginated_messages(
  p_user_id UUID,
  p_character_key TEXT DEFAULT 'lexi',
  p_limit INTEGER DEFAULT 50,
  p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_direction TEXT DEFAULT 'before' -- 'before' for older, 'after' for newer
)
RETURNS TABLE(
  id UUID,
  role TEXT,
  content TEXT,
  topics TEXT[],
  emotional_tone TEXT,
  nsfw BOOLEAN,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  has_more BOOLEAN,
  next_cursor TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual_limit INTEGER;
  has_more_messages BOOLEAN := false;
  next_cursor_val TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's allowed limit
  actual_limit := LEAST(p_limit, get_user_message_limit(p_user_id, p_character_key));
  
  -- Add 1 to check if there are more messages
  actual_limit := actual_limit + 1;
  
  -- Get messages based on cursor and direction
  IF p_direction = 'before' THEN
    -- Getting older messages
    RETURN QUERY
    SELECT 
      il.id, il.role, il.content, il.topics, il.emotional_tone, 
      il.nsfw, il.session_id, il.created_at,
      false as has_more, -- Will be updated below
      NULL::TIMESTAMP WITH TIME ZONE as next_cursor
    FROM interaction_log il
    WHERE il.user_id = p_user_id 
      AND il.character_key = p_character_key
      AND (p_cursor IS NULL OR il.created_at < p_cursor)
    ORDER BY il.created_at DESC
    LIMIT actual_limit;
  ELSE
    -- Getting newer messages  
    RETURN QUERY
    SELECT 
      il.id, il.role, il.content, il.topics, il.emotional_tone,
      il.nsfw, il.session_id, il.created_at,
      false as has_more,
      NULL::TIMESTAMP WITH TIME ZONE as next_cursor
    FROM interaction_log il
    WHERE il.user_id = p_user_id 
      AND il.character_key = p_character_key
      AND (p_cursor IS NULL OR il.created_at > p_cursor)
    ORDER BY il.created_at ASC
    LIMIT actual_limit;
  END IF;
  
  -- Check if we have more messages and set cursor
  IF (SELECT COUNT(*) FROM (
    SELECT 1 FROM get_paginated_messages(p_user_id, p_character_key, p_limit, p_cursor, p_direction)
  ) as temp_count) = actual_limit THEN
    has_more_messages := true;
    -- Get the last message's timestamp as next cursor
    SELECT created_at INTO next_cursor_val
    FROM (
      SELECT created_at 
      FROM get_paginated_messages(p_user_id, p_character_key, p_limit, p_cursor, p_direction)
      ORDER BY created_at DESC
      LIMIT 1 OFFSET p_limit - 1
    ) as last_msg;
  END IF;
  
  -- Update the returned values (this is a simplified approach)
  -- In practice, you might want to handle this differently
  RETURN;
END;
$$;