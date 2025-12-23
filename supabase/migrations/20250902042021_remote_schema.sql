drop extension if exists "pg_net";

create type "public"."order_status" as enum ('pending', 'complete', 'failed');

create type "public"."product_type" as enum ('subscription', 'voice_pack', 'content_pack');


  create table "public"."credits_grants" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" text not null,
    "email" text not null,
    "credits" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "character_key" text,
    "reason" text,
    "user_id" uuid
      );



  create table "public"."daily_chat_usage" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "character_key" text not null,
    "date" date not null default CURRENT_DATE,
    "chat_count" integer default 0,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."daily_chat_usage" enable row level security;


  create table "public"."memories" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "character" text not null,
    "message" jsonb not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "nsfw" boolean
      );


alter table "public"."memories" enable row level security;


  create table "public"."memories_backup" (
    "id" uuid,
    "user_id" text,
    "character" text,
    "message" jsonb,
    "created_at" timestamp with time zone,
    "nsfw" boolean
      );



  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "product_id" uuid not null,
    "stripe_checkout_id" text not null,
    "status" order_status not null default 'pending'::order_status,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );



  create table "public"."processed_events" (
    "event_id" text not null
      );



  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "price_cents" integer not null,
    "type" product_type not null,
    "stripe_price_id" text not null,
    "voice_credits" integer,
    "asset_url" text,
    "nsfw_only" boolean default false,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );



  create table "public"."profiles" (
    "id" uuid not null,
    "seed_index" integer default 0,
    "seed_mode" text default 'strict'::text,
    "experiments" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
      );


alter table "public"."profiles" enable row level security;


  create table "public"."seed_messages" (
    "message_index" integer not null,
    "content" text not null,
    "upsell_trigger" text
      );


alter table "public"."seed_messages" enable row level security;


  create table "public"."stripe_events" (
    "id" text not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."summaries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "character" text,
    "summary" text,
    "created_at" timestamp without time zone default timezone('utc'::text, now())
      );



  create table "public"."summaries_backup" (
    "id" uuid,
    "user_id" text,
    "character" text,
    "summary" text,
    "created_at" timestamp without time zone
      );



  create table "public"."tips" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "character_key" text not null,
    "amount_cents" integer not null,
    "display_name" text,
    "message" text,
    "stripe_payment_intent_id" text,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."tips" enable row level security;


  create table "public"."user_display_names" (
    "user_id" uuid not null,
    "display_name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."user_display_names" enable row level security;


  create table "public"."user_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_token" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "last_used_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."user_sessions" enable row level security;


  create table "public"."user_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stripe_subscription_id" text,
    "tier" text default 'unknown'::text,
    "started_at" timestamp with time zone default timezone('utc'::text, now()),
    "current_period_end" timestamp with time zone,
    "status" text default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "character_key" text not null default 'lexi'::text,
    "stripe_customer_id" text,
    "price_id" text,
    "email" text,
    "features" jsonb not null default '{}'::jsonb
      );



  create table "public"."voice_credit_ledger" (
    "id" uuid not null default gen_random_uuid(),
    "wallet_id" uuid not null,
    "delta" integer not null,
    "reason" text not null,
    "meta" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."voice_wallets" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stripe_customer_id" text,
    "character_key" text not null,
    "created_at" timestamp with time zone not null default now(),
    "email" text
      );


CREATE UNIQUE INDEX credits_grants_pkey ON public.credits_grants USING btree (id);

CREATE INDEX daily_chat_usage_character_date_idx ON public.daily_chat_usage USING btree (character_key, date DESC);

CREATE UNIQUE INDEX daily_chat_usage_pkey ON public.daily_chat_usage USING btree (id);

CREATE INDEX daily_chat_usage_user_date_idx ON public.daily_chat_usage USING btree (user_id, date DESC);

CREATE UNIQUE INDEX daily_chat_usage_user_id_character_key_date_key ON public.daily_chat_usage USING btree (user_id, character_key, date);

CREATE INDEX idx_memories_user_character ON public.memories USING btree (user_id, "character");

CREATE INDEX idx_memories_user_id ON public.memories USING btree (user_id);

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);

CREATE INDEX idx_products_type ON public.products USING btree (type);

CREATE INDEX idx_summaries_user_character ON public.summaries USING btree (user_id, "character");

CREATE INDEX idx_user_subscriptions_email ON public.user_subscriptions USING btree (email);

CREATE INDEX idx_user_subscriptions_features_gin ON public.user_subscriptions USING gin (features);

CREATE INDEX idx_user_subscriptions_user_character ON public.user_subscriptions USING btree (user_id, character_key);

CREATE INDEX idx_voice_wallets_user_character ON public.voice_wallets USING btree (user_id, character_key);

CREATE INDEX idx_wallet_scid ON public.voice_wallets USING btree (stripe_customer_id, character_key);

CREATE INDEX idx_wallet_user ON public.voice_wallets USING btree (user_id, character_key);

CREATE INDEX ix_user_subs_scid ON public.user_subscriptions USING btree (stripe_customer_id);

CREATE INDEX ix_user_subscriptions_stripe_customer ON public.user_subscriptions USING btree (stripe_customer_id);

CREATE INDEX ix_user_subscriptions_stripe_sub ON public.user_subscriptions USING btree (stripe_subscription_id);

CREATE INDEX ix_voice_credit_ledger_wallet ON public.voice_credit_ledger USING btree (wallet_id);

CREATE INDEX ix_voice_wallets_user_character ON public.voice_wallets USING btree (user_id, character_key);

CREATE UNIQUE INDEX memories_pkey ON public.memories USING btree (id);

