# SQL Ambiguity Fix - "wallet_id is ambiguous" Error

## Problem
The `get_user_entitlements` function was failing with error:
```
column reference "wallet_id" is ambiguous
```

## Root Cause
The function declared a variable named `wallet_id` but this conflicts with a database column of the same name in joined tables, causing PostgreSQL to be unable to determine which reference to use.

## Solution Applied
Following Supabase's recommendation, renamed the variable from `wallet_id` to `v_wallet_id` to eliminate ambiguity:

```sql
-- Before (causing ambiguity)
DECLARE
  wallet_id uuid;
  
-- After (fixed)  
DECLARE
  v_wallet_id uuid;  -- Prefixed with 'v_' to avoid column name conflicts
```

## Files Updated
- `DEPLOY_DB_FIXES.md` - Updated with correct SQL
- `deploy-entitlements-fix.sql` - Clean deployment script  
- `fix-entitlements-function.sql` - Working version with fix

## Next Steps
Run the SQL from `DEPLOY_DB_FIXES.md` in your Supabase dashboard to deploy this fix.

## Expected Results After Deploy
✅ Entitlements API returns 200 instead of 500  
✅ Daily chat counts show properly (e.g., "3/5" instead of "null/5")  
✅ Voice credit calculations work correctly  
✅ No more "ambiguous column reference" errors