-- Multi-Character Authentication System
-- Allows single email to access multiple characters with separate subscriptions

-- Create table to track which characters a user has access to
CREATE TABLE IF NOT EXISTS public.user_character_access (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_key text NOT NULL,
    
    -- Access metadata
    granted_at timestamp with time zone DEFAULT now(),
    granted_by text DEFAULT 'system'::text,
    
    -- Subscription status for this character
    subscription_tier text DEFAULT 'free'::text,
    subscription_status text DEFAULT 'active'::text,
    stripe_customer_id text, -- Separate customer ID per character
    stripe_subscription_id text,
    
    -- Character-specific settings
    settings jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure user can only have one access record per character
    UNIQUE(user_id, character_key)
);

-- Enable RLS
ALTER TABLE public.user_character_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own character access"
    ON public.user_character_access FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own character access settings"
    ON public.user_character_access FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to user_character_access"
    ON public.user_character_access FOR ALL
    TO service_role
    USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_character_access_user_id ON public.user_character_access(user_id);
CREATE INDEX idx_user_character_access_character_key ON public.user_character_access(character_key);
CREATE INDEX idx_user_character_access_stripe_customer ON public.user_character_access(stripe_customer_id);

-- Create function to grant character access
CREATE OR REPLACE FUNCTION public.grant_character_access(
    p_user_id uuid,
    p_character_key text,
    p_subscription_tier text DEFAULT 'free'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_access_id uuid;
BEGIN
    -- Insert or update character access
    INSERT INTO public.user_character_access (
        user_id, 
        character_key, 
        subscription_tier,
        granted_at
    )
    VALUES (p_user_id, p_character_key, p_subscription_tier, now())
    ON CONFLICT (user_id, character_key)
    DO UPDATE SET 
        subscription_tier = EXCLUDED.subscription_tier,
        updated_at = now()
    RETURNING id INTO v_access_id;
    
    RETURN v_access_id;
END;
$$;

-- Create function to get user's accessible characters
CREATE OR REPLACE FUNCTION public.get_user_characters(p_user_id uuid)
RETURNS TABLE(
    character_key text,
    subscription_tier text,
    subscription_status text,
    settings jsonb,
    granted_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uca.character_key,
        uca.subscription_tier,
        uca.subscription_status,
        uca.settings,
        uca.granted_at
    FROM public.user_character_access uca
    WHERE uca.user_id = p_user_id
        AND uca.subscription_status = 'active'
    ORDER BY uca.granted_at ASC;
END;
$$;

-- Create function to check character access
CREATE OR REPLACE FUNCTION public.has_character_access(
    p_user_id uuid,
    p_character_key text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_character_access 
        WHERE user_id = p_user_id 
            AND character_key = p_character_key
            AND subscription_status = 'active'
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$;

-- Update trigger for updated_at
CREATE TRIGGER update_user_character_access_updated_at
    BEFORE UPDATE ON public.user_character_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_character_access TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_character_access TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_characters TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_character_access TO authenticated;

-- Comment the table
COMMENT ON TABLE public.user_character_access IS 'Tracks which characters each user has access to, with separate subscription status per character';
COMMENT ON FUNCTION public.grant_character_access IS 'Grants or updates character access for a user';
COMMENT ON FUNCTION public.get_user_characters IS 'Returns all characters a user has access to';
COMMENT ON FUNCTION public.has_character_access IS 'Checks if user has access to specific character';