-- Migration to implement girlfriend-style memory system
-- Long-term relationship memory for AI companions

BEGIN;

-- 1) Stable personal facts
CREATE TABLE IF NOT EXISTS lexi_mem_facts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  birthday date,
  occupation text,
  favorites jsonb DEFAULT '{}'::jsonb,   -- { music: "...", food: "...", kinks: ["..."] }
  tags text[] DEFAULT '{}',
  notes text,                             -- freeform "bio" Lexi keeps about you
  reinforce_count int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) Episodic memory (summarized "journal" entries)
CREATE TABLE IF NOT EXISTS lexi_mem_episodes (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  happened_at timestamptz DEFAULT now(),
  summary text NOT NULL,                  -- compact, ~1–3 sentences
  topics text[] DEFAULT '{}',             -- ["work", "gym", "family", "jealousy"]
  reinforce_count int DEFAULT 1,
  salience real DEFAULT 0.5,              -- 0–1: how important
  last_referenced_at timestamptz DEFAULT now(),
  embedding vector(768),                  -- optional: pgvector for semantic search
  created_at timestamptz DEFAULT now()
);

-- 3) Emotional/relationship state
CREATE TABLE IF NOT EXISTS lexi_mem_emotions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  affection int DEFAULT 60,               -- 0–100
  trust int DEFAULT 60,
  jealousy int DEFAULT 20,
  playfulness int DEFAULT 50,
  clinginess int DEFAULT 30,
  last_visit_at timestamptz DEFAULT now(),
  streak_days int DEFAULT 0,
  total_conversations int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4) Interaction log (for decay + summarizer)
CREATE TABLE IF NOT EXISTS lexi_mem_interactions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user','assistant')) NOT NULL,
  content text NOT NULL,
  topics text[] DEFAULT '{}',
  character_key text NOT NULL DEFAULT 'lexi',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE lexi_mem_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexi_mem_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexi_mem_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexi_mem_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own memory facts"
  ON lexi_mem_facts FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own memory episodes"
  ON lexi_mem_episodes FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own emotions"
  ON lexi_mem_emotions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own interactions"
  ON lexi_mem_interactions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lexi_mem_episodes_user_happened 
  ON lexi_mem_episodes (user_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_lexi_mem_episodes_salience 
  ON lexi_mem_episodes (user_id, salience DESC, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_lexi_mem_interactions_user_created 
  ON lexi_mem_interactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lexi_mem_interactions_character 
  ON lexi_mem_interactions (user_id, character_key, created_at DESC);

-- Optional: pgvector index for semantic search (uncomment if pgvector is installed)
-- CREATE INDEX IF NOT EXISTS idx_lexi_mem_episodes_embedding 
--   ON lexi_mem_episodes USING ivfflat (embedding vector_cosine_ops);

-- RPC function to get active users for memory summarizer
CREATE OR REPLACE FUNCTION get_active_users_for_summarizer(since_date timestamptz)
RETURNS TABLE(user_id uuid, character_key text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT lmi.user_id, lmi.character_key
  FROM lexi_mem_interactions lmi
  WHERE lmi.created_at >= since_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize emotions for existing users
INSERT INTO lexi_mem_emotions (user_id, last_visit_at)
SELECT id, now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM lexi_mem_emotions);

COMMIT;

-- Verification queries (run after migration):
-- SELECT COUNT(*) as total_users FROM auth.users;
-- SELECT COUNT(*) as users_with_emotions FROM lexi_mem_emotions;
-- SELECT COUNT(*) as total_facts FROM lexi_mem_facts;
-- SELECT COUNT(*) as total_episodes FROM lexi_mem_episodes;
-- SELECT COUNT(*) as total_interactions FROM lexi_mem_interactions;