# Gumroad Webhook Integration - Deployment Guide

## Overview
This integration eliminates the manual license key redemption flow by automatically crediting VerseCoins when users purchase through Gumroad. The webhook also handles purchases made before account creation.

## Features Implemented

### 1. Automatic Credit Application
- Webhook receives Gumroad "Ping" notifications instantly on purchase
- Auto-credits VerseCoins to matching user account
- Idempotency protection prevents double-crediting

### 2. Pre-Purchase Storage
- Stores purchases for users who buy before signing up
- Auto-claims credits when they create an account (email match)
- Manual claim page for mismatched emails

### 3. Conversion Optimization
- Instant modal popup when user hits voice paywall
- No more confusing error messages - direct path to purchase
- Seamless UX: buy → refresh → use voice

## Setup Instructions

### Step 1: Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Create pending purchases table
create table if not exists public.pending_gumroad_purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  gumroad_sale_id text not null unique,
  gumroad_product_id text not null,
  credits integer not null,
  currency text null,
  price_raw text null,
  license_key_partial text null,
  status text not null default 'pending', -- pending | claimed
  user_id uuid null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz null
);

create index if not exists pending_gumroad_purchases_email_idx
  on public.pending_gumroad_purchases (email);

create index if not exists pending_gumroad_purchases_status_idx
  on public.pending_gumroad_purchases (status);

create index if not exists pending_gumroad_purchases_user_id_idx
  on public.pending_gumroad_purchases (user_id);

-- Enable RLS
alter table public.pending_gumroad_purchases enable row level security;

-- Admin can view all
create policy "Admin can view all pending purchases"
  on public.pending_gumroad_purchases
  for select
  to authenticated
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email = 'lexi@chatverse.ai'  -- Replace with your admin email
    )
  );

-- Users can view their own
create policy "Users can view their own purchases"
  on public.pending_gumroad_purchases
  for select
  to authenticated
  using (user_id = auth.uid());
```

### Step 2: Environment Variables

Add to your `.env.local` and Vercel environment variables:

```bash
# Generate a random secret token
GUMROAD_PING_TOKEN=$(openssl rand -base64 32)

# Your Gumroad API access token (from Gumroad settings)
GUMROAD_ACCESS_TOKEN=your_gumroad_access_token_here
```

**To generate the ping token:**
```bash
openssl rand -base64 32
```

### Step 3: Configure Gumroad Webhook

1. Go to your Gumroad product settings
2. Find "Ping URL" or "Webhook URL" setting
3. Set to: `https://YOUR_DOMAIN.com/api/gumroad/ping?token=YOUR_PING_TOKEN`
   - Replace `YOUR_DOMAIN.com` with your actual domain (e.g., `chatwithlexi.com`)
   - Replace `YOUR_PING_TOKEN` with the value from `GUMROAD_PING_TOKEN`

**Example:**
```
https://chatwithlexi.com/api/gumroad/ping?token=abc123def456...
```

4. Save the webhook URL in Gumroad

### Step 4: Test the Integration

#### Test 1: Purchase with Existing Account
1. Sign up for an account with email: `test@example.com`
2. Make a test purchase on Gumroad using the same email
3. Gumroad sends webhook → Credits appear instantly
4. Check your VerseCoins balance - should be updated

#### Test 2: Purchase Before Signup
1. Make a test purchase on Gumroad with email: `newuser@example.com`
2. Don't create account yet
3. Webhook receives purchase → Stored in `pending_gumroad_purchases` table
4. Create account with `newuser@example.com`
5. Login callback auto-claims the purchase
6. Credits should appear in account

#### Test 3: Manual Claim (Mismatched Email)
1. Purchase with email: `purchase@example.com`
2. Sign up with different email: `account@example.com`
3. Visit: `https://YOUR_DOMAIN.com/claim-purchase`
4. Enter `purchase@example.com` in the form
5. Submit → Credits claimed to `account@example.com`

### Step 5: Verify Webhook Logs

Check your server logs for:

```
[Auth] ✅ Auto-claimed 1 pending Gumroad purchase(s) for user@example.com
```

Or check Supabase logs for webhook hits:
```sql
SELECT * FROM pending_gumroad_purchases
WHERE status = 'pending'
ORDER BY created_at DESC;
```

## User Experience Flow

### Before (Old Flow - Poor Conversion)
1. User hits voice limit
2. Sees error: "Insufficient credits"
3. Has to find purchase page
4. Buys on Gumroad
5. Receives license key email
6. Has to find redemption page
7. Pastes key
8. Finally gets credits

**Friction Points:** 8 steps, manual key pasting, confusing UX

### After (New Flow - High Conversion)
1. User hits voice limit
2. **Purchase modal opens instantly** 🚀
3. Clicks Gumroad button
4. Completes purchase
5. **Credits appear within seconds** (webhook fires)
6. Refresh page → voice works immediately

**Friction Points:** 1 step (refresh page)

## Conversion Improvements

1. **Instant Call-to-Action**: Modal opens immediately on paywall
2. **Zero Manual Steps**: No license key pasting required
3. **Pre-Purchase Support**: Users can buy before signing up
4. **Email Mismatch Recovery**: Manual claim page for edge cases

## Security Considerations

- **Token Authentication**: Webhook uses shared secret in query param
- **Idempotency**: Duplicate webhooks handled gracefully
- **Rate Limit Protection**: Supabase RLS policies restrict access
- **Email Validation**: Lowercase + trim to prevent case issues

## Troubleshooting

### Webhook Not Firing
1. Check Gumroad webhook URL is correct
2. Verify `GUMROAD_PING_TOKEN` matches in URL and env vars
3. Check server logs for incoming requests

### Credits Not Appearing
1. Check `pending_gumroad_purchases` table for the purchase
2. Verify user email matches purchase email (case-insensitive)
3. Check `versecoins_transactions` for transaction record

### Duplicate Credits
- This shouldn't happen due to idempotency checks
- If it does, check for duplicate `sale_id` in transactions

## Monitoring & Analytics

Track these metrics in your admin panel:

```sql
-- Pending purchases (users who bought but haven't signed up)
SELECT COUNT(*) FROM pending_gumroad_purchases WHERE status = 'pending';

-- Auto-claimed purchases (successful email matches)
SELECT COUNT(*) FROM pending_gumroad_purchases WHERE status = 'claimed' AND user_id IS NOT NULL;

-- Webhook response times
SELECT AVG(processing_time_ms) FROM webhook_logs WHERE endpoint = '/api/gumroad/ping';
```

## Next Steps

1. ✅ Deploy database migration
2. ✅ Set environment variables in Vercel
3. ✅ Configure Gumroad webhook URL
4. ✅ Test with small purchase
5. ✅ Monitor webhook logs for 24 hours
6. ✅ Announce new seamless purchase flow to users

---

**Questions?** Check `/app/api/gumroad/ping/route.ts` for implementation details.
