-- Migration: Create Founders' Circle tracking system
-- Track the first 100 subscribers per character for special benefits

-- Create founders_circle table to track founders per character
CREATE TABLE IF NOT EXISTS founders_circle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  founder_number INTEGER NOT NULL, -- 1-100 for each character
  subscription_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  locked_pricing JSONB, -- Store locked pricing details
  bonus_versecoins INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique founder numbers per character
  UNIQUE(character_key, founder_number),
  -- Ensure one founder entry per user per character
  UNIQUE(user_id, character_key)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_founders_circle_character ON founders_circle(character_key);
CREATE INDEX IF NOT EXISTS idx_founders_circle_user ON founders_circle(user_id);

-- Create function to check if user is a founder for a character
CREATE OR REPLACE FUNCTION is_founder_for_character(p_user_id UUID, p_character_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM founders_circle 
    WHERE user_id = p_user_id AND character_key = p_character_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get next founder number for a character
CREATE OR REPLACE FUNCTION get_next_founder_number(p_character_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(founder_number), 0) + 1 
  INTO next_number
  FROM founders_circle 
  WHERE character_key = p_character_key;
  
  -- Cap at 100 founders per character
  IF next_number > 100 THEN
    RETURN NULL;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add a new founder (called when subscription is created)
CREATE OR REPLACE FUNCTION add_founder_if_eligible(
  p_user_id UUID, 
  p_character_key TEXT,
  p_subscription_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  next_number INTEGER;
  founder_record RECORD;
BEGIN
  -- Get next available founder number
  SELECT get_next_founder_number(p_character_key) INTO next_number;
  
  -- If no spots available (already 100 founders)
  IF next_number IS NULL THEN
    RETURN jsonb_build_object('is_founder', false, 'reason', 'founders_circle_full');
  END IF;
  
  -- Check if user is already a founder for this character
  IF is_founder_for_character(p_user_id, p_character_key) THEN
    SELECT * INTO founder_record FROM founders_circle 
    WHERE user_id = p_user_id AND character_key = p_character_key;
    
    RETURN jsonb_build_object(
      'is_founder', true, 
      'founder_number', founder_record.founder_number,
      'reason', 'already_founder'
    );
  END IF;
  
  -- Add new founder
  INSERT INTO founders_circle (
    user_id, 
    character_key, 
    founder_number, 
    subscription_created_at,
    locked_pricing
  ) VALUES (
    p_user_id,
    p_character_key,
    next_number,
    NOW(),
    p_subscription_data
  );
  
  RETURN jsonb_build_object(
    'is_founder', true, 
    'founder_number', next_number,
    'reason', 'new_founder',
    'bonus_versecoins', 500
  );
  
EXCEPTION WHEN unique_violation THEN
  -- Handle race condition - another user might have taken this spot
  RETURN jsonb_build_object('is_founder', false, 'reason', 'race_condition');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get founder stats for a character
CREATE OR REPLACE FUNCTION get_founder_stats(p_character_key TEXT)
RETURNS JSONB AS $$
DECLARE
  founder_count INTEGER;
  spots_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO founder_count
  FROM founders_circle
  WHERE character_key = p_character_key;
  
  spots_remaining := GREATEST(0, 100 - founder_count);
  
  RETURN jsonb_build_object(
    'character_key', p_character_key,
    'founder_count', founder_count,
    'spots_remaining', spots_remaining,
    'is_available', spots_remaining > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE founders_circle ENABLE ROW LEVEL SECURITY;

-- Users can read their own founder status
CREATE POLICY "Users can read own founder status"
  ON founders_circle FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update founders
CREATE POLICY "Service role can manage founders"
  ON founders_circle FOR ALL
  USING (auth.role() = 'service_role');

-- Insert initial tracking comment
INSERT INTO public.migration_log (migration_name, description) 
VALUES ('20250915_founders_circle', 'Create Founders Circle tracking system for first 100 subscribers per character')
ON CONFLICT (migration_name) DO NOTHING;