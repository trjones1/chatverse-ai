-- Character Selfie System Extension
-- Extends existing content_library for selfie management

-- Character Selfie Configuration - Per-character selfie settings
CREATE TABLE "public"."character_selfie_config" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "character_key" text NOT NULL UNIQUE,
  "enabled" boolean DEFAULT true,
  "frequency_percentage" integer DEFAULT 15, -- 15% chance to send selfie with message
  "mood_matching" boolean DEFAULT true, -- Match selfie mood to message context
  "nsfw_enabled" boolean DEFAULT true, -- Allow NSFW selfies for premium users
  "settings" jsonb DEFAULT '{}', -- Flexible settings for future features
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert default configs for existing characters
INSERT INTO "public"."character_selfie_config" ("character_key", "enabled", "frequency_percentage", "mood_matching", "nsfw_enabled")
VALUES 
  ('lexi', true, 20, true, true),
  ('nyx', true, 15, true, true),
  ('aiko', true, 18, true, true),
  ('chloe', true, 12, true, true),
  ('zaria', true, 15, true, true),
  ('nova', true, 17, true, true);

-- Character Selfie Analytics - Track selfie performance
CREATE TABLE "public"."character_selfie_analytics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "character_key" text NOT NULL,
  "content_id" uuid NOT NULL, -- References content_library
  "sent_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "user_id" uuid, -- Optional user tracking
  "message_context" text, -- Context where selfie was sent
  "mood" text, -- Mood that triggered this selfie
  "nsfw_mode" boolean DEFAULT false,
  "interaction_score" decimal(3,2) DEFAULT 0, -- Future: user engagement with selfie
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add primary keys
ALTER TABLE "public"."character_selfie_config" ADD CONSTRAINT "character_selfie_config_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."character_selfie_analytics" ADD CONSTRAINT "character_selfie_analytics_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE "public"."character_selfie_analytics" ADD CONSTRAINT "character_selfie_analytics_content_fkey" 
  FOREIGN KEY ("content_id") REFERENCES "public"."content_library"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX "character_selfie_config_character_idx" ON "public"."character_selfie_config" USING btree ("character_key");
CREATE INDEX "character_selfie_analytics_character_mood_idx" ON "public"."character_selfie_analytics" USING btree ("character_key", "mood");
CREATE INDEX "character_selfie_analytics_sent_at_idx" ON "public"."character_selfie_analytics" USING btree ("sent_at" DESC);
CREATE INDEX "content_library_selfie_idx" ON "public"."content_library" USING btree ("character_key", "content_type", "mood") WHERE content_type = 'selfie';

-- Enable RLS
ALTER TABLE "public"."character_selfie_config" ENABLE row level security;
ALTER TABLE "public"."character_selfie_analytics" ENABLE row level security;

-- RLS Policies - Service role can manage all, authenticated users can read config
CREATE POLICY "Service role can manage selfie config"
  ON "public"."character_selfie_config"
  AS permissive
  FOR all
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage selfie analytics"
  ON "public"."character_selfie_analytics"
  AS permissive
  FOR all
  TO service_role
  USING (true);

-- Users can read selfie config
CREATE POLICY "Users can view selfie config"
  ON "public"."character_selfie_config"
  AS permissive
  FOR select
  TO authenticated, anon
  USING (true);

-- Grant permissions
GRANT SELECT ON TABLE "public"."character_selfie_config" TO "authenticated", "anon";
GRANT ALL ON TABLE "public"."character_selfie_config" TO "service_role";
GRANT ALL ON TABLE "public"."character_selfie_analytics" TO "service_role";

-- Triggers for updated_at
CREATE TRIGGER "character_selfie_config_updated_at" 
  BEFORE UPDATE ON "public"."character_selfie_config"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- Function to get random selfie for character
CREATE OR REPLACE FUNCTION "public"."get_random_character_selfie"(
  p_character_key text,
  p_mood text DEFAULT NULL,
  p_is_nsfw boolean DEFAULT false,
  p_exclude_recent_hours integer DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  file_url text,
  thumbnail_url text,
  mood text,
  aesthetic text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.file_url,
    cl.thumbnail_url,
    cl.mood,
    cl.aesthetic,
    cl.metadata
  FROM "public"."content_library" cl
  LEFT JOIN "public"."character_selfie_analytics" csa ON (
    csa.content_id = cl.id 
    AND csa.sent_at > (NOW() - INTERVAL '1 hour' * p_exclude_recent_hours)
  )
  WHERE 
    cl.character_key = p_character_key
    AND cl.content_type = 'selfie'
    AND cl.status = 'active'
    AND (p_mood IS NULL OR cl.mood = p_mood OR cl.mood IS NULL)
    AND (p_is_nsfw = true OR cl.is_nsfw = false)
    AND csa.id IS NULL -- Exclude recently sent selfies
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION "public"."get_random_character_selfie"(text, text, boolean, integer) TO "service_role", "authenticated";

-- Function to log selfie analytics
CREATE OR REPLACE FUNCTION "public"."log_selfie_sent"(
  p_character_key text,
  p_content_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_message_context text DEFAULT NULL,
  p_mood text DEFAULT NULL,
  p_nsfw_mode boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO "public"."character_selfie_analytics" (
    character_key,
    content_id,
    user_id,
    message_context,
    mood,
    nsfw_mode
  ) VALUES (
    p_character_key,
    p_content_id,
    p_user_id,
    p_message_context,
    p_mood,
    p_nsfw_mode
  );
  
  -- Update usage count in content_library
  UPDATE "public"."content_library"
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE id = p_content_id;
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION "public"."log_selfie_sent"(text, uuid, uuid, text, text, boolean) TO "service_role", "authenticated";

COMMENT ON TABLE "public"."character_selfie_config" IS 'Configuration settings for character selfie system';
COMMENT ON TABLE "public"."character_selfie_analytics" IS 'Analytics and tracking for sent character selfies';
COMMENT ON FUNCTION "public"."get_random_character_selfie"(text, text, boolean, integer) IS 'Returns a random selfie for a character based on mood and NSFW preferences';
COMMENT ON FUNCTION "public"."log_selfie_sent"(text, uuid, uuid, text, text, boolean) IS 'Logs analytics when a selfie is sent to a user';