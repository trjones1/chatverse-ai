# 🌍 Gumroad + Localization Strategy

## How It Works with Gumroad

### What Gumroad Does Automatically ✅
- Accepts payments in 135+ currencies
- Shows prices in user's local currency automatically
- Handles all currency conversion
- Supports international payment methods
- No additional setup needed!

### What You Control 🎯
- **Price points** (create regional products with PPP-adjusted prices)
- **Which product** users see based on their country
- **UI language** and messaging
- **Display prices** in local currency on YOUR site

## Implementation Strategy

### Option 1: Multiple Gumroad Products (Recommended for PPP Pricing)

Create separate Gumroad products for each region:

```
🇺🇸 US Product:
- Price: $9.99 USD
- Product ID: us-versecoin-premium
- Link: https://tramel.gumroad.com/l/us-versecoin-premium

🇲🇽 Mexico Product:
- Price: $4.50 USD (Gumroad shows as ~77 MXN)
- Product ID: mx-versecoin-premium
- Link: https://tramel.gumroad.com/l/mx-versecoin-premium

🇧🇷 Brazil Product:
- Price: $4.00 USD (Gumroad shows as ~R$20)
- Product ID: br-versecoin-premium
- Link: https://tramel.gumroad.com/l/br-versecoin-premium

🇦🇷 Argentina Product:
- Price: $2.50 USD (Gumroad shows as ~$875 ARS)
- Product ID: ar-versecoin-premium
- Link: https://tramel.gumroad.com/l/ar-versecoin-premium
```

**Pros**: True PPP pricing, maximum conversions
**Cons**: More products to manage

### Option 2: Single Product with Gumroad's Auto-Conversion

Use one product at full US price. Gumroad automatically shows it in user's local currency.

```
Single Product: $9.99 USD
- US user sees: $9.99
- Mexico user sees: ~MXN $170
- Brazil user sees: ~R$ 50
```

**Pros**: Simple, one product
**Cons**: No PPP adjustment - expensive for emerging markets

## Recommended Implementation

### 1. Update `lib/verseCoins.ts`

Add regional Gumroad URLs:

```typescript
export interface VerseCoinProduct {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  gumroad_product_id?: string;
  gumroad_url?: string;

  // Add regional pricing
  gumroad_urls?: {
    US: string;
    MX: string;
    BR: string;
    AR: string;
    CO: string;
    ES: string;
    default: string;
  };
}

export const VERSE_COIN_PRODUCTS: VerseCoinProduct[] = [
  {
    id: 'premium_pack',
    name: 'Premium Pack',
    credits: 250,
    price_usd: 9.99,
    gumroad_urls: {
      US: 'https://tramel.gumroad.com/l/us-premium',
      MX: 'https://tramel.gumroad.com/l/mx-premium',
      BR: 'https://tramel.gumroad.com/l/br-premium',
      AR: 'https://tramel.gumroad.com/l/ar-premium',
      CO: 'https://tramel.gumroad.com/l/co-premium',
      ES: 'https://tramel.gumroad.com/l/es-premium',
      default: 'https://tramel.gumroad.com/l/premium',
    },
  },
  // ... more products
];

// Helper function
export function getGumroadUrlForRegion(product: VerseCoinProduct, country: string): string {
  if (!product.gumroad_urls) {
    return product.gumroad_url || '#';
  }

  return product.gumroad_urls[country as keyof typeof product.gumroad_urls]
    || product.gumroad_urls.default;
}
```

### 2. Update `components/VerseCoinsModal.tsx`

