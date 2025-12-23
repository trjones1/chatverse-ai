-- Restore missing RPC functions that are causing 404 errors
-- These functions exist in earlier migrations but seem to be missing from the database

-- First ensure the user_achievement_milestones table exists
CREATE TABLE IF NOT EXISTS user_achievement_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  max_conversations_reached INTEGER DEFAULT 0,
  max_memories_created INTEGER DEFAULT 0,
  max_facts_learned INTEGER DEFAULT 0,
  first_connection_at TIMESTAMPTZ,
  getting_comfortable_at TIMESTAMPTZ,
  regular_buddy_at TIMESTAMPTZ,
  close_friend_at TIMESTAMPTZ,
  best_friends_at TIMESTAMPTZ,
  soulmate_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, character_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievement_milestones_user_character
ON user_achievement_milestones(user_id, character_key);

-- Create function to update achievement milestones
CREATE OR REPLACE FUNCTION update_achievement_milestones(
  p_user_id UUID,
  p_character_key TEXT,
  p_conversation_count INTEGER DEFAULT NULL,
  p_memory_count INTEGER DEFAULT NULL,
  p_fact_count INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_max_conversations INTEGER;
  milestone_record RECORD;
BEGIN
  -- Insert or get existing milestone record
  INSERT INTO user_achievement_milestones (user_id, character_key, max_conversations_reached)
  VALUES (p_user_id, p_character_key, 0)
  ON CONFLICT (user_id, character_key)
  DO NOTHING;

  -- Get current milestone record
  SELECT * INTO milestone_record
  FROM user_achievement_milestones
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- Update conversation milestones if provided
  IF p_conversation_count IS NOT NULL THEN
    -- Only update if we've reached a new high
    IF p_conversation_count > milestone_record.max_conversations_reached THEN
      UPDATE user_achievement_milestones
      SET
        max_conversations_reached = p_conversation_count,
        updated_at = NOW(),
        -- Set achievement timestamps for newly reached milestones
        first_connection_at = CASE
          WHEN milestone_record.first_connection_at IS NULL AND p_conversation_count >= 1
          THEN NOW()
          ELSE milestone_record.first_connection_at
        END,
        getting_comfortable_at = CASE
          WHEN milestone_record.getting_comfortable_at IS NULL AND p_conversation_count >= 5
          THEN NOW()
          ELSE milestone_record.getting_comfortable_at
        END,
        regular_buddy_at = CASE
          WHEN milestone_record.regular_buddy_at IS NULL AND p_conversation_count >= 10
          THEN NOW()
          ELSE milestone_record.regular_buddy_at
        END,
        close_friend_at = CASE
          WHEN milestone_record.close_friend_at IS NULL AND p_conversation_count >= 25
          THEN NOW()
          ELSE milestone_record.close_friend_at
        END,
        best_friends_at = CASE
          WHEN milestone_record.best_friends_at IS NULL AND p_conversation_count >= 50
          THEN NOW()
          ELSE milestone_record.best_friends_at
        END,
        soulmate_at = CASE
          WHEN milestone_record.soulmate_at IS NULL AND p_conversation_count >= 100
          THEN NOW()
          ELSE milestone_record.soulmate_at
        END
      WHERE user_id = p_user_id AND character_key = p_character_key;
    END IF;
  END IF;

  -- Update memory milestones if provided
  IF p_memory_count IS NOT NULL THEN
    UPDATE user_achievement_milestones
    SET
      max_memories_created = GREATEST(max_memories_created, p_memory_count),
      updated_at = NOW()
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;

  -- Update fact milestones if provided
  IF p_fact_count IS NOT NULL THEN
    UPDATE user_achievement_milestones
    SET
      max_facts_learned = GREATEST(max_facts_learned, p_fact_count),
      updated_at = NOW()
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get achievement status
CREATE OR REPLACE FUNCTION get_achievement_status(p_user_id UUID, p_character_key TEXT)
RETURNS JSONB AS $$
DECLARE
  milestone_record RECORD;
  achievement_status JSONB;
BEGIN
  -- Get milestone record
  SELECT * INTO milestone_record
  FROM user_achievement_milestones
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- If no record exists, return default status
  IF milestone_record IS NULL THEN
    RETURN jsonb_build_object(
      'max_conversations_reached', 0,
      'achievements', jsonb_build_object(
        'first_connection', false,
        'getting_comfortable', false,
        'regular_buddy', false,
        'close_friend', false,
        'best_friends', false,
        'soulmate', false
      )
    );
  END IF;

  -- Build achievement status
  achievement_status := jsonb_build_object(
    'max_conversations_reached', milestone_record.max_conversations_reached,
    'max_memories_created', milestone_record.max_memories_created,
    'max_facts_learned', milestone_record.max_facts_learned,
    'achievements', jsonb_build_object(
      'first_connection', milestone_record.first_connection_at IS NOT NULL,
      'getting_comfortable', milestone_record.getting_comfortable_at IS NOT NULL,
      'regular_buddy', milestone_record.regular_buddy_at IS NOT NULL,
      'close_friend', milestone_record.close_friend_at IS NOT NULL,
      'best_friends', milestone_record.best_friends_at IS NOT NULL,
      'soulmate', milestone_record.soulmate_at IS NOT NULL
    ),
    'achievement_dates', jsonb_build_object(
      'first_connection_at', milestone_record.first_connection_at,
      'getting_comfortable_at', milestone_record.getting_comfortable_at,
      'regular_buddy_at', milestone_record.regular_buddy_at,
      'close_friend_at', milestone_record.close_friend_at,
      'best_friends_at', milestone_record.best_friends_at,
      'soulmate_at', milestone_record.soulmate_at
    )
  );

  RETURN achievement_status;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE user_achievement_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own achievements" ON user_achievement_milestones
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data
CREATE POLICY "Service role can manage achievements" ON user_achievement_milestones
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON user_achievement_milestones TO authenticated;
GRANT ALL ON user_achievement_milestones TO service_role;
GRANT EXECUTE ON FUNCTION update_achievement_milestones TO service_role;
GRANT EXECUTE ON FUNCTION get_achievement_status TO service_role, authenticated;