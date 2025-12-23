# 🚀 Crypto Payment System Setup Guide

## 🎯 Overview

This guide will help you set up the cryptocurrency payment system using Coinbase Commerce to start accepting Bitcoin, Ethereum, USDC, and other cryptocurrencies for your AI girlfriend subscriptions.

## 📋 Prerequisites

- [x] Coinbase account
- [x] Active project with existing Stripe integration
- [x] Supabase database access

## 🔧 Step 1: Coinbase Commerce Setup

### 1. Create Coinbase Commerce Account

1. Go to [commerce.coinbase.com](https://commerce.coinbase.com)
2. Sign up or log in with your Coinbase account
3. Complete business verification (may take 1-2 days)

### 2. Get API Credentials

1. In Coinbase Commerce dashboard → Settings → API Keys
2. Create a new API key
3. Save the **API Key** (starts with `your-api-key-here`)
4. Note your **Webhook Secret** for later

### 3. Configure Webhooks

1. In Settings → Webhook subscriptions
2. Add endpoint: `https://yourdomain.com/api/crypto/webhook`
3. Select these events:
   - `charge:confirmed`
   - `charge:failed`
   - `charge:delayed`
   - `charge:pending`
   - `charge:resolved`

## 🔧 Step 2: Environment Variables

Add these to your `.env.local` file:

```bash
# Coinbase Commerce Configuration
COINBASE_COMMERCE_API_KEY=your-api-key-here
COINBASE_COMMERCE_WEBHOOK_SECRET=your-webhook-secret-here

# Your site URL (for redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## 🗄️ Step 3: Database Migration

Run the crypto subscription migration:

```bash
# Apply the crypto tables migration
npx supabase migration up --file 20250918000000_crypto_subscriptions.sql
```

This creates:
- `crypto_charges` table (tracks payments)
- `crypto_subscriptions` table (tracks active subscriptions)
- Helper functions for subscription management

## 🧪 Step 4: Testing

### 1. Test Mode Setup

Coinbase Commerce uses the same API for test and live transactions. Test with small amounts first.

### 2. Test Crypto Payment Flow

1. Start your development server: `npm run dev`
2. Navigate to your character chat
3. Click the crypto payment button
4. Complete a test transaction with a small amount
5. Verify webhook processing in logs

### 3. Check Database

Verify the payment was processed:

```sql
-- Check crypto charges
SELECT * FROM crypto_charges ORDER BY created_at DESC LIMIT 5;

-- Check active subscriptions
SELECT * FROM crypto_subscriptions WHERE status = 'active';

-- Test subscription check function
SELECT * FROM check_crypto_subscription('user-id-here', 'character-key');
```

## 🚦 Step 5: Go Live

### 1. Production Environment Variables

Update your production environment with:
- Production Coinbase Commerce API key
- Production webhook URL
- Production site URL

### 2. Domain Whitelist

In Coinbase Commerce Settings → Domain whitelist:
- Add your production domain
- Test the webhook endpoint

### 3. Monitor Webhooks

Check webhook delivery in Coinbase Commerce dashboard:
- Settings → Webhook subscriptions → View logs

## 💰 Pricing Configuration

The crypto pricing is configured in `lib/cryptoPricing.ts`:

```typescript
// Current crypto pricing (29% discount from card prices)
Basic Crypto Pass: $7.99 (vs $9.99 card)
Premium Crypto Pass: $24.99 (vs $34.99 card)
```

To modify pricing:
1. Edit `CRYPTO_PRICING_TIERS` in `lib/cryptoPricing.ts`
2. Update any hardcoded prices in components
3. Test checkout flow with new prices

## 🔍 Monitoring & Analytics

### Key Metrics to Track

1. **Conversion Rate**: Crypto vs Card payments
2. **Revenue**: Track crypto revenue separately
3. **User Behavior**: Which users prefer crypto
4. **Geographic**: Where crypto payments come from

### Database Queries

```sql
-- Crypto revenue by month
SELECT
  DATE_TRUNC('month', confirmed_at) as month,
  COUNT(*) as payments,
  SUM(usd_amount) as revenue
FROM crypto_charges
WHERE status = 'confirmed'
GROUP BY month
ORDER BY month DESC;

-- Active crypto subscribers
SELECT
  character_key,
  COUNT(*) as active_subs,
  AVG(EXTRACT(days FROM (expires_at - started_at))) as avg_duration
FROM crypto_subscriptions
WHERE status = 'active'
GROUP BY character_key;
```

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not firing**
   - Check webhook URL is publicly accessible
   - Verify webhook secret matches environment variable
   - Check Coinbase Commerce webhook logs

2. **Payment not creating subscription**
   - Check webhook handler logs
   - Verify charge ID matches database record
   - Check subscription creation logic

3. **Subscription not recognized**
   - Verify `check_crypto_subscription` function
   - Check subscription expiry logic
   - Test with database queries

### Debug Commands

```bash
# Check webhook endpoint
curl -X POST https://yourdomain.com/api/crypto/webhook

# Test subscription check
curl "https://yourdomain.com/api/crypto/subscription-status?userId=USER_ID&characterKey=CHARACTER"

# Monitor logs
tail -f logs/crypto-payments.log
```

## 📞 Support

If you encounter issues:

1. Check Coinbase Commerce documentation
2. Review webhook delivery logs
3. Check server logs for error details
4. Test with small amounts first

## 🎉 Success Metrics

Once setup is complete, you should see:

- ✅ Crypto payment button appears in UI
- ✅ Users can complete crypto purchases
- ✅ Webhooks process successfully
- ✅ Subscriptions activate automatically
- ✅ Revenue tracking works

**Ready to start selling virtual cooch for crypto! 🚀💰**