CREATE INDEX memories_user_id_character_idx ON public.memories USING btree (user_id, "character");

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX processed_events_pkey ON public.processed_events USING btree (event_id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX seed_messages_pkey ON public.seed_messages USING btree (message_index);

CREATE UNIQUE INDEX stripe_events_pkey ON public.stripe_events USING btree (id);

CREATE UNIQUE INDEX summaries_pkey ON public.summaries USING btree (id);

CREATE INDEX tips_character_key_idx ON public.tips USING btree (character_key);

CREATE INDEX tips_created_at_idx ON public.tips USING btree (created_at DESC);

CREATE INDEX tips_monthly_leaderboard_idx ON public.tips USING btree (character_key, created_at DESC, status) WHERE (status = 'completed'::text);

CREATE UNIQUE INDEX tips_pkey ON public.tips USING btree (id);

CREATE INDEX tips_status_idx ON public.tips USING btree (status);

CREATE UNIQUE INDEX tips_stripe_payment_intent_id_key ON public.tips USING btree (stripe_payment_intent_id);

CREATE INDEX tips_user_id_idx ON public.tips USING btree (user_id);

CREATE UNIQUE INDEX uq_credits_grants_event_id ON public.credits_grants USING btree (event_id);

CREATE UNIQUE INDEX uq_email_tier_active_unclaimed ON public.user_subscriptions USING btree (email, tier) WHERE ((status = 'active'::text) AND (user_id IS NULL));

CREATE UNIQUE INDEX uq_user_character_tier_active ON public.user_subscriptions USING btree (user_id, character_key, tier) WHERE ((status = 'active'::text) AND (user_id IS NOT NULL));

CREATE UNIQUE INDEX uq_user_subscriptions_stripe_sub ON public.user_subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);

CREATE UNIQUE INDEX uq_voice_wallets_email_character ON public.voice_wallets USING btree (lower(email), character_key);

CREATE UNIQUE INDEX uq_voice_wallets_user_character ON public.voice_wallets USING btree (user_id, character_key);

CREATE UNIQUE INDEX user_display_names_pkey ON public.user_display_names USING btree (user_id);

CREATE INDEX user_sessions_expires_idx ON public.user_sessions USING btree (expires_at);

CREATE UNIQUE INDEX user_sessions_pkey ON public.user_sessions USING btree (id);

CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token);

CREATE INDEX user_sessions_token_idx ON public.user_sessions USING btree (session_token);

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions USING btree (user_id);

CREATE UNIQUE INDEX user_subs_unique_stripe_pending ON public.user_subscriptions USING btree (stripe_customer_id, character_key) WHERE (user_id IS NULL);

CREATE UNIQUE INDEX user_subscriptions_pkey ON public.user_subscriptions USING btree (id);

CREATE UNIQUE INDEX user_subscriptions_stripe_character_key ON public.user_subscriptions USING btree (stripe_customer_id, character_key);

CREATE UNIQUE INDEX user_subscriptions_stripe_subscription_key ON public.user_subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX user_subscriptions_user_character_key ON public.user_subscriptions USING btree (user_id, character_key);

CREATE UNIQUE INDEX ux_user_subs_subid ON public.user_subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX ux_user_subscriptions_user_character ON public.user_subscriptions USING btree (user_id, character_key);

CREATE UNIQUE INDEX ux_voice_wallets_customer_character ON public.voice_wallets USING btree (stripe_customer_id, character_key);

CREATE UNIQUE INDEX voice_credit_ledger_pkey ON public.voice_credit_ledger USING btree (id);

CREATE UNIQUE INDEX voice_wallets_pkey ON public.voice_wallets USING btree (id);

alter table "public"."credits_grants" add constraint "credits_grants_pkey" PRIMARY KEY using index "credits_grants_pkey";

alter table "public"."daily_chat_usage" add constraint "daily_chat_usage_pkey" PRIMARY KEY using index "daily_chat_usage_pkey";

alter table "public"."memories" add constraint "memories_pkey" PRIMARY KEY using index "memories_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."processed_events" add constraint "processed_events_pkey" PRIMARY KEY using index "processed_events_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."seed_messages" add constraint "seed_messages_pkey" PRIMARY KEY using index "seed_messages_pkey";

alter table "public"."stripe_events" add constraint "stripe_events_pkey" PRIMARY KEY using index "stripe_events_pkey";

alter table "public"."summaries" add constraint "summaries_pkey" PRIMARY KEY using index "summaries_pkey";

alter table "public"."tips" add constraint "tips_pkey" PRIMARY KEY using index "tips_pkey";

alter table "public"."user_display_names" add constraint "user_display_names_pkey" PRIMARY KEY using index "user_display_names_pkey";

alter table "public"."user_sessions" add constraint "user_sessions_pkey" PRIMARY KEY using index "user_sessions_pkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_pkey" PRIMARY KEY using index "user_subscriptions_pkey";

alter table "public"."voice_credit_ledger" add constraint "voice_credit_ledger_pkey" PRIMARY KEY using index "voice_credit_ledger_pkey";

alter table "public"."voice_wallets" add constraint "voice_wallets_pkey" PRIMARY KEY using index "voice_wallets_pkey";

alter table "public"."credits_grants" add constraint "credits_grants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."credits_grants" validate constraint "credits_grants_user_id_fkey";

alter table "public"."daily_chat_usage" add constraint "daily_chat_usage_user_id_character_key_date_key" UNIQUE using index "daily_chat_usage_user_id_character_key_date_key";

alter table "public"."memories" add constraint "memories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."memories" validate constraint "memories_user_id_fkey";

alter table "public"."orders" add constraint "orders_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) not valid;

alter table "public"."orders" validate constraint "orders_product_id_fkey";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."products" add constraint "products_price_cents_check" CHECK ((price_cents > 0)) not valid;

alter table "public"."products" validate constraint "products_price_cents_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."seed_messages" add constraint "seed_messages_upsell_trigger_check" CHECK ((upsell_trigger = ANY (ARRAY['LIMIT_REACHED'::text, 'LOCK_NSWF'::text, 'VOICE_OUT'::text]))) not valid;

alter table "public"."seed_messages" validate constraint "seed_messages_upsell_trigger_check";

alter table "public"."summaries" add constraint "summaries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."summaries" validate constraint "summaries_user_id_fkey";

alter table "public"."tips" add constraint "tips_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))) not valid;

alter table "public"."tips" validate constraint "tips_status_check";

alter table "public"."tips" add constraint "tips_stripe_payment_intent_id_key" UNIQUE using index "tips_stripe_payment_intent_id_key";

alter table "public"."tips" add constraint "tips_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tips" validate constraint "tips_user_id_fkey";

alter table "public"."user_display_names" add constraint "user_display_names_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_display_names" validate constraint "user_display_names_user_id_fkey";

