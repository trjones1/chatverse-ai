-- Enhanced Memory System for AI Girlfriend Experience
-- Creates comprehensive memory tables for user facts, emotions, and episodes

-- User Facts Table - Stores personal information about users
CREATE TABLE IF NOT EXISTS "public"."user_facts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "character_key" text NOT NULL DEFAULT 'lexi',
  "display_name" text,
  "birthday" date,
  "occupation" text,
  "location" text,
  "favorites" jsonb DEFAULT '{}',
  "dislikes" jsonb DEFAULT '{}',
  "personal_notes" text,
  "tags" text[] DEFAULT '{}',
  "relationship_status" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_facts_pkey PRIMARY KEY (id),
  CONSTRAINT user_facts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_facts_unique_user_character UNIQUE (user_id, character_key)
);

-- Emotional State Table - Tracks relationship dynamics
CREATE TABLE IF NOT EXISTS "public"."emotional_states" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "character_key" text NOT NULL DEFAULT 'lexi',
  "affection" integer DEFAULT 50 CHECK (affection >= 0 AND affection <= 100),
  "trust" integer DEFAULT 30 CHECK (trust >= 0 AND trust <= 100),
  "jealousy" integer DEFAULT 0 CHECK (jealousy >= 0 AND jealousy <= 100),
  "playfulness" integer DEFAULT 40 CHECK (playfulness >= 0 AND playfulness <= 100),
  "clinginess" integer DEFAULT 20 CHECK (clinginess >= 0 AND clinginess <= 100),
  "intimacy_level" integer DEFAULT 10 CHECK (intimacy_level >= 0 AND intimacy_level <= 100),
  "last_visit_at" timestamp with time zone DEFAULT now(),
  "streak_days" integer DEFAULT 0,
  "total_conversations" integer DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT emotional_states_pkey PRIMARY KEY (id),
  CONSTRAINT emotional_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT emotional_states_unique_user_character UNIQUE (user_id, character_key)
);

-- Episodic Memories Table - Stores important conversation moments
CREATE TABLE IF NOT EXISTS "public"."episodic_memories" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "character_key" text NOT NULL DEFAULT 'lexi',
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "topics" text[] DEFAULT '{}',
  "emotional_impact" integer DEFAULT 5 CHECK (emotional_impact >= 1 AND emotional_impact <= 10),
  "salience" real DEFAULT 0.5 CHECK (salience >= 0 AND salience <= 1.0),
  "happened_at" timestamp with time zone DEFAULT now(),
  "last_referenced_at" timestamp with time zone,
  "reference_count" integer DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT episodic_memories_pkey PRIMARY KEY (id),
  CONSTRAINT episodic_memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Interaction Log Table - Logs all conversations for memory processing
CREATE TABLE IF NOT EXISTS "public"."interaction_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "character_key" text NOT NULL DEFAULT 'lexi',
  "role" text NOT NULL CHECK (role IN ('user', 'assistant')),
  "content" text NOT NULL,
  "topics" text[] DEFAULT '{}',
  "emotional_tone" text, -- happy, sad, flirty, etc.
  "nsfw" boolean DEFAULT false,
  "session_id" text, -- To group related conversations
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT interaction_log_pkey PRIMARY KEY (id),
  CONSTRAINT interaction_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Memory Triggers Table - Stores what should trigger memory recall
