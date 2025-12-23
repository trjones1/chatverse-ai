create extension if not exists "vector" with schema "public";

create type "public"."task_status" as enum ('todo', 'doing', 'review', 'done');

create sequence "public"."archon_code_examples_id_seq";

create sequence "public"."archon_crawled_pages_id_seq";

drop trigger if exists "update_email_logs_updated_at" on "public"."email_logs";

drop policy "Service can manage email logs" on "public"."email_logs";

drop policy "Users can view their own email logs" on "public"."email_logs";

drop policy "Anyone can insert unsubscribes" on "public"."email_unsubscribes";

drop policy "Service can manage unsubscribes" on "public"."email_unsubscribes";

drop policy "Users can view their own unsubscribes" on "public"."email_unsubscribes";

revoke delete on table "public"."email_logs" from "anon";

revoke insert on table "public"."email_logs" from "anon";

revoke references on table "public"."email_logs" from "anon";

revoke select on table "public"."email_logs" from "anon";

revoke trigger on table "public"."email_logs" from "anon";

revoke truncate on table "public"."email_logs" from "anon";

revoke update on table "public"."email_logs" from "anon";

revoke delete on table "public"."email_logs" from "authenticated";

revoke insert on table "public"."email_logs" from "authenticated";

revoke references on table "public"."email_logs" from "authenticated";

revoke select on table "public"."email_logs" from "authenticated";

revoke trigger on table "public"."email_logs" from "authenticated";

revoke truncate on table "public"."email_logs" from "authenticated";

revoke update on table "public"."email_logs" from "authenticated";

revoke delete on table "public"."email_logs" from "service_role";

revoke insert on table "public"."email_logs" from "service_role";

revoke references on table "public"."email_logs" from "service_role";

revoke select on table "public"."email_logs" from "service_role";

revoke trigger on table "public"."email_logs" from "service_role";

revoke truncate on table "public"."email_logs" from "service_role";

revoke update on table "public"."email_logs" from "service_role";

revoke delete on table "public"."email_unsubscribes" from "anon";

revoke insert on table "public"."email_unsubscribes" from "anon";

revoke references on table "public"."email_unsubscribes" from "anon";

revoke select on table "public"."email_unsubscribes" from "anon";

revoke trigger on table "public"."email_unsubscribes" from "anon";

revoke truncate on table "public"."email_unsubscribes" from "anon";

revoke update on table "public"."email_unsubscribes" from "anon";

revoke delete on table "public"."email_unsubscribes" from "authenticated";

revoke insert on table "public"."email_unsubscribes" from "authenticated";

revoke references on table "public"."email_unsubscribes" from "authenticated";

revoke select on table "public"."email_unsubscribes" from "authenticated";

revoke trigger on table "public"."email_unsubscribes" from "authenticated";

revoke truncate on table "public"."email_unsubscribes" from "authenticated";

revoke update on table "public"."email_unsubscribes" from "authenticated";

revoke delete on table "public"."email_unsubscribes" from "service_role";

revoke insert on table "public"."email_unsubscribes" from "service_role";

revoke references on table "public"."email_unsubscribes" from "service_role";

revoke select on table "public"."email_unsubscribes" from "service_role";

revoke trigger on table "public"."email_unsubscribes" from "service_role";

revoke truncate on table "public"."email_unsubscribes" from "service_role";

revoke update on table "public"."email_unsubscribes" from "service_role";

alter table "public"."email_logs" drop constraint "email_logs_status_check";

alter table "public"."email_logs" drop constraint "email_logs_user_id_fkey";

alter table "public"."email_unsubscribes" drop constraint "email_unsubscribes_token_key";

alter table "public"."email_unsubscribes" drop constraint "email_unsubscribes_user_id_fkey";

drop function if exists "public"."cleanup_old_email_records"();

drop function if exists "public"."create_user_email_preferences"();

drop function if exists "public"."get_email_campaign_analytics"(campaign_key_param text, date_from timestamp with time zone, date_to timestamp with time zone);

drop function if exists "public"."get_inactive_users"(days_inactive integer, email_limit integer);

drop function if exists "public"."get_inactive_users_for_campaigns"(min_days integer, max_days integer, result_limit integer);

drop function if exists "public"."track_user_login_activity"();

drop function if exists "public"."unsubscribe_user"(unsubscribe_token text);

