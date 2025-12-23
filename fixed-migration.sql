-- Content Pipeline System for Automated Character Content Generation
-- Fixed version with proper constraint ordering

-- Character Bible Table - Core character definitions for content generation
CREATE TABLE "public"."character_bible" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "character_key" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "physical_traits" jsonb DEFAULT '{}',
  "personality_traits" jsonb DEFAULT '{}',
  "visual_aesthetics" jsonb DEFAULT '{}',
  "content_themes" jsonb DEFAULT '{}',
  "style_guidelines" jsonb DEFAULT '{}',
  "brand_colors" jsonb DEFAULT '{}',
  "content_settings" jsonb DEFAULT '{}',
  "prompt_templates" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Content Generation Queue - Batch processing for image/video generation
CREATE TABLE "public"."content_generation_queue" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "character_key" text NOT NULL,
  "content_type" text NOT NULL, -- 'image', 'video', 'batch'
  "generation_prompt" text NOT NULL,
  "prompt_data" jsonb DEFAULT '{}',
  "status" text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  "priority" integer DEFAULT 5, -- 1-10, higher = more priority
  "batch_id" uuid, -- For grouping related content
  "output_urls" jsonb DEFAULT '[]',
  "generation_metadata" jsonb DEFAULT '{}',
  "error_message" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "completed_at" timestamp with time zone
);

-- Content Library - Generated content storage and management (NO FOREIGN KEYS YET)
CREATE TABLE "public"."content_library" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "character_key" text NOT NULL,
  "content_type" text NOT NULL, -- 'image', 'video', 'gif'
  "title" text,
  "file_url" text NOT NULL,
  "thumbnail_url" text,
  "metadata" jsonb DEFAULT '{}',
  "tags" text[] DEFAULT '{}',
  "mood" text,
  "aesthetic" text,
  "is_nsfw" boolean DEFAULT false,
  "quality_score" integer, -- 1-10 rating
  "usage_count" integer DEFAULT 0,
  "last_used_at" timestamp with time zone,
  "status" text DEFAULT 'active', -- 'active', 'archived', 'deleted'
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Content Performance Analytics (NO FOREIGN KEYS YET)
CREATE TABLE "public"."content_analytics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "content_id" uuid, -- Will add FK constraint later
  "character_key" text NOT NULL,
  "platform" text NOT NULL,
  "views" integer DEFAULT 0,
  "likes" integer DEFAULT 0,
  "comments" integer DEFAULT 0,
  "shares" integer DEFAULT 0,
  "saves" integer DEFAULT 0,
  "engagement_rate" decimal(5,2),
  "conversion_rate" decimal(5,2), -- To chat/subscription
  "revenue_attributed" decimal(10,2) DEFAULT 0,
  "recorded_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ADD PRIMARY KEYS FIRST
ALTER TABLE "public"."character_bible" ADD CONSTRAINT "character_bible_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."content_generation_queue" ADD CONSTRAINT "content_generation_queue_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."content_library" ADD CONSTRAINT "content_library_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."content_analytics" ADD CONSTRAINT "content_analytics_pkey" PRIMARY KEY ("id");

-- Content Schedule - NOW we can reference content_library safely
CREATE TABLE "public"."content_schedule" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "character_key" text NOT NULL,
  "content_id" uuid REFERENCES "public"."content_library"("id"),
  "platform" text NOT NULL, -- 'tiktok', 'instagram', 'twitter'
  "scheduled_for" timestamp with time zone NOT NULL,
  "caption" text,
  "hashtags" text[] DEFAULT '{}',
  "status" text DEFAULT 'scheduled', -- 'scheduled', 'posted', 'failed', 'cancelled'
  "posted_at" timestamp with time zone,
  "platform_post_id" text,
  "engagement_data" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add remaining primary key and foreign key
ALTER TABLE "public"."content_schedule" ADD CONSTRAINT "content_schedule_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."content_analytics" ADD CONSTRAINT "content_analytics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content_library"("id");

-- Enable RLS
ALTER TABLE "public"."character_bible" ENABLE row level security;
ALTER TABLE "public"."content_generation_queue" ENABLE row level security;
ALTER TABLE "public"."content_library" ENABLE row level security;
ALTER TABLE "public"."content_schedule" ENABLE row level security;
ALTER TABLE "public"."content_analytics" ENABLE row level security;

-- Create indexes for performance
CREATE INDEX "character_bible_character_key_idx" ON "public"."character_bible" USING btree ("character_key");
CREATE INDEX "content_queue_status_priority_idx" ON "public"."content_generation_queue" USING btree ("status", "priority" DESC);
CREATE INDEX "content_queue_character_batch_idx" ON "public"."content_generation_queue" USING btree ("character_key", "batch_id");
CREATE INDEX "content_library_character_type_idx" ON "public"."content_library" USING btree ("character_key", "content_type");
CREATE INDEX "content_library_tags_idx" ON "public"."content_library" USING gin ("tags");
CREATE INDEX "content_schedule_character_scheduled_idx" ON "public"."content_schedule" USING btree ("character_key", "scheduled_for");
CREATE INDEX "content_analytics_content_platform_idx" ON "public"."content_analytics" USING btree ("content_id", "platform");

-- RLS Policies - Service role can manage all, authenticated users can read
CREATE POLICY "Service role can manage character bible"
  ON "public"."character_bible"
  AS permissive
  FOR all
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage content queue"
  ON "public"."content_generation_queue"
  AS permissive
  FOR all
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage content library"
  ON "public"."content_library"
  AS permissive
  FOR all
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage content schedule"
  ON "public"."content_schedule"
  AS permissive
  FOR all
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage content analytics"
  ON "public"."content_analytics"
  AS permissive
  FOR all
  TO service_role
  USING (true);

-- Authenticated users can read content library for public content
CREATE POLICY "Users can view active content"
  ON "public"."content_library"
  AS permissive
  FOR select
  TO authenticated, anon
  USING ("status" = 'active');

-- Grant permissions
GRANT SELECT ON TABLE "public"."character_bible" TO "authenticated";
GRANT SELECT ON TABLE "public"."content_library" TO "authenticated", "anon";
GRANT ALL ON TABLE "public"."character_bible" TO "service_role";
GRANT ALL ON TABLE "public"."content_generation_queue" TO "service_role";
GRANT ALL ON TABLE "public"."content_library" TO "service_role";
GRANT ALL ON TABLE "public"."content_schedule" TO "service_role";
GRANT ALL ON TABLE "public"."content_analytics" TO "service_role";

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "character_bible_updated_at" 
  BEFORE UPDATE ON "public"."character_bible"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE TRIGGER "content_generation_queue_updated_at" 
  BEFORE UPDATE ON "public"."content_generation_queue"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE TRIGGER "content_library_updated_at" 
  BEFORE UPDATE ON "public"."content_library"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE TRIGGER "content_schedule_updated_at" 
  BEFORE UPDATE ON "public"."content_schedule"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();