-- Fix database components causing 409 errors

-- 1. Add missing ai_model column to message_performance_metrics (causing 409 errors)
ALTER TABLE message_performance_metrics
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);

-- 2. Ensure proper permissions are set for existing tables

-- Ensure message_performance_metrics has proper RLS
ALTER TABLE message_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own performance metrics" ON message_performance_metrics;
CREATE POLICY "Users can view their own performance metrics" ON message_performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all performance metrics" ON message_performance_metrics;
CREATE POLICY "Service role can manage all performance metrics" ON message_performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions for message_performance_metrics
GRANT SELECT ON message_performance_metrics TO authenticated;
GRANT ALL ON message_performance_metrics TO service_role;