alter table "public"."email_logs" drop constraint "email_logs_pkey";

alter table "public"."email_unsubscribes" drop constraint "email_unsubscribes_pkey";

drop index if exists "public"."email_logs_pkey";

drop index if exists "public"."email_unsubscribes_pkey";

drop index if exists "public"."email_unsubscribes_token_key";

drop index if exists "public"."idx_email_logs_campaign_type";

drop index if exists "public"."idx_email_logs_message_id";

drop index if exists "public"."idx_email_logs_sent_at";

drop index if exists "public"."idx_email_logs_status";

drop index if exists "public"."idx_email_logs_user_id";

drop index if exists "public"."idx_email_unsubscribes_email";

drop index if exists "public"."idx_email_unsubscribes_token";

drop index if exists "public"."idx_email_unsubscribes_user_id";

drop table "public"."email_logs";

drop table "public"."email_unsubscribes";


  create table "public"."archon_code_examples" (
    "id" bigint not null default nextval('archon_code_examples_id_seq'::regclass),
    "url" character varying not null,
    "chunk_number" integer not null,
    "content" text not null,
    "summary" text not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "source_id" text not null,
    "embedding" vector(1536),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."archon_code_examples" enable row level security;


  create table "public"."archon_crawled_pages" (
    "id" bigint not null default nextval('archon_crawled_pages_id_seq'::regclass),
    "url" character varying not null,
    "chunk_number" integer not null,
    "content" text not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "source_id" text not null,
    "embedding" vector(1536),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."archon_crawled_pages" enable row level security;


  create table "public"."archon_document_versions" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "task_id" uuid,
    "field_name" text not null,
    "version_number" integer not null,
    "content" jsonb not null,
    "change_summary" text,
    "change_type" text default 'update'::text,
    "document_id" text,
    "created_by" text default 'system'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."archon_document_versions" enable row level security;


  create table "public"."archon_project_sources" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "source_id" text not null,
    "linked_at" timestamp with time zone default now(),
    "created_by" text default 'system'::text,
    "notes" text
      );


alter table "public"."archon_project_sources" enable row level security;


  create table "public"."archon_projects" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text default ''::text,
    "docs" jsonb default '[]'::jsonb,
    "features" jsonb default '[]'::jsonb,
    "data" jsonb default '[]'::jsonb,
    "github_repo" text,
    "pinned" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."archon_projects" enable row level security;


  create table "public"."archon_prompts" (
    "id" uuid not null default gen_random_uuid(),
    "prompt_name" text not null,
    "prompt" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."archon_prompts" enable row level security;


  create table "public"."archon_settings" (
    "id" uuid not null default gen_random_uuid(),
    "key" character varying(255) not null,
    "value" text,
    "encrypted_value" text,
    "is_encrypted" boolean default false,
    "category" character varying(100),
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."archon_settings" enable row level security;


  create table "public"."archon_sources" (
    "source_id" text not null,
    "source_url" text,
    "source_display_name" text,
    "summary" text,
    "total_word_count" integer default 0,
    "title" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."archon_sources" enable row level security;


  create table "public"."archon_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "parent_task_id" uuid,
    "title" text not null,
    "description" text default ''::text,
    "status" task_status default 'todo'::task_status,
    "assignee" text default 'User'::text,
    "task_order" integer default 0,
    "feature" text,
    "sources" jsonb default '[]'::jsonb,
    "code_examples" jsonb default '[]'::jsonb,
    "archived" boolean default false,
    "archived_at" timestamp with time zone,
    "archived_by" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."archon_tasks" enable row level security;

alter sequence "public"."archon_code_examples_id_seq" owned by "public"."archon_code_examples"."id";

alter sequence "public"."archon_crawled_pages_id_seq" owned by "public"."archon_crawled_pages"."id";

CREATE INDEX archon_code_examples_embedding_idx ON public.archon_code_examples USING ivfflat (embedding vector_cosine_ops);

CREATE UNIQUE INDEX archon_code_examples_pkey ON public.archon_code_examples USING btree (id);

CREATE UNIQUE INDEX archon_code_examples_url_chunk_number_key ON public.archon_code_examples USING btree (url, chunk_number);

CREATE INDEX archon_crawled_pages_embedding_idx ON public.archon_crawled_pages USING ivfflat (embedding vector_cosine_ops);

CREATE UNIQUE INDEX archon_crawled_pages_pkey ON public.archon_crawled_pages USING btree (id);

CREATE UNIQUE INDEX archon_crawled_pages_url_chunk_number_key ON public.archon_crawled_pages USING btree (url, chunk_number);

CREATE UNIQUE INDEX archon_document_versions_pkey ON public.archon_document_versions USING btree (id);

CREATE UNIQUE INDEX archon_document_versions_project_id_task_id_field_name_vers_key ON public.archon_document_versions USING btree (project_id, task_id, field_name, version_number);

CREATE UNIQUE INDEX archon_project_sources_pkey ON public.archon_project_sources USING btree (id);

CREATE UNIQUE INDEX archon_project_sources_project_id_source_id_key ON public.archon_project_sources USING btree (project_id, source_id);

CREATE UNIQUE INDEX archon_projects_pkey ON public.archon_projects USING btree (id);

CREATE UNIQUE INDEX archon_prompts_pkey ON public.archon_prompts USING btree (id);

CREATE UNIQUE INDEX archon_prompts_prompt_name_key ON public.archon_prompts USING btree (prompt_name);

CREATE UNIQUE INDEX archon_settings_key_key ON public.archon_settings USING btree (key);

CREATE UNIQUE INDEX archon_settings_pkey ON public.archon_settings USING btree (id);

CREATE UNIQUE INDEX archon_sources_pkey ON public.archon_sources USING btree (source_id);

CREATE UNIQUE INDEX archon_tasks_pkey ON public.archon_tasks USING btree (id);

CREATE INDEX idx_archon_code_examples_metadata ON public.archon_code_examples USING gin (metadata);

CREATE INDEX idx_archon_code_examples_source_id ON public.archon_code_examples USING btree (source_id);

CREATE INDEX idx_archon_crawled_pages_metadata ON public.archon_crawled_pages USING gin (metadata);

CREATE INDEX idx_archon_crawled_pages_source_id ON public.archon_crawled_pages USING btree (source_id);

CREATE INDEX idx_archon_document_versions_created_at ON public.archon_document_versions USING btree (created_at);

CREATE INDEX idx_archon_document_versions_field_name ON public.archon_document_versions USING btree (field_name);

CREATE INDEX idx_archon_document_versions_project_id ON public.archon_document_versions USING btree (project_id);

CREATE INDEX idx_archon_document_versions_task_id ON public.archon_document_versions USING btree (task_id);

CREATE INDEX idx_archon_document_versions_version_number ON public.archon_document_versions USING btree (version_number);

CREATE INDEX idx_archon_project_sources_project_id ON public.archon_project_sources USING btree (project_id);

CREATE INDEX idx_archon_project_sources_source_id ON public.archon_project_sources USING btree (source_id);

CREATE INDEX idx_archon_prompts_name ON public.archon_prompts USING btree (prompt_name);

CREATE INDEX idx_archon_settings_category ON public.archon_settings USING btree (category);

CREATE INDEX idx_archon_settings_key ON public.archon_settings USING btree (key);

CREATE INDEX idx_archon_sources_display_name ON public.archon_sources USING btree (source_display_name);

CREATE INDEX idx_archon_sources_knowledge_type ON public.archon_sources USING btree (((metadata ->> 'knowledge_type'::text)));

CREATE INDEX idx_archon_sources_metadata ON public.archon_sources USING gin (metadata);

CREATE INDEX idx_archon_sources_title ON public.archon_sources USING btree (title);

CREATE INDEX idx_archon_sources_url ON public.archon_sources USING btree (source_url);

CREATE INDEX idx_archon_tasks_archived ON public.archon_tasks USING btree (archived);

CREATE INDEX idx_archon_tasks_archived_at ON public.archon_tasks USING btree (archived_at);

CREATE INDEX idx_archon_tasks_assignee ON public.archon_tasks USING btree (assignee);

CREATE INDEX idx_archon_tasks_order ON public.archon_tasks USING btree (task_order);

CREATE INDEX idx_archon_tasks_project_id ON public.archon_tasks USING btree (project_id);

CREATE INDEX idx_archon_tasks_status ON public.archon_tasks USING btree (status);

alter table "public"."archon_code_examples" add constraint "archon_code_examples_pkey" PRIMARY KEY using index "archon_code_examples_pkey";

alter table "public"."archon_crawled_pages" add constraint "archon_crawled_pages_pkey" PRIMARY KEY using index "archon_crawled_pages_pkey";

alter table "public"."archon_document_versions" add constraint "archon_document_versions_pkey" PRIMARY KEY using index "archon_document_versions_pkey";

alter table "public"."archon_project_sources" add constraint "archon_project_sources_pkey" PRIMARY KEY using index "archon_project_sources_pkey";

alter table "public"."archon_projects" add constraint "archon_projects_pkey" PRIMARY KEY using index "archon_projects_pkey";

alter table "public"."archon_prompts" add constraint "archon_prompts_pkey" PRIMARY KEY using index "archon_prompts_pkey";

alter table "public"."archon_settings" add constraint "archon_settings_pkey" PRIMARY KEY using index "archon_settings_pkey";

alter table "public"."archon_sources" add constraint "archon_sources_pkey" PRIMARY KEY using index "archon_sources_pkey";

alter table "public"."archon_tasks" add constraint "archon_tasks_pkey" PRIMARY KEY using index "archon_tasks_pkey";

alter table "public"."archon_code_examples" add constraint "archon_code_examples_source_id_fkey" FOREIGN KEY (source_id) REFERENCES archon_sources(source_id) not valid;

alter table "public"."archon_code_examples" validate constraint "archon_code_examples_source_id_fkey";

alter table "public"."archon_code_examples" add constraint "archon_code_examples_url_chunk_number_key" UNIQUE using index "archon_code_examples_url_chunk_number_key";

alter table "public"."archon_crawled_pages" add constraint "archon_crawled_pages_source_id_fkey" FOREIGN KEY (source_id) REFERENCES archon_sources(source_id) not valid;

alter table "public"."archon_crawled_pages" validate constraint "archon_crawled_pages_source_id_fkey";

alter table "public"."archon_crawled_pages" add constraint "archon_crawled_pages_url_chunk_number_key" UNIQUE using index "archon_crawled_pages_url_chunk_number_key";

alter table "public"."archon_document_versions" add constraint "archon_document_versions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES archon_projects(id) ON DELETE CASCADE not valid;

alter table "public"."archon_document_versions" validate constraint "archon_document_versions_project_id_fkey";

alter table "public"."archon_document_versions" add constraint "archon_document_versions_project_id_task_id_field_name_vers_key" UNIQUE using index "archon_document_versions_project_id_task_id_field_name_vers_key";

alter table "public"."archon_document_versions" add constraint "archon_document_versions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES archon_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."archon_document_versions" validate constraint "archon_document_versions_task_id_fkey";

alter table "public"."archon_document_versions" add constraint "chk_project_or_task" CHECK ((((project_id IS NOT NULL) AND (task_id IS NULL)) OR ((project_id IS NULL) AND (task_id IS NOT NULL)))) not valid;

alter table "public"."archon_document_versions" validate constraint "chk_project_or_task";

alter table "public"."archon_project_sources" add constraint "archon_project_sources_project_id_fkey" FOREIGN KEY (project_id) REFERENCES archon_projects(id) ON DELETE CASCADE not valid;

alter table "public"."archon_project_sources" validate constraint "archon_project_sources_project_id_fkey";

alter table "public"."archon_project_sources" add constraint "archon_project_sources_project_id_source_id_key" UNIQUE using index "archon_project_sources_project_id_source_id_key";

alter table "public"."archon_prompts" add constraint "archon_prompts_prompt_name_key" UNIQUE using index "archon_prompts_prompt_name_key";

alter table "public"."archon_settings" add constraint "archon_settings_key_key" UNIQUE using index "archon_settings_key_key";

alter table "public"."archon_tasks" add constraint "archon_tasks_assignee_check" CHECK (((assignee IS NOT NULL) AND (assignee <> ''::text))) not valid;

alter table "public"."archon_tasks" validate constraint "archon_tasks_assignee_check";

alter table "public"."archon_tasks" add constraint "archon_tasks_parent_task_id_fkey" FOREIGN KEY (parent_task_id) REFERENCES archon_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."archon_tasks" validate constraint "archon_tasks_parent_task_id_fkey";

alter table "public"."archon_tasks" add constraint "archon_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES archon_projects(id) ON DELETE CASCADE not valid;

alter table "public"."archon_tasks" validate constraint "archon_tasks_project_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.archive_task(task_id_param uuid, archived_by_param text DEFAULT 'system'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists and is not already archived
    SELECT EXISTS(
        SELECT 1 FROM archon_tasks
        WHERE id = task_id_param AND archived = FALSE
    ) INTO task_exists;

    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;

    -- Archive the task
    UPDATE archon_tasks
    SET
        archived = TRUE,
        archived_at = NOW(),
        archived_by = archived_by_param,
        updated_at = NOW()
    WHERE id = task_id_param;

    -- Also archive all subtasks
    UPDATE archon_tasks
    SET
        archived = TRUE,
        archived_at = NOW(),
        archived_by = archived_by_param,
        updated_at = NOW()
    WHERE parent_task_id = task_id_param AND archived = FALSE;

    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_archon_code_examples(query_embedding vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb, source_filter text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, url character varying, chunk_number integer, content text, summary text, metadata jsonb, source_id text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    url,
    chunk_number,
    content,
    summary,
    metadata,
    source_id,
    1 - (archon_code_examples.embedding <=> query_embedding) AS similarity
  FROM archon_code_examples
  WHERE metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  ORDER BY archon_code_examples.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_archon_crawled_pages(query_embedding vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb, source_filter text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, url character varying, chunk_number integer, content text, metadata jsonb, source_id text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    url,
    chunk_number,
    content,
    metadata,
    source_id,
    1 - (archon_crawled_pages.embedding <=> query_embedding) AS similarity
  FROM archon_crawled_pages
  WHERE metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  ORDER BY archon_crawled_pages.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_one_voice_credit_v2(p_user_id uuid, p_stripe_customer_id text, p_character_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet_id uuid;
  v_current_credits integer;
BEGIN
  -- Get or create wallet for this user/character combination
  SELECT id INTO v_wallet_id 
  FROM voice_wallets 
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO voice_wallets (user_id, character_key) 
    VALUES (p_user_id, p_character_key) 
    RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Calculate current credits
  SELECT COALESCE(SUM(delta), 0) INTO v_current_credits
  FROM voice_credit_ledger 
  WHERE wallet_id = v_wallet_id;
  
  -- Check if user has at least 1 credit
  IF v_current_credits < 1 THEN
    RETURN false;
  END IF;
  
  -- Consume 1 credit by adding negative entry
  INSERT INTO voice_credit_ledger (wallet_id, delta, reason, created_at)
  VALUES (v_wallet_id, -1, 'voice_message', NOW());
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_voice_credits(p_user_id uuid, p_character_key text, p_credits_needed integer, p_reason text DEFAULT 'voice_generation'::text)
 RETURNS TABLE(success boolean, wallet_id uuid, remaining_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet_id uuid;
  v_current_credits integer;
BEGIN
  -- Get or create wallet for this user/character combination
  SELECT id INTO v_wallet_id 
  FROM voice_wallets 
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO voice_wallets (user_id, p_character_key) 
    VALUES (p_user_id, p_character_key) 
    RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Calculate current credits
  SELECT COALESCE(SUM(delta), 0) INTO v_current_credits
  FROM voice_credit_ledger 
  WHERE wallet_id = v_wallet_id;
  
  -- Check if user has sufficient credits
  IF v_current_credits < p_credits_needed THEN
    RETURN QUERY SELECT false, v_wallet_id, v_current_credits;
    RETURN;
  END IF;
  
  -- Consume credits by adding negative entry
  INSERT INTO voice_credit_ledger (wallet_id, delta, reason, created_at)
  VALUES (v_wallet_id, -p_credits_needed, p_reason, NOW());
  
  -- Calculate new balance
  v_current_credits := v_current_credits - p_credits_needed;
  
  RETURN QUERY SELECT true, v_wallet_id, v_current_credits;
END;
$function$
;

grant delete on table "public"."archon_code_examples" to "anon";

grant insert on table "public"."archon_code_examples" to "anon";

grant references on table "public"."archon_code_examples" to "anon";

grant select on table "public"."archon_code_examples" to "anon";

grant trigger on table "public"."archon_code_examples" to "anon";

grant truncate on table "public"."archon_code_examples" to "anon";

grant update on table "public"."archon_code_examples" to "anon";

grant delete on table "public"."archon_code_examples" to "authenticated";

grant insert on table "public"."archon_code_examples" to "authenticated";

grant references on table "public"."archon_code_examples" to "authenticated";

grant select on table "public"."archon_code_examples" to "authenticated";

grant trigger on table "public"."archon_code_examples" to "authenticated";

grant truncate on table "public"."archon_code_examples" to "authenticated";

grant update on table "public"."archon_code_examples" to "authenticated";

grant delete on table "public"."archon_code_examples" to "service_role";

grant insert on table "public"."archon_code_examples" to "service_role";

grant references on table "public"."archon_code_examples" to "service_role";

grant select on table "public"."archon_code_examples" to "service_role";

grant trigger on table "public"."archon_code_examples" to "service_role";

grant truncate on table "public"."archon_code_examples" to "service_role";

grant update on table "public"."archon_code_examples" to "service_role";

grant delete on table "public"."archon_crawled_pages" to "anon";

grant insert on table "public"."archon_crawled_pages" to "anon";

grant references on table "public"."archon_crawled_pages" to "anon";

grant select on table "public"."archon_crawled_pages" to "anon";

grant trigger on table "public"."archon_crawled_pages" to "anon";

grant truncate on table "public"."archon_crawled_pages" to "anon";

grant update on table "public"."archon_crawled_pages" to "anon";

grant delete on table "public"."archon_crawled_pages" to "authenticated";

grant insert on table "public"."archon_crawled_pages" to "authenticated";

grant references on table "public"."archon_crawled_pages" to "authenticated";

grant select on table "public"."archon_crawled_pages" to "authenticated";

grant trigger on table "public"."archon_crawled_pages" to "authenticated";

grant truncate on table "public"."archon_crawled_pages" to "authenticated";

grant update on table "public"."archon_crawled_pages" to "authenticated";

grant delete on table "public"."archon_crawled_pages" to "service_role";

grant insert on table "public"."archon_crawled_pages" to "service_role";

grant references on table "public"."archon_crawled_pages" to "service_role";

grant select on table "public"."archon_crawled_pages" to "service_role";

grant trigger on table "public"."archon_crawled_pages" to "service_role";

grant truncate on table "public"."archon_crawled_pages" to "service_role";

grant update on table "public"."archon_crawled_pages" to "service_role";

grant delete on table "public"."archon_document_versions" to "anon";

grant insert on table "public"."archon_document_versions" to "anon";

grant references on table "public"."archon_document_versions" to "anon";

grant select on table "public"."archon_document_versions" to "anon";

grant trigger on table "public"."archon_document_versions" to "anon";

grant truncate on table "public"."archon_document_versions" to "anon";

grant update on table "public"."archon_document_versions" to "anon";

grant delete on table "public"."archon_document_versions" to "authenticated";

grant insert on table "public"."archon_document_versions" to "authenticated";

grant references on table "public"."archon_document_versions" to "authenticated";

grant select on table "public"."archon_document_versions" to "authenticated";

grant trigger on table "public"."archon_document_versions" to "authenticated";

grant truncate on table "public"."archon_document_versions" to "authenticated";

grant update on table "public"."archon_document_versions" to "authenticated";

grant delete on table "public"."archon_document_versions" to "service_role";

grant insert on table "public"."archon_document_versions" to "service_role";

grant references on table "public"."archon_document_versions" to "service_role";

grant select on table "public"."archon_document_versions" to "service_role";

grant trigger on table "public"."archon_document_versions" to "service_role";

grant truncate on table "public"."archon_document_versions" to "service_role";

grant update on table "public"."archon_document_versions" to "service_role";

grant delete on table "public"."archon_project_sources" to "anon";

grant insert on table "public"."archon_project_sources" to "anon";

grant references on table "public"."archon_project_sources" to "anon";

grant select on table "public"."archon_project_sources" to "anon";

grant trigger on table "public"."archon_project_sources" to "anon";

grant truncate on table "public"."archon_project_sources" to "anon";

grant update on table "public"."archon_project_sources" to "anon";

grant delete on table "public"."archon_project_sources" to "authenticated";

grant insert on table "public"."archon_project_sources" to "authenticated";

grant references on table "public"."archon_project_sources" to "authenticated";

grant select on table "public"."archon_project_sources" to "authenticated";

grant trigger on table "public"."archon_project_sources" to "authenticated";

grant truncate on table "public"."archon_project_sources" to "authenticated";

grant update on table "public"."archon_project_sources" to "authenticated";

grant delete on table "public"."archon_project_sources" to "service_role";

grant insert on table "public"."archon_project_sources" to "service_role";

grant references on table "public"."archon_project_sources" to "service_role";

grant select on table "public"."archon_project_sources" to "service_role";

grant trigger on table "public"."archon_project_sources" to "service_role";

grant truncate on table "public"."archon_project_sources" to "service_role";

grant update on table "public"."archon_project_sources" to "service_role";

grant delete on table "public"."archon_projects" to "anon";

grant insert on table "public"."archon_projects" to "anon";

grant references on table "public"."archon_projects" to "anon";

grant select on table "public"."archon_projects" to "anon";

grant trigger on table "public"."archon_projects" to "anon";

grant truncate on table "public"."archon_projects" to "anon";

grant update on table "public"."archon_projects" to "anon";

grant delete on table "public"."archon_projects" to "authenticated";

grant insert on table "public"."archon_projects" to "authenticated";

grant references on table "public"."archon_projects" to "authenticated";

grant select on table "public"."archon_projects" to "authenticated";

grant trigger on table "public"."archon_projects" to "authenticated";

grant truncate on table "public"."archon_projects" to "authenticated";

grant update on table "public"."archon_projects" to "authenticated";

grant delete on table "public"."archon_projects" to "service_role";

grant insert on table "public"."archon_projects" to "service_role";

grant references on table "public"."archon_projects" to "service_role";

grant select on table "public"."archon_projects" to "service_role";

grant trigger on table "public"."archon_projects" to "service_role";

grant truncate on table "public"."archon_projects" to "service_role";

grant update on table "public"."archon_projects" to "service_role";

grant delete on table "public"."archon_prompts" to "anon";

grant insert on table "public"."archon_prompts" to "anon";

grant references on table "public"."archon_prompts" to "anon";

grant select on table "public"."archon_prompts" to "anon";

grant trigger on table "public"."archon_prompts" to "anon";

grant truncate on table "public"."archon_prompts" to "anon";

grant update on table "public"."archon_prompts" to "anon";

grant delete on table "public"."archon_prompts" to "authenticated";

grant insert on table "public"."archon_prompts" to "authenticated";

grant references on table "public"."archon_prompts" to "authenticated";

grant select on table "public"."archon_prompts" to "authenticated";

grant trigger on table "public"."archon_prompts" to "authenticated";

grant truncate on table "public"."archon_prompts" to "authenticated";

grant update on table "public"."archon_prompts" to "authenticated";

grant delete on table "public"."archon_prompts" to "service_role";

grant insert on table "public"."archon_prompts" to "service_role";

grant references on table "public"."archon_prompts" to "service_role";

grant select on table "public"."archon_prompts" to "service_role";

grant trigger on table "public"."archon_prompts" to "service_role";

grant truncate on table "public"."archon_prompts" to "service_role";

grant update on table "public"."archon_prompts" to "service_role";

grant delete on table "public"."archon_settings" to "anon";

grant insert on table "public"."archon_settings" to "anon";

grant references on table "public"."archon_settings" to "anon";

grant select on table "public"."archon_settings" to "anon";

grant trigger on table "public"."archon_settings" to "anon";

grant truncate on table "public"."archon_settings" to "anon";

grant update on table "public"."archon_settings" to "anon";

grant delete on table "public"."archon_settings" to "authenticated";

grant insert on table "public"."archon_settings" to "authenticated";

grant references on table "public"."archon_settings" to "authenticated";

grant select on table "public"."archon_settings" to "authenticated";

grant trigger on table "public"."archon_settings" to "authenticated";

grant truncate on table "public"."archon_settings" to "authenticated";

grant update on table "public"."archon_settings" to "authenticated";

grant delete on table "public"."archon_settings" to "service_role";

grant insert on table "public"."archon_settings" to "service_role";

grant references on table "public"."archon_settings" to "service_role";

grant select on table "public"."archon_settings" to "service_role";

grant trigger on table "public"."archon_settings" to "service_role";

grant truncate on table "public"."archon_settings" to "service_role";

grant update on table "public"."archon_settings" to "service_role";

grant delete on table "public"."archon_sources" to "anon";

grant insert on table "public"."archon_sources" to "anon";

grant references on table "public"."archon_sources" to "anon";

grant select on table "public"."archon_sources" to "anon";

grant trigger on table "public"."archon_sources" to "anon";

grant truncate on table "public"."archon_sources" to "anon";

grant update on table "public"."archon_sources" to "anon";

grant delete on table "public"."archon_sources" to "authenticated";

grant insert on table "public"."archon_sources" to "authenticated";

grant references on table "public"."archon_sources" to "authenticated";

grant select on table "public"."archon_sources" to "authenticated";

grant trigger on table "public"."archon_sources" to "authenticated";

grant truncate on table "public"."archon_sources" to "authenticated";

grant update on table "public"."archon_sources" to "authenticated";

grant delete on table "public"."archon_sources" to "service_role";

grant insert on table "public"."archon_sources" to "service_role";

grant references on table "public"."archon_sources" to "service_role";

grant select on table "public"."archon_sources" to "service_role";

grant trigger on table "public"."archon_sources" to "service_role";

grant truncate on table "public"."archon_sources" to "service_role";

grant update on table "public"."archon_sources" to "service_role";

grant delete on table "public"."archon_tasks" to "anon";

grant insert on table "public"."archon_tasks" to "anon";

grant references on table "public"."archon_tasks" to "anon";

grant select on table "public"."archon_tasks" to "anon";

grant trigger on table "public"."archon_tasks" to "anon";

grant truncate on table "public"."archon_tasks" to "anon";

grant update on table "public"."archon_tasks" to "anon";

grant delete on table "public"."archon_tasks" to "authenticated";

grant insert on table "public"."archon_tasks" to "authenticated";

grant references on table "public"."archon_tasks" to "authenticated";

grant select on table "public"."archon_tasks" to "authenticated";

grant trigger on table "public"."archon_tasks" to "authenticated";

grant truncate on table "public"."archon_tasks" to "authenticated";

grant update on table "public"."archon_tasks" to "authenticated";

grant delete on table "public"."archon_tasks" to "service_role";

grant insert on table "public"."archon_tasks" to "service_role";

grant references on table "public"."archon_tasks" to "service_role";

grant select on table "public"."archon_tasks" to "service_role";

grant trigger on table "public"."archon_tasks" to "service_role";

grant truncate on table "public"."archon_tasks" to "service_role";

grant update on table "public"."archon_tasks" to "service_role";


  create policy "Allow public read access to archon_code_examples"
  on "public"."archon_code_examples"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public read access to archon_crawled_pages"
  on "public"."archon_crawled_pages"
  as permissive
  for select
  to public
using (true);



  create policy "Allow authenticated users to read archon_document_versions"
  on "public"."archon_document_versions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role full access to archon_document_versions"
  on "public"."archon_document_versions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow authenticated users to read and update archon_project_sou"
  on "public"."archon_project_sources"
  as permissive
  for all
  to authenticated
using (true);



  create policy "Allow service role full access to archon_project_sources"
  on "public"."archon_project_sources"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow authenticated users to read and update archon_projects"
  on "public"."archon_projects"
  as permissive
  for all
  to authenticated
using (true);



  create policy "Allow service role full access to archon_projects"
  on "public"."archon_projects"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow authenticated users to read archon_prompts"
  on "public"."archon_prompts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role full access to archon_prompts"
  on "public"."archon_prompts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow authenticated users to read and update"
  on "public"."archon_settings"
  as permissive
  for all
  to authenticated
using (true);



  create policy "Allow service role full access"
  on "public"."archon_settings"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow public read access to archon_sources"
  on "public"."archon_sources"
  as permissive
  for select
  to public
using (true);



  create policy "Allow authenticated users to read and update archon_tasks"
  on "public"."archon_tasks"
  as permissive
  for all
  to authenticated
using (true);



  create policy "Allow service role full access to archon_tasks"
  on "public"."archon_tasks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));


CREATE TRIGGER update_archon_projects_updated_at BEFORE UPDATE ON public.archon_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archon_prompts_updated_at BEFORE UPDATE ON public.archon_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archon_settings_updated_at BEFORE UPDATE ON public.archon_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archon_tasks_updated_at BEFORE UPDATE ON public.archon_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


