-- Migration: Add metadata column to episodic_memories table
-- This enables enhanced memory categorization and AI analysis storage

-- Add metadata column to episodic_memories table
ALTER TABLE episodic_memories
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for efficient metadata queries
CREATE INDEX IF NOT EXISTS idx_episodic_memories_metadata
ON episodic_memories USING GIN (metadata);

-- Add comment for documentation
COMMENT ON COLUMN episodic_memories.metadata IS 'Stores memory significance, relationship impact, and AI enhancement data';

-- Sample metadata structure (for documentation):
-- {
--   "significance_level": "mundane|notable|significant|milestone",
--   "relationship_impact": "none|positive|negative|complex",
--   "memory_type": "factual|emotional|relational|intimate|conflict|achievement",
--   "ai_enhanced": true,
--   "enhanced_at": "2025-01-17T12:00:00Z",
--   "message_context": "first 200 chars of original message"
-- }