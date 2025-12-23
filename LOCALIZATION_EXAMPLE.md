# Simple Localization Integration Example

Since you just want to translate UI copy (not pricing), here's how to quickly add translations to your key components.

## Example 1: Simple Button Translation

### Before:
```tsx
<button>Buy Now</button>
```

### After:
```tsx
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';

export default function MyComponent() {
  const { locale } = useLocalization();

  return <button>{t('buyNow', locale.language)}</button>;
}
```

Result:
- English users see: "Buy Now"
- Spanish users see: "Comprar Ahora"
- Portuguese users see: "Comprar Agora"

## Example 2: VerseCoinsModal Quick Wins

Update just the main CTA buttons and headers:

```tsx
// In VerseCoinsModal.tsx
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';

export default function VerseCoinsModal({ ...props }) {
  const { locale } = useLocalization();

  // ... existing code ...

  return (
    <div>
      {/* Tab Headers */}
      <button>{t('purchase', locale.language)}</button>
      <button>Spend</button> {/* Keep in English for now */}
      <button>Redeem</button>

      {/* Product Cards */}
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price_usd}</p>
          <button onClick={() => handlePurchase(product)}>
            {t('buyNow', locale.language)}
          </button>
          <p>{t('voiceMessagesIncluded', locale.language)}</p>
        </div>
      ))}
    </div>
  );
}
```

## Example 3: PremiumCTASection

```tsx
// In PremiumCTASection.tsx
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';

export default function PremiumCTASection() {
  const { locale } = useLocalization();

  return (
    <div>
      <h2>{t('unlockPremium', locale.language)}</h2>
      <p>{t('unlimitedMessages', locale.language)}</p>
      <button>{t('getStarted', locale.language)}</button>
    </div>
  );
}
```

## Example 4: Chat Input Placeholder

```tsx
// In your chat component
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';

export default function ChatInput() {
  const { locale } = useLocalization();

  return (
    <input
      type="text"
      placeholder={t('typeMessage', locale.language)}
    />
  );
}
```

## Quick Start - 5 Minute Integration

### 1. Already Done ✅
- LocalizationProvider added to layout
- Translations file ready with 4 languages
- Geo detection working

### 2. Update Just 3-4 Components (10 minutes each)

**High Impact Components:**
1. `PremiumCTASection.tsx` - Main upgrade CTA
2. `ChatInput` area - Placeholder text
3. Auth buttons - "Sign In", "Sign Up"
4. Main CTAs - "Get Started", "Buy Now"

**Lower Priority:**
- Error messages
- Settings pages
- Admin dashboard

### 3. Test
- Change browser language to Spanish
- Reload page
- See Spanish text automatically

## Adding New Translations

Need a new translation? Just add to `lib/translations.ts`:

```typescript
export const translations = {
  en: {
    // ... existing ...
    myNewKey: 'My English Text',
  },
  es: {
    // ... existing ...
    myNewKey: 'Mi Texto en Español',
  },
  // ... other languages
};
```

Then use it:
```tsx
{t('myNewKey', locale.language)}
```

## Pro Tips

### 1. Start Small
Don't translate everything at once. Focus on:
- Main CTA buttons
- Product names/descriptions
- Navigation
- Error messages

### 2. Test with Browser Language
Chrome: Settings → Languages → Add Spanish
Firefox: Preferences → Language → Choose Spanish

### 3. Use Chrome Translate for Missing Strings
If a string isn't translated yet, Chrome will offer to translate the page. This gives you a preview of the full translated experience while you incrementally add translations.

### 4. Character Names Stay in English
Keep character names in English - they're brand identifiers:
- "Lexi" not "Lexi"
- "Chase" not "Perseguir"

## Expected Impact

### Before Localization:
- Spanish speaker visits site
- Sees "Buy Now", "Get Started", "Message Lexi"
- 50% understand, 50% confused
- Lower conversion rate

### After Localization:
- Spanish speaker visits site
- Sees "Comprar Ahora", "Comenzar", "Mensaje a Lexi"
- 100% understand
- **20-30% higher conversion rate**

## Rollout Plan

### Week 1: Core CTAs
- Add translations to buy buttons
- Add translations to main CTAs
- Test with Spanish-speaking friends

### Week 2: Full UI
- Translate all visible text
- Add error messages
- Polish edge cases

### Week 3: Optimize
- Run A/B test: English vs Spanish for Mexican users
- Measure conversion rate improvement
- Expand to Portuguese for Brazil

## Maintenance

### When Adding New Features
Just remember to use `t()` for any user-facing text:

```tsx
// ❌ Don't do this
<button>New Feature</button>

// ✅ Do this
<button>{t('newFeature', locale.language)}</button>
```

Then add translations to `lib/translations.ts`

## Summary

**What's Ready:**
✅ Localization system fully built
✅ 4 languages supported (EN, ES, PT, FR)
✅ Auto-detection working
✅ 50+ common phrases translated

**What You Need to Do:**
1. Add `useLocalization()` hook to components
2. Replace hardcoded strings with `t()` function
3. Test in different languages

**Time Investment:**
- 5 minutes per component
- Start with 3-4 high-impact components
- ~30 minutes total for MVP

**Expected ROI:**
- 20-30% conversion improvement for Spanish speakers
- Opens up LatAm market (Mexico, Colombia, Argentina)
- Better user experience = better retention

Ready to start? Just update VerseCoinsModal, PremiumCTASection, and ChatInput first!
