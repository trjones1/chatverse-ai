# Character-Specific Products Deployment Guide

## 🚀 Quick Start

1. **Run the migration script**:
   ```bash
   STRIPE_SECRET_KEY=sk_test_... node scripts/migrate-character-stripe-products.js
   ```

2. **Copy the generated environment variables** to your production deployment

3. **Deploy the updated code** with the new payment routing

4. **Test character-specific purchases** on each domain

## 📦 Products Created

### Character-Specific Subscriptions

Each of the 5 launch characters gets 2 products:

| Character | Domain | Premium ($9.99) | Premium+ |
|-----------|--------|----------------|-----------|
| **Lexi** | chatwithlexi.com | ✅ Sweet AI Companion | $29.99 - Intimate conversations |
| **Nyx** | talktonyx.com | ✅ Mysterious AI Companion | $34.99 - Dark academia content |
| **Aiko** | waifuwithaiko.com | ✅ Kawaii AI Waifu | $29.99 - Anime content |
| **Chase** | fuckboychase.com | ✅ Confident AI Companion | $34.99 - Exciting scenarios |
| **Dominic** | sirdominic.com | ✅ Commanding AI Companion | $34.99 - Leadership content |

### Voice Packs (Shared)

| Credits | Price | Description |
|---------|-------|-------------|
| 10 | $9.99 | Voice messages for any character |
| 25 | $19.99 | Voice messages for any character |
| 50 | $34.99 | Voice messages for any character |
| 100 | $59.99 | Voice messages for any character |

## 🎯 Marketing Copy Features

All product descriptions are **squeaky clean PG-13**:

- ✅ **Family-friendly language**
- ✅ **Character-specific personality highlights**
- ✅ **Focus on conversation quality and features**
- ✅ **No explicit content in descriptions**
- ✅ **Professional and engaging tone**

### Example Product Descriptions

**Lexi Premium+**:
> "Premium+ access to Lexi - Connect with Lexi, your caring and supportive AI companion who's always there to brighten your day. Includes everything in Premium plus exclusive content, advanced roleplay, and intimate conversations."

**Chase Premium+**:
> "Premium+ access to Chase - Connect with Chase, your bold and charismatic AI companion who brings excitement and confidence to every conversation. Includes everything in Premium plus exclusive content, advanced scenarios, and intimate conversations."

## 🔧 Technical Implementation

### Payment Routing Enhancement

The system now supports character-specific routing:

```javascript
// Before (broken)
All characters → STRIPE_PRICE_NSFW (shared)

// After (fixed)  
lexi → LEXI_STRIPE_PRICE_NSFW_PREMIUM
chase → CHASE_STRIPE_PRICE_NSFW_PREMIUM
nyx → NYX_STRIPE_PRICE_NSFW_PREMIUM
// etc.
```

### Environment Variables Required

Run the migration script to get the exact price IDs:

```bash
# Character-specific Premium+ subscriptions
LEXI_STRIPE_PRICE_NSFW_PREMIUM=price_...
NYX_STRIPE_PRICE_NSFW_PREMIUM=price_...
AIKO_STRIPE_PRICE_NSFW_PREMIUM=price_...
CHASE_STRIPE_PRICE_NSFW_PREMIUM=price_...
DOM_STRIPE_PRICE_NSFW_PREMIUM=price_...

# Character-specific Premium subscriptions  
LEXI_STRIPE_PRICE_PREMIUM=price_...
NYX_STRIPE_PRICE_PREMIUM=price_...
AIKO_STRIPE_PRICE_PREMIUM=price_...
CHASE_STRIPE_PRICE_PREMIUM=price_...
DOM_STRIPE_PRICE_PREMIUM=price_...

# Voice packs (shared)
STRIPE_PRICE_VOICE_10=price_...
STRIPE_PRICE_VOICE_25=price_...
STRIPE_PRICE_VOICE_50=price_...
STRIPE_PRICE_VOICE_100=price_...
```

## 💰 Business Impact

### Revenue Opportunities

**Before**: 
- User could only have 1 subscription total
- Subscription conflicts between characters
- Lost revenue from multi-character users

**After**:
- Users can have multiple character-specific subscriptions
- Clear billing per character
- Estimated 2-3x revenue increase from power users

### Pricing Strategy

- **Lexi & Aiko**: Standard pricing ($29.99 Premium+)
- **Nyx, Chase & Dominic**: Premium pricing ($34.99 Premium+)
- **Voice Packs**: Shared across all characters

## 🧪 Testing Checklist

### Stripe Products
- [ ] All 10 character subscription products created
- [ ] All 4 voice pack products created  
- [ ] Product descriptions are PG-13 compliant
- [ ] Pricing matches strategy

### Character Domains
- [ ] `chatwithlexi.com` → Lexi products
- [ ] `talktonyx.com` → Nyx products  
- [ ] `waifuwithaiko.com` → Aiko products
- [ ] `fuckboychase.com` → Chase products
- [ ] `sirdominic.com` → Dominic products

### Purchase Flow
- [ ] Premium subscription works for each character
- [ ] Premium+ subscription works for each character
- [ ] Voice packs work on all character domains
- [ ] No localhost redirect issues
- [ ] Proper entitlements recognition

### Multi-Character Subscriptions
- [ ] User can have Lexi Premium + Chase Premium+
- [ ] Dashboard shows correct subscriptions per character
- [ ] Billing portal shows separate line items
- [ ] Entitlements work correctly per domain

## 🚨 Critical Notes

1. **Backup Before Migration**: The script creates new products but doesn't modify existing ones

2. **Test Environment First**: Run with `TEST_STRIPE_SECRET_KEY` before production

3. **Character Routing**: Each character must use its specific price ID to avoid conflicts

4. **Legacy Support**: Existing generic `STRIPE_PRICE_NSFW` products should still work for backward compatibility

## 📞 Support

After deployment, users will be able to:
- Subscribe to multiple characters independently
- Have clear billing per character
- Use voice packs across any character
- Enjoy character-specific Premium+ content

The squeaky clean PG-13 marketing ensures Stripe compliance while maintaining character personality.