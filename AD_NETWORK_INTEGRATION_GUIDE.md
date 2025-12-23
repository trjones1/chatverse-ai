# Ad Network Integration Guide for Freemium Model

## Overview

Now that chat is unlimited and free, we monetize through:
1. **Voice messages** (VerseCoins) - PRIMARY revenue
2. **Display ads** (ExoClick/TrafficJunky) - SECONDARY passive revenue
3. **Tips/Gifts** (VerseCoins) - TERTIARY revenue

---

## Recommended Ad Network: ExoClick

**Why ExoClick?**
- ✅ Adult content friendly (no rejection risk)
- ✅ High CPM rates for adult niches ($2-5 CPM for Tier 1 traffic)
- ✅ React integration library available (`exoclick-react`)
- ✅ 12+ billion daily ad impressions
- ✅ Multiple ad formats (banners, native, popunders)

---

## Expected Revenue Projections

### Current Traffic (Conservative):
- **3,600 users/month** sending messages
- **Average 10 messages per user** = 36,000 messages/month
- **CPM: $2.00** (Tier 1 US/Canada traffic)
- **Revenue: $72/month** from ads alone

### With 10x Growth (Realistic with freemium):
- **36,000 users/month**
- **360,000 messages/month**
- **CPM: $2.00**
- **Revenue: $720/month** from ads

### With Voice Conversion (1% convert):
- **360 users buy voice** @ $9.99/month
- **Voice revenue: $3,596/month**
- **Total: $4,316/month** (ads + voice)

---

## Implementation Steps

### 1. Sign Up for ExoClick

1. Go to https://www.exoclick.com/
2. Click "Sign Up" → "Publisher"
3. Fill out application with:
   - Website: chatwithlexi.com (and other domains)
   - Category: Adult Content / Entertainment
   - Traffic type: Web + Mobile
   - Traffic volume: ~10K pageviews/month (growing)
4. Wait for approval (usually 24-48 hours)

### 2. Install ExoClick React Library

```bash
npm install exoclick-react
```

### 3. Create Ad Component

Create `/components/ads/ExoClickAd.tsx`:

```typescript
'use client';

import React from 'react';
import { Banner, Outstream } from 'exoclick-react';

interface ExoClickAdProps {
  zoneId: number;
  format: 'banner' | 'outstream' | 'native';
  className?: string;
}

export default function ExoClickAd({ zoneId, format, className }: ExoClickAdProps) {
  // Don't show ads to paying users (optional - might want to show anyway)
  // const { paid } = useAuth(); // if paid, return null

  if (format === 'banner') {
    return (
      <div className={`ad-container ${className || ''}`}>
        <Banner zoneId={zoneId} />
      </div>
    );
  }

  if (format === 'outstream') {
    return (
      <div className={`ad-container ${className || ''}`}>
        <Outstream zoneId={zoneId} />
      </div>
    );
  }

  return null;
}
```

### 4. Strategic Ad Placement

**Option A: Between Messages (Recommended)**
- Show ad every 5-10 messages in chat
- Feels natural, not intrusive
- Maximum impressions

```typescript
// In ChatBox.tsx or MessageList.tsx
{messages.map((msg, index) => (
  <>
    <MessageBubble key={msg.id} message={msg} />
    {index % 7 === 0 && index > 0 && (
      <ExoClickAd
        zoneId={YOUR_ZONE_ID}
        format="banner"
        className="my-4"
      />
    )}
  </>
))}
```

**Option B: Fixed Sidebar (Desktop Only)**
```typescript
// In ChatLayout.tsx
<div className="hidden lg:block lg:w-64">
  <ExoClickAd zoneId={YOUR_ZONE_ID} format="banner" />
</div>
```

**Option C: Bottom Banner (Mobile)**
```typescript
// Fixed to bottom, above ChatInput
<div className="fixed bottom-20 left-0 right-0 z-40">
  <ExoClickAd zoneId={YOUR_ZONE_ID} format="banner" />
</div>
```

### 5. Get Your Zone IDs

