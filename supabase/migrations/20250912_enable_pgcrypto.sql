-- Enable pgcrypto extension
-- This provides cryptographic functions like gen_random_bytes() required by Supabase Auth

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify the extension is working by testing key functions
DO $$
BEGIN
    -- Test gen_random_bytes
    PERFORM gen_random_bytes(16);
    RAISE NOTICE 'gen_random_bytes() function is working';
    
    -- Test gen_random_uuid  
    PERFORM gen_random_uuid();
    RAISE NOTICE 'gen_random_uuid() function is working';
    
    -- Test digest function
    PERFORM digest('test', 'sha256');
    RAISE NOTICE 'digest() function is working';
    
    RAISE NOTICE 'pgcrypto extension successfully enabled and tested';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'pgcrypto extension test failed: %', SQLERRM;
END
$$;