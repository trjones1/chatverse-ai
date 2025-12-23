-- Migration: Add tip acknowledgment fields to messages table
-- This enables immediate tip acknowledgments with confetti and selfies

-- Add new columns to messages table for tip acknowledgments
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_tip_acknowledgment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tip_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS fanfare_level TEXT CHECK (fanfare_level IN ('small', 'medium', 'large', 'epic'));

-- Add index for efficient tip acknowledgment queries
CREATE INDEX IF NOT EXISTS idx_messages_tip_acknowledgment
ON messages (user_id, character_key, is_tip_acknowledgment, created_at)
WHERE is_tip_acknowledgment = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN messages.is_tip_acknowledgment IS 'Indicates if this message is an immediate tip acknowledgment';
COMMENT ON COLUMN messages.tip_amount_cents IS 'Amount of tip being acknowledged in cents';
COMMENT ON COLUMN messages.fanfare_level IS 'Level of fanfare for confetti animation: small, medium, large, epic';