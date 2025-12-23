# Premium Character Pricing Setup Guide

## 🎯 Overview
Dom and Nyx are now configured as premium characters with higher NSFW pricing.

## 💰 Pricing Structure

### Standard Characters
- **SFW**: $9.99/mo
- **NSFW**: $29.99/mo

### Premium Characters (Dom, Nyx)
- **SFW**: $9.99/mo (same as standard)
- **NSFW**: $34.99/mo (premium tier)

## 🔧 Stripe Setup Required

You need to create new Stripe price objects for the premium tier:

### 1. Create Premium NSFW Prices in Stripe Dashboard

**Dom Premium NSFW** ($34.99/mo):
- Product: "Dom NSFW Premium Subscription"
- Price: $34.99 USD
- Billing: Monthly recurring
- Copy the price ID (starts with `price_`)

**Nyx Premium NSFW** ($34.99/mo):
- Product: "Nyx NSFW Premium Subscription"  
- Price: $34.99 USD
- Billing: Monthly recurring
- Copy the price ID (starts with `price_`)

### 2. Set Environment Variables

Add these to your production environment:

```bash
# Premium Character Pricing
DOM_STRIPE_PRICE_NSFW_PREMIUM=price_xxxxxxxxxxxxxxxxxxxxx
NYX_STRIPE_PRICE_NSFW_PREMIUM=price_xxxxxxxxxxxxxxxxxxxxx
```

## 🚀 Launch Strategy Options

### Option A: Immediate Premium Launch
- Launch Dom/Nyx at $34.99/mo immediately
- Position as "Premium Characters" in UI

### Option B: Limited Time Launch Special  
- Launch at $34.99/mo with "Limited Time: First month $29.99"
- Creates urgency and rewards early adopters
- Automatically converts to $34.99/mo after first billing cycle

### Option C: Gradual Price Increase
- Start at $29.99/mo for first month
- Announce price increase to $34.99/mo for new subscribers after X date
- Grandfather existing subscribers at $29.99/mo

## 🎨 UI Enhancements (Optional)

Consider adding premium indicators:
- "Premium" badge on character selection
- "Exclusive Content" messaging
- "Advanced Roleplay" features highlight

## 📊 Revenue Impact

**Conservative Estimate** (assuming 50% of current demand):
- Standard: 100 users × $29.99 = $2,999/mo
- Premium: 50 users × $34.99 = $1,749.50/mo
- **Net gain**: +$874.50/mo (+17% revenue increase)

**Current Implementation Status**: ✅ Code Ready
**Next Steps**: 
1. Create Stripe prices
2. Set environment variables  
3. Deploy and test
4. Launch! 🚀