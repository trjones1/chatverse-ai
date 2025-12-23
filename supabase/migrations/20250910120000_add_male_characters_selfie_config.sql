-- Add male characters to selfie system configuration
-- This migration adds the 5 male characters to character_selfie_config

INSERT INTO "public"."character_selfie_config" ("character_key", "enabled", "frequency_percentage", "mood_matching", "nsfw_enabled")
VALUES 
  ('dom', true, 18, true, true),
  ('chase', true, 22, true, true), 
  ('ethan', true, 16, true, true),
  ('jayden', true, 19, true, true),
  ('miles', true, 17, true, true)
ON CONFLICT ("character_key") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  frequency_percentage = EXCLUDED.frequency_percentage,
  mood_matching = EXCLUDED.mood_matching,
  nsfw_enabled = EXCLUDED.nsfw_enabled,
  updated_at = NOW();

COMMENT ON COLUMN "public"."character_selfie_config"."character_key" IS 'Character identifier - supports all 11 characters: lexi, nyx, aiko, chloe, zaria, nova, dom, chase, ethan, jayden, miles';