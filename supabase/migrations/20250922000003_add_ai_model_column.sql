-- Add ai_model column to message_performance_metrics table
-- This fixes the 409 insert errors when logging performance metrics

ALTER TABLE message_performance_metrics
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);

-- Add comment to document the column
COMMENT ON COLUMN message_performance_metrics.ai_model IS 'The AI model used for generating the response (e.g. gpt-4, claude-3)';