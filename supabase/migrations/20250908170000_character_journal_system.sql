-- Create character journal posts table
create table "public"."character_journal_posts" (
  "id" uuid not null default gen_random_uuid(),
  "character_key" text not null,
  "title" text not null,
  "content" text not null,
  "image_url" text,
  "mood" text,
  "tags" text[] default '{}',
  "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
  "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
  "published" boolean default true
);

-- Enable RLS
alter table "public"."character_journal_posts" enable row level security;

-- Create indexes
create index "character_journal_posts_character_key_idx" on "public"."character_journal_posts" using btree ("character_key");
create index "character_journal_posts_created_at_idx" on "public"."character_journal_posts" using btree ("created_at" desc);
create index "character_journal_posts_published_idx" on "public"."character_journal_posts" using btree ("published", "created_at" desc);

-- Primary key
alter table "public"."character_journal_posts" add constraint "character_journal_posts_pkey" primary key ("id");

-- RLS policies - anyone can read published posts (for public stickiness)
create policy "Anyone can view published journal posts"
  on "public"."character_journal_posts"
  as permissive
  for select
  to public
  using ("published" = true);

-- Service role can manage all posts (for admin/automated content)
create policy "Service role can manage all journal posts"
  on "public"."character_journal_posts"
  as permissive
  for all
  to service_role
  using (true);

-- Grant permissions
grant select on table "public"."character_journal_posts" to "anon";
grant select on table "public"."character_journal_posts" to "authenticated";
grant all on table "public"."character_journal_posts" to "service_role";

-- Trigger for updated_at
create trigger "character_journal_posts_updated_at" 
  before update on "public"."character_journal_posts"
  for each row execute function "public"."set_updated_at"();