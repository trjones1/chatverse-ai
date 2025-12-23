# CRITICAL: Character-Specific Subscription Fix

## 🚨 Major Design Flaw Discovered

**Issue**: Chase Premium+ subscriptions were using the generic NSFW price ID, causing subscription conflicts and preventing proper character-specific entitlements.

## Root Cause Analysis

1. **Shared Price IDs**: Chase Premium+ was using `STRIPE_PRICE_NSFW` (same as Lexi)
2. **Missing Routing**: No character-specific routing for Chase in payment system
3. **Entitlements Confusion**: System couldn't differentiate which character the subscription was for
4. **Revenue Impact**: Users couldn't purchase multiple character-specific subscriptions

## Required Production Environment Variables

Add these environment variables to production deployment:

```bash
# Character-specific NSFW Premium price IDs
CHASE_STRIPE_PRICE_NSFW_PREMIUM=price_[actual_stripe_price_id]
SEGPAY_CHASE_NSFW_PRODUCT_ID=product_[actual_segpay_product_id]
```

## Stripe Product Setup Required

**Before deploying**, create these Stripe products:

1. **Chase Premium+ Monthly** 
   - Product name: "Chase Premium+ Monthly"
   - Price: $34.99/month (matches Dom/Nyx premium pricing)
   - Description: "Premium+ access for Chase character with NSFW content"

2. **Update Environment**:
   ```bash
   CHASE_STRIPE_PRICE_NSFW_PREMIUM=price_[new_chase_price_id]
   ```

## Fixed Architecture

### Before (Broken)
```
Chase Premium+ → STRIPE_PRICE_NSFW (generic)
Lexi NSFW → STRIPE_PRICE_NSFW (generic)
❌ Conflict: Same price ID for different characters
```

### After (Fixed)
```
Chase Premium+ → CHASE_STRIPE_PRICE_NSFW_PREMIUM (specific)
Lexi NSFW → STRIPE_PRICE_NSFW (generic)
Nyx Premium+ → NYX_STRIPE_PRICE_NSFW_PREMIUM (specific)
Dom Premium+ → DOM_STRIPE_PRICE_NSFW_PREMIUM (specific)
✅ Each character has unique price ID
```

## Code Changes Made

1. **Added Chase routing** in `lib/payment-routing.ts`:
   ```javascript
   nsfw_premium_chase: {
     processor: 'segpay',
     isNsfw: true,
     stripePrice: process.env.CHASE_STRIPE_PRICE_NSFW_PREMIUM,
     segpayProductId: process.env.SEGPAY_CHASE_NSFW_PRODUCT_ID,
   }
   ```

2. **Added character logic**:
   ```javascript
   if (characterKey === 'chase') {
     finalProductType = 'nsfw_premium_chase';
   }
   ```

## Business Impact

### Revenue Recovery
- **Before**: Users could only have 1 subscription total
- **After**: Users can have multiple character-specific subscriptions
- **Estimated Impact**: 2-3x subscription revenue from multi-character users

### User Experience
- **Before**: Subscription confusion across character domains
- **After**: Clear character-specific entitlements and billing

## Testing Requirements

1. **Create Chase-specific Stripe product**
2. **Deploy with new environment variables**
3. **Test purchase flow**: `fuckboychase.com` → Premium+ → unique price ID
4. **Verify entitlements**: Dashboard shows correct character-specific subscription
5. **Test multi-character**: User can have both Lexi SFW + Chase Premium+

## Deployment Checklist

- [ ] Create Chase Premium+ Stripe product ($34.99/month)
- [ ] Add `CHASE_STRIPE_PRICE_NSFW_PREMIUM` to production environment
- [ ] Add `SEGPAY_CHASE_NSFW_PRODUCT_ID` (when Segpay approved)
- [ ] Deploy code changes
- [ ] Test character-specific purchase flow
- [ ] Verify existing subscriptions still work
- [ ] Monitor subscription analytics for character breakdown

## Related Files Modified

- `lib/payment-routing.ts` - Added Chase character routing
- This fix also resolves localhost redirect issue in production

---

**Priority**: CRITICAL - Deploy immediately to prevent continued revenue loss and subscription conflicts.