alter table "public"."user_sessions" add constraint "user_sessions_session_token_key" UNIQUE using index "user_sessions_session_token_key";

alter table "public"."user_sessions" add constraint "user_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_sessions" validate constraint "user_sessions_user_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_stripe_character_key" UNIQUE using index "user_subscriptions_stripe_character_key";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_stripe_subscription_key" UNIQUE using index "user_subscriptions_stripe_subscription_key";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_user_character_key" UNIQUE using index "user_subscriptions_user_character_key";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_user_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_who_check" CHECK (((user_id IS NOT NULL) OR (stripe_customer_id IS NOT NULL))) not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_who_check";

alter table "public"."user_subscriptions" add constraint "valid_tier" CHECK ((tier = ANY (ARRAY['free'::text, 'sfw'::text, 'nsfw'::text]))) not valid;

alter table "public"."user_subscriptions" validate constraint "valid_tier";

alter table "public"."voice_credit_ledger" add constraint "voice_credit_ledger_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES voice_wallets(id) ON DELETE CASCADE not valid;

alter table "public"."voice_credit_ledger" validate constraint "voice_credit_ledger_wallet_id_fkey";

alter table "public"."voice_wallets" add constraint "uq_voice_wallets_user_character" UNIQUE using index "uq_voice_wallets_user_character";

