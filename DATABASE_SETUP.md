# Database Setup for Crypto Payment System

## Required Tables

The crypto payment system requires the following tables to be created in your Supabase database:

### 1. crypto_charges (Foundation Table)

```sql
CREATE TABLE public.crypto_charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coinbase_charge_id TEXT UNIQUE NOT NULL,
    coinbase_code TEXT UNIQUE NOT NULL,
    hosted_url TEXT NOT NULL,
    user_id UUID NOT NULL,
    character_key TEXT NOT NULL,
    tier_id TEXT NOT NULL,
    tier_name TEXT NOT NULL,
    usd_amount DECIMAL(10,2) NOT NULL,
    duration_days INTEGER,
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}' NOT NULL
);

-- Indexes
CREATE INDEX idx_crypto_charges_user_character ON public.crypto_charges(user_id, character_key);
CREATE INDEX idx_crypto_charges_status ON public.crypto_charges(status);
CREATE INDEX idx_crypto_charges_created_at ON public.crypto_charges(created_at DESC);

-- RLS
ALTER TABLE public.crypto_charges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own charges" ON public.crypto_charges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage charges" ON public.crypto_charges FOR ALL USING (auth.role() = 'service_role');
```

### 2. crypto_subscriptions

```sql
CREATE TABLE public.crypto_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_key TEXT NOT NULL,
    tier_id TEXT NOT NULL,
    tier_name TEXT NOT NULL,
    crypto_charge_id UUID REFERENCES public.crypto_charges(id),
    coinbase_charge_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    nsfw_enabled BOOLEAN DEFAULT false,
    voice_enabled BOOLEAN DEFAULT false,
    priority_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,

    UNIQUE(user_id, character_key, status) -- Only one active subscription per user/character
);

-- Indexes
CREATE INDEX idx_crypto_subscriptions_user_character ON public.crypto_subscriptions(user_id, character_key);
CREATE INDEX idx_crypto_subscriptions_expires_at ON public.crypto_subscriptions(expires_at);
CREATE INDEX idx_crypto_subscriptions_status ON public.crypto_subscriptions(status);

-- RLS
ALTER TABLE public.crypto_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscriptions" ON public.crypto_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage subscriptions" ON public.crypto_subscriptions FOR ALL USING (auth.role() = 'service_role');
```

### 3. user_voice_credits

```sql
CREATE TABLE public.user_voice_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_key TEXT NOT NULL,
    credits INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,

    UNIQUE(user_id, character_key),
    CHECK (credits >= 0)
);

-- Indexes
CREATE INDEX idx_user_voice_credits_user_character ON public.user_voice_credits(user_id, character_key);

-- RLS
ALTER TABLE public.user_voice_credits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own voice credits" ON public.user_voice_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage voice credits" ON public.user_voice_credits FOR ALL USING (auth.role() = 'service_role');
```

### 4. crypto_tips

```sql
CREATE TABLE public.crypto_tips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_key TEXT NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    crypto_charge_id UUID REFERENCES public.crypto_charges(id),
    coinbase_charge_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,

    CHECK (amount_usd > 0)
);

-- Indexes
CREATE INDEX idx_crypto_tips_user_character ON public.crypto_tips(user_id, character_key);
CREATE INDEX idx_crypto_tips_created_at ON public.crypto_tips(created_at DESC);

-- RLS
ALTER TABLE public.crypto_tips ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own tips" ON public.crypto_tips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage tips" ON public.crypto_tips FOR ALL USING (auth.role() = 'service_role');
```

### 5. Helper Function for Relationship Boosting

```sql
-- Function to boost relationship score when tips are received
CREATE OR REPLACE FUNCTION boost_relationship_score(
    user_id UUID,
    character_key TEXT,
    boost_amount DECIMAL
) RETURNS VOID AS $$
BEGIN
    -- Insert or update relationship score in user_facts table
    INSERT INTO public.user_facts (user_id, character_key, fact_type, fact_value, metadata, updated_at)
    VALUES (
        user_id,
        character_key,
        'relationship_score',
        COALESCE((
            SELECT (fact_value::decimal + boost_amount)::text
            FROM public.user_facts
            WHERE user_facts.user_id = boost_relationship_score.user_id
              AND user_facts.character_key = boost_relationship_score.character_key
              AND fact_type = 'relationship_score'
        ), boost_amount::text),
        jsonb_build_object('last_boosted_at', now(), 'boost_amount', boost_amount),
        now()
    )
    ON CONFLICT (user_id, character_key, fact_type)
    DO UPDATE SET
        fact_value = EXCLUDED.fact_value,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION boost_relationship_score(UUID, TEXT, DECIMAL) TO service_role;
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste each table creation script above
4. Run them in order (crypto_charges first, then the others)

### Option 2: Migration Files
The migration files are in `supabase/migrations/` directory:
- `20250918000000_crypto_subscriptions.sql`
- `20250918000001_crypto_voice_tips.sql`

Apply these using your preferred migration tool.

## Verification

After creating the tables, verify they exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('crypto_charges', 'crypto_subscriptions', 'user_voice_credits', 'crypto_tips');
```

You should see all 4 tables listed.

## Environment Variables

Make sure these are set:

```bash
COINBASE_COMMERCE_API_KEY=your-api-key
COINBASE_COMMERCE_WEBHOOK_SECRET=your-webhook-secret
```