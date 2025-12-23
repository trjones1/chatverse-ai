-- VerseCoins Virtual Currency System
-- Created: 2025-09-19

-- VerseCoins products catalog
CREATE TABLE IF NOT EXISTS public.versecoins_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    gumroad_product_id TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CHECK (credits > 0),
    CHECK (price_usd > 0)
);

-- Redemption codes for VerseCoins
CREATE TABLE IF NOT EXISTS public.versecoins_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL REFERENCES public.versecoins_products(id),
    credits INTEGER NOT NULL,
    status TEXT DEFAULT 'available' NOT NULL,

    -- Gumroad integration
    gumroad_order_id TEXT,
    purchaser_email TEXT,

    -- Redemption tracking
    redeemed_by_user_id UUID,
    redeemed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    sold_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,

    -- Metadata for additional info
    metadata JSONB DEFAULT '{}' NOT NULL,

    -- Constraints
    CHECK (status IN ('available', 'sold', 'redeemed', 'refunded')),
    CHECK (credits > 0),
    CHECK (
        CASE
            WHEN status = 'redeemed' THEN redeemed_by_user_id IS NOT NULL AND redeemed_at IS NOT NULL
            ELSE true
        END
    )
);

-- User VerseCoins balances
CREATE TABLE IF NOT EXISTS public.user_versecoins (
    user_id UUID PRIMARY KEY,
    credits INTEGER DEFAULT 0 NOT NULL,
    total_earned INTEGER DEFAULT 0 NOT NULL,  -- Lifetime credits earned
    total_spent INTEGER DEFAULT 0 NOT NULL,   -- Lifetime credits spent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    CHECK (credits >= 0),
    CHECK (total_earned >= 0),
    CHECK (total_spent >= 0)
);

-- VerseCoins transaction history
CREATE TABLE IF NOT EXISTS public.versecoins_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,

    -- Reference to what caused this transaction
    reference_type TEXT,  -- 'redemption', 'purchase', 'refund', 'admin'
    reference_id TEXT,    -- code ID, order ID, etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,

    CHECK (type IN ('credit', 'debit')),
    CHECK (amount > 0),
    CHECK (balance_after >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_versecoins_codes_status
    ON public.versecoins_codes(status);

CREATE INDEX IF NOT EXISTS idx_versecoins_codes_gumroad_order
    ON public.versecoins_codes(gumroad_order_id);

CREATE INDEX IF NOT EXISTS idx_versecoins_codes_user_redeemed
    ON public.versecoins_codes(redeemed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_versecoins_transactions_user_created
    ON public.versecoins_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_versecoins_transactions_reference
    ON public.versecoins_transactions(reference_type, reference_id);

-- RLS policies for security
ALTER TABLE public.versecoins_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versecoins_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_versecoins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versecoins_transactions ENABLE ROW LEVEL SECURITY;

-- Products are publicly readable
CREATE POLICY "Products are publicly readable"
    ON public.versecoins_products FOR SELECT
    USING (active = true);

-- Codes policies - very restrictive
CREATE POLICY "Service role can manage codes"
    ON public.versecoins_codes FOR ALL
    USING (auth.role() = 'service_role');

-- Users can only see their own VerseCoins data
CREATE POLICY "Users can view their own versecoins"
    ON public.user_versecoins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user versecoins"
    ON public.user_versecoins FOR ALL
    USING (auth.role() = 'service_role');

-- Users can view their own transaction history
CREATE POLICY "Users can view their own transactions"
    ON public.versecoins_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
    ON public.versecoins_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- Insert initial products (updated to match Gumroad listings)
INSERT INTO public.versecoins_products (id, name, credits, price_usd) VALUES
    ('starter_pack', 'VerseCoins – Starter Pack (500)', 500, 4.99),
    ('explorer_pack', 'VerseCoins – Explorer Pack (1,000)', 1000, 9.99),
    ('adventurer_pack', 'VerseCoins – Adventurer Pack (2,500)', 2500, 24.99),
    ('founder_pack', 'VerseCoins – Founder''s Pack (5,000)', 5000, 49.99)
ON CONFLICT (id) DO NOTHING;