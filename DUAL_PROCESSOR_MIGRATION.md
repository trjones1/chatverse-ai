# Dual Payment Processor Migration Guide

This guide outlines the implementation of a dual payment processor system that routes payments based on content type for optimal compliance and safety.

## 🎯 Strategic Overview

### Current State (Phase 1)
- **All payments** → Stripe with clean "Premium" branding  
- **NSFW content** → Hidden behind sanitization flags (`HIDE_NSFW_MARKETING=true`)
- **Goal**: Get Stripe approval while preserving functionality

### Target State (Phase 2) 
- **Safe content** → Stripe (voice packs, SFW subscriptions)
- **NSFW content** → Segpay (adult-friendly processor)
- **Auto-routing** → Based on product type and character
- **Fallback** → Emergency override capabilities

## 🚀 Implementation Architecture

### Core Files Created

1. **`lib/payment-routing.ts`** - Smart routing logic
   - Maps products to appropriate processors
   - Environment-based overrides
   - Character-specific NSFW handling

2. **`lib/payment-utils.ts`** - Helper functions
   - Checkout URL generation
   - Legacy compatibility layer
   - Debug and testing utilities

3. **Updated `lib/checkout.ts`** - Integrated routing
   - Backward compatible with existing components
   - Automatic processor selection
   - Graceful fallbacks

### Key Features

✅ **Automatic Content Routing**
```javascript
// Voice packs → Always Stripe (safe content)
// SFW subscriptions → Always Stripe  
// NSFW subscriptions → Segpay (when enabled)
```

✅ **Environment Controls**
```bash
# Force all transactions to one processor
PAYMENT_PROCESSOR_OVERRIDE=stripe

# Enable Segpay routing
NEXT_PUBLIC_SEGPAY_ENABLED=true
```

✅ **Character-Specific Logic**
```javascript
// Special handling for premium characters
// Nyx, Dominic → Dedicated NSFW products
// Others → General NSFW routing
```

## 📋 Migration Steps

### Step 1: Current Setup (Done ✅)
- [x] HIDE_NSFW_MARKETING flags active
- [x] Clean Stripe products migrated
- [x] All payments routing through Stripe

### Step 2: Apply to Segpay
```bash
# Business requirements
- 24-72 hour approval timeline
- Adult content specialization
- Better rates than CCBill
- Subscription billing focus
```

### Step 3: Configure Segpay (When Approved)
```bash
# Add to .env.local
SEGPAY_MERCHANT_ID=your_merchant_id
SEGPAY_NSFW_PRODUCT_ID=package_id_for_nsfw
SEGPAY_NYX_NSFW_PRODUCT_ID=package_id_for_nyx
SEGPAY_DOM_NSFW_PRODUCT_ID=package_id_for_dom
NEXT_PUBLIC_SEGPAY_ENABLED=true
```

### Step 4: Test Dual Routing
```javascript
// Use debug helper
import { debugRouting } from '@/lib/payment-utils';
debugRouting('nyx'); // Test all product routing for Nyx
```

### Step 5: Go Live
```bash
# Remove content sanitization gradually
HIDE_NSFW_MARKETING=false
NEXT_PUBLIC_HIDE_NSFW_MARKETING=false
```

## 🛠 Developer Guide

### Adding New Products
```javascript
// In lib/payment-routing.ts
export const PAYMENT_ROUTING = {
  new_product: {
    processor: 'segpay' as PaymentProcessor, // or 'stripe'
    isNsfw: true, // determines routing
    stripePrice: process.env.STRIPE_PRICE_NEW,
    segpayProductId: process.env.SEGPAY_NEW_PRODUCT_ID,
  }
};
```

### Using in Components
```javascript
import { createSmartCheckoutUrl } from '@/lib/payment-utils';

// Automatic routing based on product type
const checkout = createSmartCheckoutUrl({
  productType: 'nsfw_premium',
  characterKey: 'nyx',
  userId: user.id,
  successUrl: '/dashboard?success=true',
  cancelUrl: '/dashboard?cancelled=true'
});

// checkout.processor === 'segpay' (for NSFW)
// checkout.processor === 'stripe' (for voice packs)
```

### Emergency Overrides
```bash
# Route everything to Stripe (emergency)
PAYMENT_PROCESSOR_OVERRIDE=stripe

# Route everything to Segpay (testing)
PAYMENT_PROCESSOR_OVERRIDE=segpay
```

## 🔧 Testing & Debugging

### Local Testing
```bash
# Test routing decisions
npm run dev
# Open browser console
# Use debugRouting('character') function
```

### Production Monitoring
```javascript
// Check processor availability
import { getProcessorStatus } from '@/lib/payment-utils';
console.log(getProcessorStatus());
// { stripe: true, segpay: true, override: undefined }
```

## 🚨 Safety Features

### Automatic Fallbacks
- If Segpay fails → Route to Stripe with clean branding
- If routing fails → Default to SFW Stripe product
- If environment misconfigured → Safe defaults

### Compliance Protection  
- NSFW content automatically routes to adult-safe processor
- Clean content stays on mainstream processor
- Marketing sanitization based on environment flags

## 📊 Migration Timeline

| Phase | Status | Timeline | Action |
|-------|--------|----------|---------|
| 1 | ✅ Done | Complete | Stripe + clean branding active |
| 2 | 📋 Next | 1-2 weeks | Apply to Segpay, get approval |
| 3 | 🔄 Pending | 1 week | Configure Segpay, test routing |
| 4 | 🎯 Future | 2-4 weeks | Remove sanitization, go live |

## 🎉 Benefits

1. **Compliance Safety** - Each processor handles appropriate content
2. **Revenue Protection** - No single point of failure
3. **User Experience** - Seamless checkout regardless of content type
4. **Developer Friendly** - Backward compatible, easy to configure
5. **Future Proof** - Easy to add more processors or change routing

---

**Ready to proceed?** The dual processor system is implemented and ready for Segpay integration. Your current Stripe setup remains unchanged and will continue working during the transition.