# 🚀 Stripe Product Migration Guide

This guide will help you migrate your 14 Stripe products from test mode to live mode automatically.

## ⚠️ Prerequisites

1. **Get your LIVE Stripe Secret Key**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Toggle to **Live mode** (top right)
   - Go to **Developers** → **API Keys**
   - Copy your **Secret key** (starts with `sk_live_...`)

2. **Install Stripe CLI** (if not already installed):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from https://stripe.com/docs/stripe-cli
   ```

## 🔧 Migration Steps

### Step 1: Set your Live Stripe Key
```bash
export STRIPE_SECRET_KEY="sk_live_YOUR_ACTUAL_KEY_HERE"
```

### Step 2: Install dependencies
```bash
npm install stripe
```

### Step 3: Run the migration
```bash
node scripts/migrate-stripe-products.js
```

## 📊 What the Script Does

The script will create **8 core products** in live mode:

### Subscription Products:
1. **✨ Premium SFW Chat** - $9.99/month
2. **🔥 Premium+ NSFW Chat** - $29.99/month  
3. **🦇 Nyx At Night Premium+ NSFW** - $34.99/month
4. **⛓️ Dominic's Bound Premium+ NSFW** - $34.99/month

### Voice Pack Products:
5. **🎙️ Voice Pack – 10 Credits** - $9.99
6. **🎙️ Voice Pack – 25 Credits** - $22.99
7. **🎙️ Voice Pack – 50 Credits** - $39.99
8. **🎙️ Voice Pack – 100 Credits** - $74.99

## 📝 After Migration

1. **Update Environment Variables**: The script will output the new price IDs. Add them to your `.env` file:
   ```bash
   # Example output:
   STRIPE_PRICE_VOICE_10=price_1XXX...
   STRIPE_PRICE_VOICE_25=price_1XXX...
   STRIPE_PRICE_VOICE_50=price_1XXX...
   STRIPE_PRICE_VOICE_100=price_1XXX...
   STRIPE_PRICE_SFW=price_1XXX...
   STRIPE_PRICE_NSFW=price_1XXX...
   NYX_STRIPE_PRICE_NSFW_PREMIUM=price_1XXX...
   DOM_STRIPE_PRICE_NSFW_PREMIUM=price_1XXX...
   ```

2. **Test Your Checkout**: Make sure all purchase flows work with the new live products

3. **Update Webhooks**: Ensure your Stripe webhooks are configured for live mode

## 🔍 Verification

After running the script:
1. Check your [Stripe Dashboard](https://dashboard.stripe.com) in **Live mode**
2. You should see all 8 products under **Products**
3. Each product should have the correct pricing and metadata

## 🚨 Important Notes

- **This creates NEW products** - it doesn't transfer existing customer data
- **Test thoroughly** before going live
- **Keep your test products** for development
- **Update all hardcoded price IDs** in your code

## 📞 Need Help?

If you encounter any issues:
1. Check the generated JSON report for details
2. Verify your Stripe API key is for live mode
3. Ensure you have the necessary Stripe permissions

## 🎯 Quick Test

After migration, test a purchase:
```bash
# Test voice pack purchase
curl -X POST https://yourdomain.com/api/checkout \
  -d "price_id=NEW_LIVE_PRICE_ID"
```

---

**Ready to migrate?** Run: `node scripts/migrate-stripe-products.js` 🚀