After approval, ExoClick will provide:
1. **Banner Zone ID** - for display ads
2. **Native Zone ID** - for native ads (looks like content)
3. **Outstream Zone ID** - for video ads

Add to `.env.local`:
```bash
NEXT_PUBLIC_EXOCLICK_BANNER_ZONE_ID=123456
NEXT_PUBLIC_EXOCLICK_NATIVE_ZONE_ID=234567
NEXT_PUBLIC_EXOCLICK_OUTSTREAM_ZONE_ID=345678
```

### 6. Testing

Before going live:
1. Enable test mode in ExoClick dashboard
2. Verify ads display correctly on:
   - Mobile (iOS Safari, Android Chrome)
   - Desktop (Chrome, Firefox, Safari)
   - All character domains
3. Check ad doesn't break layout
4. Measure impact on page load speed

---

## Alternative Ad Networks

If ExoClick rejects:

### TrafficJunky
- **CPM**: $1-3 for adult content
- **Pros**: PornHub network, huge reach
- **Cons**: More strict approval process
- **URL**: https://www.trafficjunky.com/

### JuicyAds
- **CPM**: $0.50-2.00
- **Pros**: Easy approval, adult-friendly
- **Cons**: Lower CPM than ExoClick
- **URL**: https://www.juicyads.com/

### AdXpansion
- **CPM**: $1-4
- **Pros**: High CPM for adult content
- **Cons**: Less documentation
- **URL**: https://www.adxpansion.com/

---

## Ad Optimization Tips

### 1. A/B Test Ad Placement
- Try different positions (between messages, sidebar, bottom)
- Track which gets highest CTR without hurting UX

### 2. Frequency Capping
- Don't show ads every 2 messages (too annoying)
- Sweet spot: Every 7-10 messages

### 3. Ad-Free Option
- Offer "Remove Ads for $4.99/month" as upsell
- Some users will pay just to remove ads

### 4. GEO Targeting
- US/Canada/UK traffic = highest CPM
- Consider showing more ads to Tier 1 traffic

### 5. Ad Refresh
- Don't auto-refresh ads (bad UX)
- Only show new ad when user scrolls to it

---

## Revenue Tracking

Add analytics to track:
1. **Ad Impressions** - how many ads shown
2. **Ad CTR** - how many users click ads
3. **Voice Conversion** - did user buy voice after seeing ad?

```typescript
// Track ad impression
trackEvent('ad_impression', {
  ad_network: 'exoclick',
  zone_id: zoneId,
  format: 'banner',
  user_tier: 'free'
});
```

---

## Legal Considerations

### Required Disclosures:
1. Update Privacy Policy with ad network data sharing
2. Add "This site uses advertising" notice
3. Update Terms of Service

### GDPR/CCPA:
- ExoClick is GDPR compliant
- Add cookie consent banner if not already present
- Allow users to opt out of personalized ads

---

## Next Steps

1. ✅ Sign up for ExoClick publisher account
2. ⏳ Wait for approval (24-48 hours)
3. ⏳ Get zone IDs from dashboard
4. ⏳ Install `exoclick-react` package
5. ⏳ Create `ExoClickAd` component
6. ⏳ Add ads between messages (every 7 messages)
7. ⏳ Test on all devices and domains
8. ⏳ Monitor revenue in ExoClick dashboard
9. ⏳ Optimize placement based on CTR data

---

## Estimated Timeline

- **Week 1**: Sign up + approval → Get zone IDs
- **Week 2**: Implement ad component → Test thoroughly
- **Week 3**: Deploy to production → Monitor metrics
- **Week 4**: Optimize placement → Scale traffic

---

## Success Metrics

Track these KPIs:
- **Ad Revenue/Month**: Target $500+ with current traffic
- **Voice Revenue/Month**: Target $3,000+ (1% conversion)
- **Total Revenue/Month**: Target $3,500+ combined
- **User Complaints**: Keep under 5% (ads too annoying)
- **Page Load Impact**: Keep under 200ms slower

---

## Questions?

Refer to:
- ExoClick docs: https://docs.exoclick.com/
- React library: https://exoclick-react.netlify.app/
- Support: publishers@exoclick.com
