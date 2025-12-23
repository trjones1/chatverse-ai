-- Migration: Add metadata column to emotional_states table
-- This enables rich relationship insights and AI reasoning storage

-- Add metadata column to emotional_states table
ALTER TABLE emotional_states
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for efficient metadata queries
CREATE INDEX IF NOT EXISTS idx_emotional_states_metadata
ON emotional_states USING GIN (metadata);

-- Add comment for documentation
COMMENT ON COLUMN emotional_states.metadata IS 'Stores relationship insights, AI reasoning, and enhanced emotional context data';

-- Sample metadata structure (for documentation):
-- {
--   "relationship_status": "thriving|stable|developing|challenging",
--   "relationship_insights": {
--     "communication_quality": 1-10,
--     "emotional_depth": 1-10,
--     "trust_indicators": ["array", "of", "indicators"],
--     "concern_flags": ["array", "of", "concerns"],
--     "growth_areas": ["array", "of", "opportunities"]
--   },
--   "last_ai_reasoning": "explanation of recent emotional changes",
--   "enhanced_at": "2025-01-17T12:00:00Z"
-- }