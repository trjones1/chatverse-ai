-- Migration: Add persistent achievement tracking
-- Ensures achievements persist even when chat history is cleared

-- Create user achievement milestones table
CREATE TABLE IF NOT EXISTS user_achievement_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  
  -- Milestone tracking (these should only increase, never decrease)
  max_conversations_reached INTEGER DEFAULT 0,
  max_memories_created INTEGER DEFAULT 0,
  max_facts_learned INTEGER DEFAULT 0,
  
  -- Achievement timestamps
  first_connection_at TIMESTAMP WITH TIME ZONE,
  getting_comfortable_at TIMESTAMP WITH TIME ZONE, -- 5 conversations
  regular_buddy_at TIMESTAMP WITH TIME ZONE,       -- 10 conversations  
  close_friend_at TIMESTAMP WITH TIME ZONE,        -- 25 conversations
  best_friends_at TIMESTAMP WITH TIME ZONE,        -- 50 conversations
  soulmate_at TIMESTAMP WITH TIME ZONE,           -- 100 conversations
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per character
  UNIQUE(user_id, character_key)
);

-- Create indexes for efficient lookups
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
  IF p_memory_count IS NOT NULL AND p_memory_count > milestone_record.max_memories_created THEN
    UPDATE user_achievement_milestones 
    SET 
      max_memories_created = p_memory_count,
      updated_at = NOW()
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;
  
  -- Update fact milestones if provided
  IF p_fact_count IS NOT NULL AND p_fact_count > milestone_record.max_fact_learned THEN
    UPDATE user_achievement_milestones 
    SET 
      max_facts_learned = p_fact_count,
      updated_at = NOW()
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE user_achievement_milestones ENABLE ROW LEVEL SECURITY;

-- Users can read their own achievement milestones
CREATE POLICY "Users can read own achievement milestones"
  ON user_achievement_milestones FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can update achievement milestones (via functions)
CREATE POLICY "Service role can manage achievement milestones"
  ON user_achievement_milestones FOR ALL
  USING (auth.role() = 'service_role');

-- Insert initial tracking comment
INSERT INTO public.migration_log (migration_name, description) 
VALUES ('20250915_persistent_achievements', 'Add persistent achievement tracking that survives chat history clearing')
ON CONFLICT (migration_name) DO NOTHING;