alter table "public"."voice_wallets" add constraint "voice_wallets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."voice_wallets" validate constraint "voice_wallets_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._get_or_create_voice_wallet(p_user_id uuid, p_stripe_customer_id text, p_character_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet_id uuid;
BEGIN
  SELECT id INTO v_wallet_id
  FROM public.voice_wallets
  WHERE ( (p_user_id IS NOT NULL AND user_id = p_user_id)
          OR (p_user_id IS NULL AND stripe_customer_id = p_stripe_customer_id) )
    AND character_key = p_character_key
  LIMIT 1;

  IF v_wallet_id IS NOT NULL THEN
    RETURN v_wallet_id;
  END IF;

  INSERT INTO public.voice_wallets(user_id, stripe_customer_id, character_key)
  VALUES (p_user_id, p_stripe_customer_id, p_character_key)
  RETURNING id INTO v_wallet_id;

  RETURN v_wallet_id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.assign_experiments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  nsfw_price text;
begin
  -- Randomly choose between $30 and $35
  if random() < 0.5 then
    nsfw_price := '30';
  else
    nsfw_price := '35';
  end if;

  new.experiments := jsonb_build_object('nsfw_price', nsfw_price);
  return new;
end;
$function$
;

create or replace view "public"."authenticated_user_data" as  SELECT u.id AS user_id,
    u.email,
    p.experiments,
    p.seed_index,
    p.seed_mode,
    us.tier,
    us.status AS subscription_status,
    us.features,
    us.character_key,
    us.current_period_end,
    COALESCE(sum(vcl.delta), (0)::bigint) AS voice_credits
   FROM ((((auth.users u
     LEFT JOIN profiles p ON ((u.id = p.id)))
     LEFT JOIN user_subscriptions us ON ((u.id = us.user_id)))
     LEFT JOIN voice_wallets vw ON (((u.id = vw.user_id) AND (us.character_key = vw.character_key))))
     LEFT JOIN voice_credit_ledger vcl ON ((vw.id = vcl.wallet_id)))
  GROUP BY u.id, u.email, p.experiments, p.seed_index, p.seed_mode, us.tier, us.status, us.features, us.character_key, us.current_period_end;


CREATE OR REPLACE FUNCTION public.check_daily_chat_limit(p_user_id uuid, p_character_key text, p_daily_limit integer DEFAULT 5)
 RETURNS TABLE(can_chat boolean, current_count integer, limit_reached boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_usage integer := 0;
  user_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id 
    AND character_key = p_character_key
    AND status IN ('active', 'trialing')
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If user has paid tier, they can always chat
  IF user_tier IN ('sfw', 'nsfw') THEN
    RETURN QUERY SELECT true, 0, false;
    RETURN;
  END IF;
  
  -- For free users, check daily limit
  SELECT COALESCE(chat_count, 0) INTO current_usage
  FROM daily_chat_usage
  WHERE user_id = p_user_id 
    AND character_key = p_character_key
    AND date = CURRENT_DATE;
  
  RETURN QUERY SELECT 
    current_usage < p_daily_limit,
    current_usage,
    current_usage >= p_daily_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_email_entitlements(p_email text, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.user_subscriptions
     set user_id = p_user_id
   where email = p_email
     and user_id is null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_one_voice_credit(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
with picked as (
  select id
  from public.user_entitlements
  where user_id = p_user_id
    and coalesce(voice_credits_remaining,0) > 0
  order by unlocked_at asc
  limit 1
),
updated as (
  update public.user_entitlements ue
     set voice_credits_remaining = ue.voice_credits_remaining - 1
  from picked
  where ue.id = picked.id
  returning 1
)
select coalesce((
  select sum(coalesce(voice_credits_remaining,0))
  from public.user_entitlements
  where user_id = p_user_id
), 0);
$function$
;

CREATE OR REPLACE FUNCTION public.consume_one_voice_credit(p_user_id uuid, p_character_key text DEFAULT 'lexi'::text, p_stripe_customer_id text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet_id uuid;
  v_balance integer;
BEGIN
  -- Find or create wallet (prefer user_id; fall back to stripe_customer_id if provided)
  v_wallet_id := public._get_or_create_voice_wallet(
    p_user_id,
    p_stripe_customer_id,
    p_character_key
  );

  SELECT credits
    INTO v_balance
    FROM public.voice_credit_balance
   WHERE wallet_id = v_wallet_id;

  IF COALESCE(v_balance, 0) <= 0 THEN
    RETURN -1;
  END IF;

  INSERT INTO public.voice_credit_ledger(wallet_id, delta, reason, meta)
  VALUES (v_wallet_id, -1, 'tts_generation', '{}'::jsonb);

  -- Return new balance
  RETURN COALESCE(v_balance, 0) - 1;
END
$function$
;

CREATE OR REPLACE FUNCTION public.consume_one_voice_credit_v2(p_user_id uuid DEFAULT NULL::uuid, p_stripe_customer_id text DEFAULT NULL::text, p_character_key text DEFAULT 'lexi'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet uuid;
  v_balance int;
BEGIN
  -- locate wallet by user or scid
  if p_user_id is not null then
    select id into v_wallet from public.voice_wallets where user_id = p_user_id and character_key = p_character_key limit 1;
  end if;
  if v_wallet is null and p_stripe_customer_id is not null then
    select id into v_wallet from public.voice_wallets where stripe_customer_id = p_stripe_customer_id and character_key = p_character_key limit 1;
  end if;
  if v_wallet is null then return false; end if;

  select coalesce(sum(delta),0) into v_balance from public.voice_credit_ledger where wallet_id = v_wallet;
  if v_balance <= 0 then return false; end if;

  insert into public.voice_credit_ledger(wallet_id, delta, reason) values (v_wallet, -1, 'tts_play');
  return true;
END $function$
;

CREATE OR REPLACE FUNCTION public.consume_voice_credits(p_user_id uuid, p_character_key text, p_credits_needed integer, p_reason text DEFAULT 'voice_generation'::text)
 RETURNS TABLE(success boolean, wallet_id uuid, remaining_credits integer)
 LANGUAGE plpgsql
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
  
  -- Check if user has enough credits
  IF v_current_credits < p_credits_needed THEN
    RETURN QUERY SELECT false, v_wallet_id, v_current_credits;
    RETURN;
  END IF;
  
  -- Consume credits (negative delta)
  INSERT INTO voice_credit_ledger (wallet_id, delta, reason)
  VALUES (v_wallet_id, -p_credits_needed, p_reason);
  
  -- Return success with updated balance
  RETURN QUERY SELECT true, v_wallet_id, (v_current_credits - p_credits_needed);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_session(p_user_id uuid, p_session_token text, p_expires_hours integer DEFAULT 24)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Clean up expired sessions for this user
  DELETE FROM user_sessions 
  WHERE user_id = p_user_id 
    AND expires_at < NOW();
  
  -- Create new session
  INSERT INTO user_sessions (user_id, session_token, expires_at)
  VALUES (
    p_user_id, 
    p_session_token, 
    NOW() + INTERVAL '1 hour' * p_expires_hours
  )
  ON CONFLICT (session_token)
  DO UPDATE SET
    expires_at = NOW() + INTERVAL '1 hour' * p_expires_hours,
    last_used_at = NOW();
    
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(p_character_key text, p_year integer DEFAULT EXTRACT(year FROM now()), p_month integer DEFAULT EXTRACT(month FROM now()), p_limit integer DEFAULT 10)
 RETURNS TABLE(display_name text, total_amount_cents integer, tip_count integer, rank integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH monthly_tips AS (
    SELECT 
      COALESCE(udn.display_name, 'Anonymous') as display_name,
      SUM(t.amount_cents) as total_amount_cents,
      COUNT(*) as tip_count
    FROM tips t
    LEFT JOIN user_display_names udn ON t.user_id = udn.user_id
    WHERE 
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month
    GROUP BY t.user_id, udn.display_name
  )
  SELECT 
    mt.display_name,
    mt.total_amount_cents::integer,
    mt.tip_count::integer,
    ROW_NUMBER() OVER (ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC)::integer as rank
  FROM monthly_tips mt
  ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid, p_character_key text)
 RETURNS TABLE(tier text, status text, can_chat boolean, can_use_nsfw boolean, can_use_voice boolean, can_buy_credits boolean, daily_chat_count integer, daily_chat_limit integer, voice_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  subscription_tier text := 'free';
  subscription_status text := 'active';
  subscription_features jsonb := NULL;
  chat_usage integer := 0;
  credits_total integer := 0;
  v_wallet_id uuid;
  is_authenticated boolean := false;
BEGIN
  -- Check if user exists in auth.users (authenticated) or is anonymous
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO is_authenticated;
  
  -- Get user's subscription (only for authenticated users)
  IF is_authenticated THEN
    SELECT 
      COALESCE(us.tier, 'free'),
      COALESCE(us.status, 'active'),
      us.features
    INTO 
      subscription_tier,
      subscription_status,
      subscription_features
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id 
      AND us.character_key = p_character_key
      AND us.status IN ('active', 'trialing')
    ORDER BY us.updated_at DESC
    LIMIT 1;
    
    -- Ensure we have fallback values if no subscription found
    subscription_tier := COALESCE(subscription_tier, 'free');
    subscription_status := COALESCE(subscription_status, 'active');
  END IF;
  
  -- Get daily chat usage for free users (both authenticated and anonymous)
  IF subscription_tier = 'free' THEN
    SELECT COALESCE(dcu.chat_count, 0) INTO chat_usage
    FROM daily_chat_usage dcu
    WHERE dcu.user_id = p_user_id 
      AND dcu.character_key = p_character_key
      AND dcu.date = CURRENT_DATE;
    
    -- Ensure chat_usage is never null
    chat_usage := COALESCE(chat_usage, 0);
  END IF;
  
  -- Get voice credits (only for authenticated users with subscriptions)
  IF is_authenticated THEN
    SELECT vw.id INTO v_wallet_id
    FROM voice_wallets vw
    WHERE vw.user_id = p_user_id 
      AND vw.character_key = p_character_key;
      
    IF v_wallet_id IS NOT NULL THEN
      SELECT COALESCE(SUM(vcl.delta), 0) INTO credits_total
      FROM voice_credit_ledger vcl
      WHERE vcl.wallet_id = v_wallet_id;
    END IF;
  END IF;
  
  -- Ensure credits_total is never null
  credits_total := COALESCE(credits_total, 0);
  
  -- Return entitlements based on tier using individual variables instead of RECORD
  RETURN QUERY SELECT
    subscription_tier,
    subscription_status,
    -- Chat permissions - explicitly handle the boolean logic
    CASE 
      WHEN subscription_tier = 'free' THEN (COALESCE(chat_usage, 0) < 5)
      ELSE true
    END as can_chat,
    -- NSFW permissions (only for authenticated users with nsfw subscription)
    CASE
      WHEN is_authenticated AND subscription_tier = 'nsfw' THEN true
      ELSE false
    END as can_use_nsfw,
    -- Voice permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND subscription_tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_use_voice,
    -- Credit purchase permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND subscription_tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_buy_credits,
    -- Usage stats - ensure never null
    COALESCE(chat_usage, 0) as daily_chat_count,
    CASE
      WHEN subscription_tier = 'free' THEN 5
      ELSE 0  -- unlimited
    END as daily_chat_limit,
    COALESCE(credits_total, 0) as voice_credits;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(p_user_id uuid, p_character_key text, p_year integer DEFAULT EXTRACT(year FROM now()), p_month integer DEFAULT EXTRACT(month FROM now()))
 RETURNS TABLE(rank integer, total_amount_cents integer, tip_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH monthly_tips AS (
    SELECT 
      t.user_id,
      SUM(t.amount_cents) as total_amount_cents,
      COUNT(*) as tip_count
    FROM tips t
    WHERE 
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month
    GROUP BY t.user_id
  ),
  ranked_tips AS (
    SELECT 
      mt.*,
      ROW_NUMBER() OVER (ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC) as rank
    FROM monthly_tips mt
  )
  SELECT 
    rt.rank::integer,
    rt.total_amount_cents::integer,
    rt.tip_count::integer
  FROM ranked_tips rt
  WHERE rt.user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_voice_balance_v1(p_user_id uuid, p_stripe_customer_id text, p_character_key text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE((
    SELECT credits
    FROM public.voice_credit_balance vb
    JOIN public.voice_wallets w ON w.id = vb.wallet_id
    WHERE ( (p_user_id IS NOT NULL AND w.user_id = p_user_id)
            OR (p_user_id IS NULL AND w.stripe_customer_id = p_stripe_customer_id) )
      AND w.character_key = p_character_key
    LIMIT 1
  ), 0);
$function$
;

CREATE OR REPLACE FUNCTION public.grant_voice_credits(p_user_id uuid, p_character_key text, p_credits integer, p_reason text DEFAULT 'purchase'::text, p_meta jsonb DEFAULT '{}'::jsonb, p_stripe_customer_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet_id uuid;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;

  v_wallet_id := public._get_or_create_voice_wallet(
    p_user_id,
    p_stripe_customer_id,
    p_character_key
  );

  INSERT INTO public.voice_credit_ledger(wallet_id, delta, reason, meta)
  VALUES (v_wallet_id, p_credits, p_reason, p_meta);
END
$function$
;

CREATE OR REPLACE FUNCTION public.grant_voice_credits(p_user_id uuid, p_product_id uuid, p_tokens integer)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  insert into public.user_entitlements (user_id, product_id, voice_credits_remaining)
  values (p_user_id, p_product_id, greatest(p_tokens, 0))
  on conflict (user_id, product_id)
  do update set voice_credits_remaining =
    greatest(0, public.user_entitlements.voice_credits_remaining) + greatest(excluded.voice_credits_remaining, 0);
$function$
;

CREATE OR REPLACE FUNCTION public.grant_voice_credits_v2(p_user_id uuid, p_stripe_customer_id text, p_character_key text, p_credits integer, p_reason text DEFAULT 'purchase'::text, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wallet_id uuid;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;

  v_wallet_id := public._get_or_create_voice_wallet(p_user_id, p_stripe_customer_id, p_character_key);

  INSERT INTO public.voice_credit_ledger(wallet_id, delta, reason, meta)
  VALUES (v_wallet_id, p_credits, p_reason, p_meta);
END
$function$
;

CREATE OR REPLACE FUNCTION public.increment_daily_chat_count(p_user_id uuid, p_character_key text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO daily_chat_usage (user_id, character_key, date, chat_count, updated_at)
  VALUES (p_user_id, p_character_key, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, character_key, date)
  DO UPDATE SET 
    chat_count = daily_chat_usage.chat_count + 1,
    updated_at = NOW()
  RETURNING chat_count INTO new_count;
  
  RETURN new_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.keep_user_id_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if NEW.user_id is null and OLD.user_id is not null then
    NEW.user_id := OLD.user_id;
  end if;
  return NEW;
end $function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at := now(); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.update_display_name(p_display_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Validate display name (basic checks)
  IF LENGTH(TRIM(p_display_name)) = 0 OR LENGTH(p_display_name) > 50 THEN
    RETURN false;
  END IF;

  INSERT INTO user_display_names (user_id, display_name, updated_at)
  VALUES (current_user_id, TRIM(p_display_name), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    display_name = TRIM(p_display_name),
    updated_at = NOW();

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_session_token(p_session_token text)
 RETURNS TABLE(user_id uuid, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update last_used_at and return user info if valid
  RETURN QUERY
  UPDATE user_sessions 
  SET last_used_at = NOW()
  WHERE session_token = p_session_token 
    AND expires_at > NOW()
  RETURNING user_sessions.user_id, true;
  
  -- If no rows updated, session is invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false;
  END IF;
END;
$function$
;

create or replace view "public"."voice_credit_balance" as  SELECT w.id AS wallet_id,
    w.stripe_customer_id,
    w.user_id,
    w.character_key,
    COALESCE(sum(l.delta), (0)::bigint) AS credits
   FROM (voice_wallets w
     LEFT JOIN voice_credit_ledger l ON ((l.wallet_id = w.id)))
  GROUP BY w.id, w.stripe_customer_id, w.user_id, w.character_key;


grant delete on table "public"."credits_grants" to "anon";

grant insert on table "public"."credits_grants" to "anon";

grant references on table "public"."credits_grants" to "anon";

grant select on table "public"."credits_grants" to "anon";

grant trigger on table "public"."credits_grants" to "anon";

grant truncate on table "public"."credits_grants" to "anon";

grant update on table "public"."credits_grants" to "anon";

grant delete on table "public"."credits_grants" to "authenticated";

grant insert on table "public"."credits_grants" to "authenticated";

grant references on table "public"."credits_grants" to "authenticated";

grant select on table "public"."credits_grants" to "authenticated";

grant trigger on table "public"."credits_grants" to "authenticated";

grant truncate on table "public"."credits_grants" to "authenticated";

grant update on table "public"."credits_grants" to "authenticated";

grant delete on table "public"."credits_grants" to "service_role";

grant insert on table "public"."credits_grants" to "service_role";

grant references on table "public"."credits_grants" to "service_role";

grant select on table "public"."credits_grants" to "service_role";

grant trigger on table "public"."credits_grants" to "service_role";

grant truncate on table "public"."credits_grants" to "service_role";

grant update on table "public"."credits_grants" to "service_role";

grant delete on table "public"."daily_chat_usage" to "anon";

grant insert on table "public"."daily_chat_usage" to "anon";

grant references on table "public"."daily_chat_usage" to "anon";

grant select on table "public"."daily_chat_usage" to "anon";

grant trigger on table "public"."daily_chat_usage" to "anon";

grant truncate on table "public"."daily_chat_usage" to "anon";

grant update on table "public"."daily_chat_usage" to "anon";

grant delete on table "public"."daily_chat_usage" to "authenticated";

grant insert on table "public"."daily_chat_usage" to "authenticated";

grant references on table "public"."daily_chat_usage" to "authenticated";

grant select on table "public"."daily_chat_usage" to "authenticated";

grant trigger on table "public"."daily_chat_usage" to "authenticated";

grant truncate on table "public"."daily_chat_usage" to "authenticated";

grant update on table "public"."daily_chat_usage" to "authenticated";

grant delete on table "public"."daily_chat_usage" to "service_role";

grant insert on table "public"."daily_chat_usage" to "service_role";

grant references on table "public"."daily_chat_usage" to "service_role";

grant select on table "public"."daily_chat_usage" to "service_role";

grant trigger on table "public"."daily_chat_usage" to "service_role";

grant truncate on table "public"."daily_chat_usage" to "service_role";

grant update on table "public"."daily_chat_usage" to "service_role";

grant delete on table "public"."memories" to "anon";

grant insert on table "public"."memories" to "anon";

grant references on table "public"."memories" to "anon";

grant select on table "public"."memories" to "anon";

grant trigger on table "public"."memories" to "anon";

grant truncate on table "public"."memories" to "anon";

grant update on table "public"."memories" to "anon";

grant delete on table "public"."memories" to "authenticated";

grant insert on table "public"."memories" to "authenticated";

grant references on table "public"."memories" to "authenticated";

grant select on table "public"."memories" to "authenticated";

grant trigger on table "public"."memories" to "authenticated";

grant truncate on table "public"."memories" to "authenticated";

grant update on table "public"."memories" to "authenticated";

grant delete on table "public"."memories" to "service_role";

grant insert on table "public"."memories" to "service_role";

grant references on table "public"."memories" to "service_role";

grant select on table "public"."memories" to "service_role";

grant trigger on table "public"."memories" to "service_role";

grant truncate on table "public"."memories" to "service_role";

grant update on table "public"."memories" to "service_role";

grant delete on table "public"."memories_backup" to "anon";

grant insert on table "public"."memories_backup" to "anon";

grant references on table "public"."memories_backup" to "anon";

grant select on table "public"."memories_backup" to "anon";

grant trigger on table "public"."memories_backup" to "anon";

grant truncate on table "public"."memories_backup" to "anon";

grant update on table "public"."memories_backup" to "anon";

grant delete on table "public"."memories_backup" to "authenticated";

grant insert on table "public"."memories_backup" to "authenticated";

grant references on table "public"."memories_backup" to "authenticated";

grant select on table "public"."memories_backup" to "authenticated";

grant trigger on table "public"."memories_backup" to "authenticated";

grant truncate on table "public"."memories_backup" to "authenticated";

grant update on table "public"."memories_backup" to "authenticated";

grant delete on table "public"."memories_backup" to "service_role";

grant insert on table "public"."memories_backup" to "service_role";

grant references on table "public"."memories_backup" to "service_role";

grant select on table "public"."memories_backup" to "service_role";

grant trigger on table "public"."memories_backup" to "service_role";

grant truncate on table "public"."memories_backup" to "service_role";

grant update on table "public"."memories_backup" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."processed_events" to "anon";

grant insert on table "public"."processed_events" to "anon";

grant references on table "public"."processed_events" to "anon";

grant select on table "public"."processed_events" to "anon";

grant trigger on table "public"."processed_events" to "anon";

grant truncate on table "public"."processed_events" to "anon";

grant update on table "public"."processed_events" to "anon";

grant delete on table "public"."processed_events" to "authenticated";

grant insert on table "public"."processed_events" to "authenticated";

grant references on table "public"."processed_events" to "authenticated";

grant select on table "public"."processed_events" to "authenticated";

grant trigger on table "public"."processed_events" to "authenticated";

grant truncate on table "public"."processed_events" to "authenticated";

grant update on table "public"."processed_events" to "authenticated";

grant delete on table "public"."processed_events" to "service_role";

grant insert on table "public"."processed_events" to "service_role";

grant references on table "public"."processed_events" to "service_role";

grant select on table "public"."processed_events" to "service_role";

grant trigger on table "public"."processed_events" to "service_role";

grant truncate on table "public"."processed_events" to "service_role";

grant update on table "public"."processed_events" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."seed_messages" to "anon";

grant insert on table "public"."seed_messages" to "anon";

grant references on table "public"."seed_messages" to "anon";

grant select on table "public"."seed_messages" to "anon";

grant trigger on table "public"."seed_messages" to "anon";

grant truncate on table "public"."seed_messages" to "anon";

grant update on table "public"."seed_messages" to "anon";

grant delete on table "public"."seed_messages" to "authenticated";

grant insert on table "public"."seed_messages" to "authenticated";

grant references on table "public"."seed_messages" to "authenticated";

grant select on table "public"."seed_messages" to "authenticated";

grant trigger on table "public"."seed_messages" to "authenticated";

grant truncate on table "public"."seed_messages" to "authenticated";

grant update on table "public"."seed_messages" to "authenticated";

grant delete on table "public"."seed_messages" to "service_role";

grant insert on table "public"."seed_messages" to "service_role";

grant references on table "public"."seed_messages" to "service_role";

grant select on table "public"."seed_messages" to "service_role";

grant trigger on table "public"."seed_messages" to "service_role";

grant truncate on table "public"."seed_messages" to "service_role";

grant update on table "public"."seed_messages" to "service_role";

grant delete on table "public"."stripe_events" to "anon";

grant insert on table "public"."stripe_events" to "anon";

grant references on table "public"."stripe_events" to "anon";

grant select on table "public"."stripe_events" to "anon";

grant trigger on table "public"."stripe_events" to "anon";

grant truncate on table "public"."stripe_events" to "anon";

grant update on table "public"."stripe_events" to "anon";

grant delete on table "public"."stripe_events" to "authenticated";

grant insert on table "public"."stripe_events" to "authenticated";

grant references on table "public"."stripe_events" to "authenticated";

grant select on table "public"."stripe_events" to "authenticated";

grant trigger on table "public"."stripe_events" to "authenticated";

grant truncate on table "public"."stripe_events" to "authenticated";

grant update on table "public"."stripe_events" to "authenticated";

grant delete on table "public"."stripe_events" to "service_role";

grant insert on table "public"."stripe_events" to "service_role";

grant references on table "public"."stripe_events" to "service_role";

grant select on table "public"."stripe_events" to "service_role";

grant trigger on table "public"."stripe_events" to "service_role";

grant truncate on table "public"."stripe_events" to "service_role";

grant update on table "public"."stripe_events" to "service_role";

grant delete on table "public"."summaries" to "anon";

grant insert on table "public"."summaries" to "anon";

grant references on table "public"."summaries" to "anon";

grant select on table "public"."summaries" to "anon";

grant trigger on table "public"."summaries" to "anon";

grant truncate on table "public"."summaries" to "anon";

grant update on table "public"."summaries" to "anon";

grant delete on table "public"."summaries" to "authenticated";

grant insert on table "public"."summaries" to "authenticated";

grant references on table "public"."summaries" to "authenticated";

grant select on table "public"."summaries" to "authenticated";

grant trigger on table "public"."summaries" to "authenticated";

grant truncate on table "public"."summaries" to "authenticated";

grant update on table "public"."summaries" to "authenticated";

grant delete on table "public"."summaries" to "service_role";

grant insert on table "public"."summaries" to "service_role";

grant references on table "public"."summaries" to "service_role";

grant select on table "public"."summaries" to "service_role";

grant trigger on table "public"."summaries" to "service_role";

grant truncate on table "public"."summaries" to "service_role";

grant update on table "public"."summaries" to "service_role";

grant delete on table "public"."summaries_backup" to "anon";

grant insert on table "public"."summaries_backup" to "anon";

grant references on table "public"."summaries_backup" to "anon";

grant select on table "public"."summaries_backup" to "anon";

grant trigger on table "public"."summaries_backup" to "anon";

grant truncate on table "public"."summaries_backup" to "anon";

grant update on table "public"."summaries_backup" to "anon";

grant delete on table "public"."summaries_backup" to "authenticated";

grant insert on table "public"."summaries_backup" to "authenticated";

grant references on table "public"."summaries_backup" to "authenticated";

grant select on table "public"."summaries_backup" to "authenticated";

grant trigger on table "public"."summaries_backup" to "authenticated";

grant truncate on table "public"."summaries_backup" to "authenticated";

grant update on table "public"."summaries_backup" to "authenticated";

grant delete on table "public"."summaries_backup" to "service_role";

grant insert on table "public"."summaries_backup" to "service_role";

grant references on table "public"."summaries_backup" to "service_role";

grant select on table "public"."summaries_backup" to "service_role";

grant trigger on table "public"."summaries_backup" to "service_role";

grant truncate on table "public"."summaries_backup" to "service_role";

grant update on table "public"."summaries_backup" to "service_role";

grant delete on table "public"."tips" to "anon";

grant insert on table "public"."tips" to "anon";

grant references on table "public"."tips" to "anon";

grant select on table "public"."tips" to "anon";

grant trigger on table "public"."tips" to "anon";

grant truncate on table "public"."tips" to "anon";

grant update on table "public"."tips" to "anon";

grant delete on table "public"."tips" to "authenticated";

grant insert on table "public"."tips" to "authenticated";

grant references on table "public"."tips" to "authenticated";

grant select on table "public"."tips" to "authenticated";

grant trigger on table "public"."tips" to "authenticated";

grant truncate on table "public"."tips" to "authenticated";

grant update on table "public"."tips" to "authenticated";

grant delete on table "public"."tips" to "service_role";

grant insert on table "public"."tips" to "service_role";

grant references on table "public"."tips" to "service_role";

grant select on table "public"."tips" to "service_role";

grant trigger on table "public"."tips" to "service_role";

grant truncate on table "public"."tips" to "service_role";

grant update on table "public"."tips" to "service_role";

grant delete on table "public"."user_display_names" to "anon";

grant insert on table "public"."user_display_names" to "anon";

grant references on table "public"."user_display_names" to "anon";

grant select on table "public"."user_display_names" to "anon";

grant trigger on table "public"."user_display_names" to "anon";

grant truncate on table "public"."user_display_names" to "anon";

grant update on table "public"."user_display_names" to "anon";

grant delete on table "public"."user_display_names" to "authenticated";

grant insert on table "public"."user_display_names" to "authenticated";

grant references on table "public"."user_display_names" to "authenticated";

grant select on table "public"."user_display_names" to "authenticated";

grant trigger on table "public"."user_display_names" to "authenticated";

grant truncate on table "public"."user_display_names" to "authenticated";

grant update on table "public"."user_display_names" to "authenticated";

grant delete on table "public"."user_display_names" to "service_role";

grant insert on table "public"."user_display_names" to "service_role";

grant references on table "public"."user_display_names" to "service_role";

grant select on table "public"."user_display_names" to "service_role";

grant trigger on table "public"."user_display_names" to "service_role";

grant truncate on table "public"."user_display_names" to "service_role";

grant update on table "public"."user_display_names" to "service_role";

grant delete on table "public"."user_sessions" to "anon";

grant insert on table "public"."user_sessions" to "anon";

grant references on table "public"."user_sessions" to "anon";

grant select on table "public"."user_sessions" to "anon";

grant trigger on table "public"."user_sessions" to "anon";

grant truncate on table "public"."user_sessions" to "anon";

grant update on table "public"."user_sessions" to "anon";

grant delete on table "public"."user_sessions" to "authenticated";

grant insert on table "public"."user_sessions" to "authenticated";

grant references on table "public"."user_sessions" to "authenticated";

grant select on table "public"."user_sessions" to "authenticated";

grant trigger on table "public"."user_sessions" to "authenticated";

grant truncate on table "public"."user_sessions" to "authenticated";

grant update on table "public"."user_sessions" to "authenticated";

grant delete on table "public"."user_sessions" to "service_role";

grant insert on table "public"."user_sessions" to "service_role";

grant references on table "public"."user_sessions" to "service_role";

grant select on table "public"."user_sessions" to "service_role";

grant trigger on table "public"."user_sessions" to "service_role";

grant truncate on table "public"."user_sessions" to "service_role";

grant update on table "public"."user_sessions" to "service_role";

grant delete on table "public"."user_subscriptions" to "anon";

grant insert on table "public"."user_subscriptions" to "anon";

grant references on table "public"."user_subscriptions" to "anon";

grant select on table "public"."user_subscriptions" to "anon";

grant trigger on table "public"."user_subscriptions" to "anon";

grant truncate on table "public"."user_subscriptions" to "anon";

grant update on table "public"."user_subscriptions" to "anon";

grant delete on table "public"."user_subscriptions" to "authenticated";

grant insert on table "public"."user_subscriptions" to "authenticated";

grant references on table "public"."user_subscriptions" to "authenticated";

grant select on table "public"."user_subscriptions" to "authenticated";

grant trigger on table "public"."user_subscriptions" to "authenticated";

grant truncate on table "public"."user_subscriptions" to "authenticated";

grant update on table "public"."user_subscriptions" to "authenticated";

grant delete on table "public"."user_subscriptions" to "service_role";

grant insert on table "public"."user_subscriptions" to "service_role";

grant references on table "public"."user_subscriptions" to "service_role";

grant select on table "public"."user_subscriptions" to "service_role";

grant trigger on table "public"."user_subscriptions" to "service_role";

grant truncate on table "public"."user_subscriptions" to "service_role";

grant update on table "public"."user_subscriptions" to "service_role";

grant delete on table "public"."voice_credit_ledger" to "anon";

grant insert on table "public"."voice_credit_ledger" to "anon";

grant references on table "public"."voice_credit_ledger" to "anon";

grant select on table "public"."voice_credit_ledger" to "anon";

grant trigger on table "public"."voice_credit_ledger" to "anon";

grant truncate on table "public"."voice_credit_ledger" to "anon";

grant update on table "public"."voice_credit_ledger" to "anon";

grant delete on table "public"."voice_credit_ledger" to "authenticated";

grant insert on table "public"."voice_credit_ledger" to "authenticated";

grant references on table "public"."voice_credit_ledger" to "authenticated";

grant select on table "public"."voice_credit_ledger" to "authenticated";

grant trigger on table "public"."voice_credit_ledger" to "authenticated";

grant truncate on table "public"."voice_credit_ledger" to "authenticated";

grant update on table "public"."voice_credit_ledger" to "authenticated";

grant delete on table "public"."voice_credit_ledger" to "service_role";

grant insert on table "public"."voice_credit_ledger" to "service_role";

grant references on table "public"."voice_credit_ledger" to "service_role";

grant select on table "public"."voice_credit_ledger" to "service_role";

grant trigger on table "public"."voice_credit_ledger" to "service_role";

grant truncate on table "public"."voice_credit_ledger" to "service_role";

grant update on table "public"."voice_credit_ledger" to "service_role";

grant delete on table "public"."voice_wallets" to "anon";

grant insert on table "public"."voice_wallets" to "anon";

grant references on table "public"."voice_wallets" to "anon";

grant select on table "public"."voice_wallets" to "anon";

grant trigger on table "public"."voice_wallets" to "anon";

grant truncate on table "public"."voice_wallets" to "anon";

grant update on table "public"."voice_wallets" to "anon";

grant delete on table "public"."voice_wallets" to "authenticated";

grant insert on table "public"."voice_wallets" to "authenticated";

grant references on table "public"."voice_wallets" to "authenticated";

grant select on table "public"."voice_wallets" to "authenticated";

grant trigger on table "public"."voice_wallets" to "authenticated";

grant truncate on table "public"."voice_wallets" to "authenticated";

grant update on table "public"."voice_wallets" to "authenticated";

grant delete on table "public"."voice_wallets" to "service_role";

grant insert on table "public"."voice_wallets" to "service_role";

grant references on table "public"."voice_wallets" to "service_role";

grant select on table "public"."voice_wallets" to "service_role";

grant trigger on table "public"."voice_wallets" to "service_role";

grant truncate on table "public"."voice_wallets" to "service_role";

grant update on table "public"."voice_wallets" to "service_role";


  create policy "Service can manage chat usage"
  on "public"."daily_chat_usage"
  as permissive
  for all
  to public
using (true);



  create policy "user_can_delete_own_messages"
  on "public"."memories"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "user_can_insert_own_messages"
  on "public"."memories"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "user_can_update_own_messages"
  on "public"."memories"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "user_can_view_own_messages"
  on "public"."memories"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Read own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "seed_read_all"
  on "public"."seed_messages"
  as permissive
  for select
  to public
using (true);



  create policy "user_can_delete_own_summaries"
  on "public"."summaries"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "user_can_insert_own_summaries"
  on "public"."summaries"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "user_can_update_own_summaries"
  on "public"."summaries"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "user_can_view_own_summaries"
  on "public"."summaries"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can view completed tips for leaderboard"
  on "public"."tips"
  as permissive
  for select
  to public
using ((status = 'completed'::text));



  create policy "Service can update tip status"
  on "public"."tips"
  as permissive
  for update
  to public
using (true);



  create policy "Users can create own tips"
  on "public"."tips"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view own tips"
  on "public"."tips"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can manage own display name"
  on "public"."user_display_names"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Service can manage sessions"
  on "public"."user_sessions"
  as permissive
  for all
  to public
using (true);



  create policy "Users can view own sessions"
  on "public"."user_sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER assign_experiments_trigger BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION assign_experiments();

CREATE TRIGGER trg_keep_user_id BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION keep_user_id_on_update();

CREATE TRIGGER user_subscriptions_set_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();