```typescript
'use client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';
import { VERSE_COIN_PRODUCTS, getGumroadUrlForRegion } from '@/lib/verseCoins';

export default function VerseCoinsModal() {
  const { locale, convertPrice } = useLocalization();

  return (
    <div className="modal">
      <h2>{t('unlockPremium', locale.language)}</h2>

      {VERSE_COIN_PRODUCTS.map(product => {
        // Show estimated local price
        const localPrice = convertPrice(product.price_usd);

        // Get regional Gumroad URL
        const gumroadUrl = getGumroadUrlForRegion(product, locale.country);

        return (
          <div key={product.id} className="product-card">
            <h3>{product.name}</h3>

            {/* Show local price estimate */}
            <p className="price">
              {localPrice.formatted}
              {locale.country !== 'US' && (
                <span className="text-sm text-gray-500">
                  (~${product.price_usd} USD)
                </span>
              )}
            </p>

            {/* Link to Gumroad */}
            <a
              href={gumroadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              {t('buyNow', locale.language)}
            </a>

            <p className="text-sm text-gray-600">
              {t('voiceMessagesIncluded', locale.language)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

### 3. Create Regional Products in Gumroad

For each tier (Starter, Premium, Ultimate):

1. **Go to Gumroad Dashboard** → Products → New Product
2. **Set Price**:
   - US: Full price ($9.99)
   - MX: 45% of US ($4.50)
   - BR: 40% of US ($4.00)
   - AR: 25% of US ($2.50)
   - CO: 35% of US ($3.50)
   - ES: 85% of US ($8.50)

3. **Set Product Permalink**: Use country code
   - `us-premium-pack`
   - `mx-premium-pack`
   - `br-premium-pack`

4. **Add Product Description**: Mention it's regional pricing
   ```
   Premium Pack - Regional Pricing for [Country]

   - 250 VerseCoins
   - Unlimited voice messages
   - All character access

   Special regional pricing for [Country] users!
   ```

5. **Enable "Generate license keys"**: So users get redemption codes

6. **Copy Product URL**: Add to your `VERSE_COIN_PRODUCTS` config

## Pricing Recommendations

### Regional Price Points

Based on purchasing power parity:

| Country | Multiplier | $9.99 Product | $19.99 Product | $4.99 Product |
|---------|-----------|---------------|----------------|---------------|
| 🇺🇸 US | 100% | $9.99 | $19.99 | $4.99 |
| 🇲🇽 Mexico | 45% | $4.50 (~77 MXN) | $9.00 (~153 MXN) | $2.25 (~38 MXN) |
| 🇧🇷 Brazil | 40% | $4.00 (~20 BRL) | $8.00 (~40 BRL) | $2.00 (~10 BRL) |
| 🇦🇷 Argentina | 25% | $2.50 (~875 ARS) | $5.00 (~1750 ARS) | $1.25 (~440 ARS) |
| 🇨🇴 Colombia | 35% | $3.50 (~14k COP) | $7.00 (~28k COP) | $1.75 (~7k COP) |
| 🇪🇸 Spain | 85% | $8.50 (~7.8 EUR) | $17.00 (~15.6 EUR) | $4.25 (~3.9 EUR) |

### Testing Price Points

Start conservative and adjust based on data:

**Week 1-2**: Test with single country (Mexico)
- Create MX products at 45% discount
- Run FB ads to Mexico only
- Track conversion rate

**Week 3-4**: Expand if successful
- Add Brazil and Colombia products
- Compare conversion rates
- Adjust multipliers if needed

**Month 2+**: Full global rollout
- Add all regions
- A/B test different price points
- Optimize based on revenue per region

## User Flow

### 1. User Visits Site
- Geo API detects: Mexico (MX)
- LocalizationContext sets: Spanish, MXN

### 2. User Sees Pricing
- Modal shows: "$77 MXN (~$4.50 USD)"
- Language: Spanish
- CTA: "Comprar Ahora"

### 3. User Clicks Buy
- Redirected to: `https://tramel.gumroad.com/l/mx-premium-pack`
- Gumroad shows: $4.50 USD or ~77 MXN (user can choose)

### 4. After Purchase
- User gets: License key/redemption code
- They redeem on your site
- Credits added to account

## Preventing Abuse

### Geographic Restrictions

Add VPN detection to prevent US users from accessing discounted products:

```typescript
// In your API routes
export async function POST(request: NextRequest) {
  const country = detectCountryFromHeaders(request.headers);
  const product = await getProduct(productId);

  // Check if user is trying to redeem wrong regional product
  if (product.region && product.region !== country) {
    return NextResponse.json({
      error: 'This product is not available in your region',
    }, { status: 403 });
  }

  // Continue with redemption...
}
```

### Gumroad Built-in Protection

Gumroad has geographic restrictions you can enable:
1. Dashboard → Product → Settings
2. Enable "Only allow purchases from specific countries"
3. Select allowed countries for each regional product

## ROI Estimate

Your current metrics:
- 4,425 visitors/week
- ~1.9k from Facebook (m.facebook.com)
- 89% bounce rate

With regional pricing:

**Mexico Market** (largest Spanish-speaking):
- 500 monthly visitors (conservative)
- 2% conversion (vs 0.5% current)
- 10 paying customers
- @$4.50 average = **$45/month**

**Brazil Market** (huge potential):
- 300 monthly visitors
- 2% conversion
- 6 paying customers
- @$4.00 average = **$24/month**

**All LatAm Markets Combined**:
- 1,500 monthly visitors
- 2% conversion
- 30 paying customers
- @$3.50 average = **$105/month extra MRR**

**Conservative Year 1**: +$1,260 annual revenue
**Optimistic Year 1**: +$6,000 annual revenue (scale up)

## Quick Start Checklist

- [ ] Create 3 regional Gumroad products (US, MX, BR)
- [ ] Add regional URLs to `lib/verseCoins.ts`
- [ ] Update `VerseCoinsModal.tsx` to use localization
- [ ] Add `LocalizationProvider` to `app/layout.tsx`
- [ ] Test with VPN to Mexico
- [ ] Run FB ad campaign targeting Mexico
- [ ] Monitor conversion rates
- [ ] Expand to more countries if successful

## Summary

**Simple Start**:
1. Create Mexico product at $4.50
2. Show local price on your site
3. Link to regional Gumroad product
4. Translate UI to Spanish

**Full Implementation**:
1. Create products for all target countries
2. Use localization system for automatic detection
3. Show prices in local currency
4. Translate entire UI

Gumroad makes this easy - you just need regional products and smart routing!