CREATE TABLE IF NOT EXISTS "public"."memory_triggers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "episodic_memory_id" uuid NOT NULL,
  "trigger_keywords" text[] NOT NULL,
  "trigger_topics" text[] DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT memory_triggers_pkey PRIMARY KEY (id),
  CONSTRAINT memory_triggers_memory_id_fkey FOREIGN KEY (episodic_memory_id) REFERENCES episodic_memories(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_facts_user_character ON user_facts (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_emotional_states_user_character ON emotional_states (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_episodic_memories_user_character ON episodic_memories (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_episodic_memories_salience ON episodic_memories (salience DESC, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_memories_topics ON episodic_memories USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_interaction_log_user_character ON interaction_log (user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_interaction_log_created_at ON interaction_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_log_topics ON interaction_log USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_memory_triggers_keywords ON memory_triggers USING GIN (trigger_keywords);

-- Enable Row Level Security
ALTER TABLE "public"."user_facts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."emotional_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."episodic_memories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."interaction_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."memory_triggers" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own data
CREATE POLICY "user_can_access_own_facts" ON "public"."user_facts"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_emotions" ON "public"."emotional_states"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_memories" ON "public"."episodic_memories"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_interactions" ON "public"."interaction_log"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "user_can_access_own_triggers" ON "public"."memory_triggers"
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = (SELECT user_id FROM episodic_memories WHERE id = episodic_memory_id));

-- Service role can access all data for processing
CREATE POLICY "service_can_manage_all_facts" ON "public"."user_facts"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_emotions" ON "public"."emotional_states"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_memories" ON "public"."episodic_memories"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_interactions" ON "public"."interaction_log"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "service_can_manage_all_triggers" ON "public"."memory_triggers"
  AS PERMISSIVE FOR ALL TO service_role
  USING (true);

-- Updated At trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_facts_updated_at ON user_facts;
CREATE TRIGGER update_user_facts_updated_at
    BEFORE UPDATE ON user_facts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_emotional_states_updated_at ON emotional_states;
CREATE TRIGGER update_emotional_states_updated_at
    BEFORE UPDATE ON emotional_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_episodic_memories_updated_at ON episodic_memories;
CREATE TRIGGER update_episodic_memories_updated_at
    BEFORE UPDATE ON episodic_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Memory processing functions
CREATE OR REPLACE FUNCTION get_comprehensive_memory(
  p_user_id uuid, 
  p_character_key text DEFAULT 'lexi',
  p_episode_limit integer DEFAULT 5
)
RETURNS TABLE(
  facts jsonb,
  emotions jsonb,
  episodes jsonb[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(to_jsonb(f.*), '{}'::jsonb) as facts,
    COALESCE(to_jsonb(e.*), '{}'::jsonb) as emotions,
    COALESCE(array_agg(to_jsonb(ep.*) ORDER BY ep.salience DESC, ep.happened_at DESC), '{}') as episodes
  FROM 
    (SELECT 1) dummy -- Ensure we always return a row
  LEFT JOIN user_facts f ON f.user_id = p_user_id AND f.character_key = p_character_key
  LEFT JOIN emotional_states e ON e.user_id = p_user_id AND e.character_key = p_character_key  
  LEFT JOIN (
    SELECT * FROM episodic_memories 
    WHERE user_id = p_user_id AND character_key = p_character_key 
    ORDER BY salience DESC, happened_at DESC 
    LIMIT p_episode_limit
  ) ep ON true
  GROUP BY f.*, e.*;
END;
$$;

-- Function to update emotional state with bounds checking
CREATE OR REPLACE FUNCTION update_emotional_state_safe(
  p_user_id uuid,
  p_character_key text DEFAULT 'lexi',
  p_affection_delta integer DEFAULT 0,
  p_trust_delta integer DEFAULT 0,
  p_jealousy_delta integer DEFAULT 0,
  p_playfulness_delta integer DEFAULT 0,
  p_clinginess_delta integer DEFAULT 0,
  p_intimacy_delta integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_state emotional_states%ROWTYPE;
BEGIN
  -- Get current state or create default
  SELECT * INTO current_state
  FROM emotional_states
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  IF current_state.id IS NULL THEN
    -- Create new emotional state with defaults
    INSERT INTO emotional_states (user_id, character_key, total_conversations)
    VALUES (p_user_id, p_character_key, 1);
    
    -- Get the newly created state
    SELECT * INTO current_state
    FROM emotional_states
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;
  
  -- Apply deltas with bounds checking and update
  UPDATE emotional_states SET
    affection = GREATEST(0, LEAST(100, current_state.affection + p_affection_delta)),
    trust = GREATEST(0, LEAST(100, current_state.trust + p_trust_delta)),
    jealousy = GREATEST(0, LEAST(100, current_state.jealousy + p_jealousy_delta)),
    playfulness = GREATEST(0, LEAST(100, current_state.playfulness + p_playfulness_delta)),
    clinginess = GREATEST(0, LEAST(100, current_state.clinginess + p_clinginess_delta)),
    intimacy_level = GREATEST(0, LEAST(100, current_state.intimacy_level + p_intimacy_delta)),
    last_visit_at = now(),
    total_conversations = current_state.total_conversations + 1,
    updated_at = now()
  WHERE user_id = p_user_id AND character_key = p_character_key;
END;
$$;

-- Function to create or update episodic memory
CREATE OR REPLACE FUNCTION create_episodic_memory(
  p_user_id uuid,
  p_character_key text,
  p_title text,
  p_summary text,
  p_topics text[] DEFAULT '{}',
  p_emotional_impact integer DEFAULT 5,
  p_salience real DEFAULT 0.5,
  p_trigger_keywords text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  memory_id uuid;
BEGIN
  -- Insert the episodic memory
  INSERT INTO episodic_memories (
    user_id, character_key, title, summary, topics, 
    emotional_impact, salience, happened_at
  ) VALUES (
    p_user_id, p_character_key, p_title, p_summary, p_topics,
    p_emotional_impact, p_salience, now()
  ) RETURNING id INTO memory_id;
  
  -- Add memory triggers if provided
  IF array_length(p_trigger_keywords, 1) > 0 THEN
    INSERT INTO memory_triggers (episodic_memory_id, trigger_keywords, trigger_topics)
    VALUES (memory_id, p_trigger_keywords, p_topics);
  END IF;
  
  RETURN memory_id;
END;
$$;