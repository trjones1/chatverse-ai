-- Migration: Add tables for crypto voice packs and tips
-- Created: 2025-09-18

-- User voice credits table
CREATE TABLE IF NOT EXISTS public.user_voice_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_key TEXT NOT NULL,
    credits INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,

    -- Constraints
    UNIQUE(user_id, character_key),
    CHECK (credits >= 0)
);

-- Crypto tips table
CREATE TABLE IF NOT EXISTS public.crypto_tips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_key TEXT NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    crypto_charge_id UUID REFERENCES public.crypto_charges(id),
    coinbase_charge_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,

    -- Constraints
    CHECK (amount_usd > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_voice_credits_user_character
    ON public.user_voice_credits(user_id, character_key);

CREATE INDEX IF NOT EXISTS idx_crypto_tips_user_character
    ON public.crypto_tips(user_id, character_key);

CREATE INDEX IF NOT EXISTS idx_crypto_tips_created_at
    ON public.crypto_tips(created_at DESC);

-- RLS policies for security
ALTER TABLE public.user_voice_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_tips ENABLE ROW LEVEL SECURITY;

-- Voice credits policies
CREATE POLICY "Users can view their own voice credits"
    ON public.user_voice_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage voice credits"
    ON public.user_voice_credits FOR ALL
    USING (auth.role() = 'service_role');

-- Tips policies
CREATE POLICY "Users can view their own tips"
    ON public.crypto_tips FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage tips"
    ON public.crypto_tips FOR ALL
    USING (auth.role() = 'service_role');

-- Helper function to boost relationship score
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION boost_relationship_score(UUID, TEXT, DECIMAL) TO service_role;