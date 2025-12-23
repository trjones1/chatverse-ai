// scripts/create-content-tables.js
// Script to create content pipeline tables manually

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🚀 Creating content pipeline tables...');
  
  try {
    // Character Bible Table
    console.log('📖 Creating character_bible table...');
    const { error: bibleError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "public"."character_bible" (
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
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now(),
          CONSTRAINT "character_bible_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX IF NOT EXISTS "character_bible_character_key_idx" ON "public"."character_bible" USING btree ("character_key");
      `
    });
    
    if (bibleError) throw bibleError;
    console.log('✅ Character bible table created');

    // Content Generation Queue Table  
    console.log('🎨 Creating content_generation_queue table...');
    const { error: queueError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "public"."content_generation_queue" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "character_key" text NOT NULL,
          "content_type" text NOT NULL CHECK (content_type IN ('image', 'video', 'batch')),
          "generation_prompt" text NOT NULL,
          "prompt_data" jsonb DEFAULT '{}',
          "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          "priority" integer DEFAULT 5,
          "batch_id" uuid,
          "error_message" text,
          "processing_data" jsonb DEFAULT '{}',
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now(),
          CONSTRAINT "content_generation_queue_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX IF NOT EXISTS "content_generation_queue_status_idx" ON "public"."content_generation_queue" USING btree ("status");
        CREATE INDEX IF NOT EXISTS "content_generation_queue_character_key_idx" ON "public"."content_generation_queue" USING btree ("character_key");
        CREATE INDEX IF NOT EXISTS "content_generation_queue_batch_id_idx" ON "public"."content_generation_queue" USING btree ("batch_id");
      `
    });
    
    if (queueError) throw queueError;
    console.log('✅ Content generation queue table created');

    // Content Library Table
    console.log('📚 Creating content_library table...');
    const { error: libraryError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "public"."content_library" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "character_key" text NOT NULL,
          "content_type" text NOT NULL CHECK (content_type IN ('image', 'video', 'story', 'caption')),
          "file_url" text,
          "thumbnail_url" text,
          "metadata" jsonb DEFAULT '{}',
          "generation_prompt" text,
          "mood" text,
          "setting" text,
          "style_tags" text[],
          "quality_score" integer,
          "status" text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now(),
          CONSTRAINT "content_library_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX IF NOT EXISTS "content_library_character_key_idx" ON "public"."content_library" USING btree ("character_key");
        CREATE INDEX IF NOT EXISTS "content_library_content_type_idx" ON "public"."content_library" USING btree ("content_type");
        CREATE INDEX IF NOT EXISTS "content_library_status_idx" ON "public"."content_library" USING btree ("status");
      `
    });
    
    if (libraryError) throw libraryError;
    console.log('✅ Content library table created');

    // Content Schedule Table
    console.log('📅 Creating content_schedule table...');
    const { error: scheduleError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "public"."content_schedule" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "character_key" text NOT NULL,
          "content_id" uuid NOT NULL,
          "platform" text NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'twitter', 'youtube')),
          "scheduled_for" timestamp with time zone NOT NULL,
          "status" text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
          "caption" text,
          "hashtags" text[],
          "posting_metadata" jsonb DEFAULT '{}',
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now(),
          CONSTRAINT "content_schedule_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX IF NOT EXISTS "content_schedule_character_key_idx" ON "public"."content_schedule" USING btree ("character_key");
        CREATE INDEX IF NOT EXISTS "content_schedule_scheduled_for_idx" ON "public"."content_schedule" USING btree ("scheduled_for");
        CREATE INDEX IF NOT EXISTS "content_schedule_platform_idx" ON "public"."content_schedule" USING btree ("platform");
      `
    });
    
    if (scheduleError) throw scheduleError;
    console.log('✅ Content schedule table created');

    // Content Analytics Table
    console.log('📊 Creating content_analytics table...');
    const { error: analyticsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "public"."content_analytics" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "content_id" uuid NOT NULL,
          "character_key" text NOT NULL,
          "platform" text NOT NULL,
          "metrics" jsonb DEFAULT '{}',
          "engagement_rate" numeric,
          "reach" integer,
          "impressions" integer,
          "recorded_at" timestamp with time zone NOT NULL,
          "created_at" timestamp with time zone DEFAULT now(),
          CONSTRAINT "content_analytics_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX IF NOT EXISTS "content_analytics_content_id_idx" ON "public"."content_analytics" USING btree ("content_id");
        CREATE INDEX IF NOT EXISTS "content_analytics_character_key_idx" ON "public"."content_analytics" USING btree ("character_key");
        CREATE INDEX IF NOT EXISTS "content_analytics_recorded_at_idx" ON "public"."content_analytics" USING btree ("recorded_at");
      `
    });
    
    if (analyticsError) throw analyticsError;
    console.log('✅ Content analytics table created');

    console.log('🎉 All content pipeline tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

// Run the script
createTables();