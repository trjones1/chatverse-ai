# Subscription Upgrade Path Test Plan

> Comprehensive test plan for validating all subscription upgrade scenarios in the VerseCoins system

## Overview

This document outlines the test procedures for validating subscription upgrade paths after fixing the tier detection bug where Weekly Premium+ users couldn't upgrade to Monthly Premium+ due to incorrect tier detection logic.

## Test Environment Setup

- **Test User**: `token.blakk@gmail.com` (Founder #2)
- **Character**: Lexi (or any character)
- **Pre-test Requirements**:
  - Ensure sufficient VerseCoins balance (3000+)
  - Clear browser cache if testing UI changes
  - Verify deployment is latest version

## Subscription Tier Configuration

| Tier Type | Name | Cost (VerseCoins) | Duration | Access Level |
|-----------|------|-------------------|----------|--------------|
| `premium_weekly` | Weekly Premium Pass | 500 | 7 days | SFW |
| `premium` | Monthly Premium Pass | 1500 | 30 days | SFW |
| `premium_plus_weekly` | Weekly Premium+ Pass | 833 | 7 days | NSFW |
| `premium_plus` | Monthly Premium+ All Access Pass | 2500 | 30 days | NSFW |

**Note**: Founder pricing applies 10% discount for weekly subscriptions and uses locked pricing for monthly subscriptions.

## Test Scenarios

### ✅ VALID UPGRADE PATHS (Should Work)

#### Scenario A: Duration Upgrades (Weekly → Monthly)

**Test 1: Weekly Premium → Monthly Premium**
- **Starting State**: Active Weekly Premium Pass subscription
- **Target**: Monthly Premium Pass
- **Expected Result**: ✅ Allow upgrade with prorated cost calculation
- **Key Validation**: Upgrade cost should account for remaining days on weekly subscription

**Test 2: Weekly Premium+ → Monthly Premium+** ⭐ *Original Bug Scenario*
- **Starting State**: Active Weekly Premium+ Pass subscription
- **Target**: Monthly Premium+ All Access Pass
- **Expected Result**: ✅ Allow upgrade with prorated cost calculation
- **Key Validation**: Must NOT show "already have subscription" error
- **Bug Context**: This scenario failed due to `subscription.tier_name` being null while `subscription.features.tier_name` contained "Weekly Premium+ Pass"

#### Scenario B: Tier Upgrades (SFW → NSFW)

**Test 3: Weekly Premium → Weekly Premium+**
- **Starting State**: Active Weekly Premium Pass subscription
- **Target**: Weekly Premium+ Pass
- **Expected Result**: ✅ Allow upgrade with prorated cost
- **Key Validation**: Should trigger NSFW age verification gate

**Test 4: Monthly Premium → Monthly Premium+**
- **Starting State**: Active Monthly Premium Pass subscription
- **Target**: Monthly Premium+ All Access Pass
- **Expected Result**: ✅ Allow upgrade with prorated cost
- **Key Validation**: Should trigger NSFW age verification gate

#### Scenario C: Cross Upgrades (Duration + Tier Change)

**Test 5: Weekly Premium → Monthly Premium+**
- **Starting State**: Active Weekly Premium Pass subscription
- **Target**: Monthly Premium+ All Access Pass
- **Expected Result**: ✅ Allow upgrade with full cost + refund calculation
- **Key Validation**: Complex calculation involving both tier and duration changes

**Test 6: Monthly Premium → Weekly Premium+**
- **Starting State**: Active Monthly Premium Pass subscription
- **Target**: Weekly Premium+ Pass
- **Expected Result**: ✅ Allow upgrade with refund calculation
- **Key Validation**: Should provide refund for unused monthly subscription time

### ❌ INVALID PATHS (Should Be Blocked)

#### Scenario D: Duplicate Subscriptions

**Test 7: Weekly Premium → Weekly Premium (Duplicate)**
- **Starting State**: Active Weekly Premium Pass subscription
- **Target**: Weekly Premium Pass (same tier)
- **Expected Result**: ❌ Show error "You already have an active Weekly Premium Pass subscription for {character}"
- **Key Validation**: Proper duplicate detection and user-friendly error message

**Test 8: Monthly Premium+ → Monthly Premium+ (Duplicate)**
- **Starting State**: Active Monthly Premium+ All Access Pass subscription
- **Target**: Monthly Premium+ All Access Pass (same tier)
- **Expected Result**: ❌ Show error "You already have an active Premium+ All Access Pass subscription for {character}"
- **Key Validation**: Proper duplicate detection for highest tier

#### Scenario E: Downgrades (Should Be Blocked or Handled Specially)

**Test 9: Monthly Premium+ → Monthly Premium (Downgrade)**
- **Starting State**: Active Monthly Premium+ All Access Pass subscription
- **Target**: Monthly Premium Pass
- **Expected Result**: ❌ Block as downgrade or show special downgrade flow
- **Key Validation**: System should prevent accidental downgrades

**Test 10: Weekly Premium+ → Weekly Premium (Downgrade)**
- **Starting State**: Active Weekly Premium+ Pass subscription
- **Target**: Weekly Premium Pass
- **Expected Result**: ❌ Block as downgrade or show special downgrade flow
- **Key Validation**: System should prevent accidental downgrades

## Testing Procedure

### For Each Valid Upgrade Path:

1. **Setup Phase**:
   ```bash
   # Verify current subscription state
   NEXT_PUBLIC_SUPABASE_URL=https://copjpqtwdqrclfrwoaeb.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGpwcXR3ZHFyY2xmcndvYWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxOTgyNywiZXhwIjoyMDY5Mzk1ODI3fQ.NCo6uRV5W3MTzc9VjuT2LbwGcHPA3aTm0V3Qd_GFxpQ node -e "
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   // Check current subscription for test user
   "
   ```

2. **Navigate to Upgrade Interface**:
   - Log in as test user
   - Open character chat interface
   - Click on VerseCoins/upgrade button
   - Navigate to "Spend" tab in modal

3. **Verify Upgrade Preview**:
   - Locate target subscription tier button
   - Verify button is enabled (not grayed out)
   - Check cost calculation accuracy
   - Confirm no error messages appear

4. **Execute Upgrade**:
   - Click target subscription upgrade button
   - Complete any verification steps (NSFW gate, etc.)
   - Verify purchase completes without errors
   - Check new subscription is activated correctly

5. **Post-Upgrade Validation**:
   ```bash
   # Verify new subscription state
   # Check subscription tier, end date, and features
   ```

### For Each Invalid Path:

1. **Setup Phase**: Ensure user has the starting subscription
2. **Navigate**: Go to VerseCoins modal → Spend tab
3. **Verify Blocking Behavior**:
   - **Duplicates**: Should show appropriate error message
   - **Downgrades**: Should either block entirely or show special downgrade flow
   - **UI State**: Buttons should be appropriately disabled or hidden

## Test Results Tracking

| Test # | Starting Tier | Target Tier | Expected | Actual Result | Status | Notes |
|--------|---------------|-------------|----------|---------------|---------|-------|
| 1 | Weekly Premium | Monthly Premium | ✅ Allow | | ⏳ | |
| 2 | Weekly Premium+ | Monthly Premium+ | ✅ Allow | | ⏳ | **Original Bug** |
| 3 | Weekly Premium | Weekly Premium+ | ✅ Allow | | ⏳ | NSFW gate test |
| 4 | Monthly Premium | Monthly Premium+ | ✅ Allow | | ⏳ | NSFW gate test |
| 5 | Weekly Premium | Monthly Premium+ | ✅ Allow | | ⏳ | Complex upgrade |
| 6 | Monthly Premium | Weekly Premium+ | ✅ Allow | | ⏳ | Refund scenario |
| 7 | Weekly Premium | Weekly Premium | ❌ Block | | ⏳ | Duplicate detection |
| 8 | Monthly Premium+ | Monthly Premium+ | ❌ Block | | ⏳ | Duplicate detection |
| 9 | Monthly Premium+ | Monthly Premium | ❌ Block | | ⏳ | Downgrade prevention |
| 10 | Weekly Premium+ | Weekly Premium | ❌ Block | | ⏳ | Downgrade prevention |

**Status Legend**: ⏳ Pending | ✅ Pass | ❌ Fail | ⚠️ Partial

## Priority Testing Order

1. **🔥 Test #2 (Weekly Premium+ → Monthly Premium+)** - The original bug scenario
2. **Test #1, #3, #4** - Common upgrade paths users actually take
3. **Test #7, #8** - Verify duplicate detection works correctly
4. **Test #5, #6** - Complex cross-upgrade scenarios
5. **Test #9, #10** - Downgrade handling verification

## Technical Context

### Root Cause of Original Bug

The tier detection logic was checking `subscription.tier_name` which was `null` for weekly subscriptions, instead of checking `subscription.features.tier_name` which contained the actual tier name like "Weekly Premium+ Pass".

**Fixed Logic**:
```typescript
// Before (broken)
const isExistingWeekly = existingSubscription.tier_name?.includes('Weekly')

// After (fixed)
const tierName = existingSubscription.features?.tier_name || existingSubscription.tier_name;
const isExistingWeekly = tierName?.includes('Weekly')
```

### Files Modified

- `/app/api/versecoins/purchase-subscription/route.ts` - Fixed tier detection in purchase flow
- `/app/api/versecoins/upgrade-preview/route.ts` - Fixed tier detection in preview calculation
- `/components/VerseCoinsModal.tsx` - Enhanced disabled styling for insufficient funds

### Founder Pricing Considerations

- **Weekly Subscriptions**: 10% discount applied to base cost
- **Monthly Subscriptions**: Uses locked founder pricing from database
- **Test User**: token.blakk@gmail.com is Founder #2 with locked pricing

## Troubleshooting

### Common Issues

1. **"Already have subscription" error on valid upgrades**:
   - Check if upgrade-preview API is returning correct tier detection
   - Verify `features.tier_name` field in database

2. **Incorrect cost calculations**:
   - Verify founder pricing is being applied correctly
   - Check prorated cost calculation for remaining days

3. **UI not reflecting upgrade options**:
   - Clear browser cache
   - Check if latest deployment is live
   - Verify VerseCoins balance is sufficient

### Debug Commands

```bash
# Check current subscription for test user
NEXT_PUBLIC_SUPABASE_URL=https://copjpqtwdqrclfrwoaeb.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGpwcXR3ZHFyY2xmcndvYWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxOTgyNywiZXhwIjoyMDY5Mzk1ODI3fQ.NCo6uRV5W3MTzc9VjuT2LbwGcHPA3aTm0V3Qd_GFxpQ node -e "/* subscription check script */"

# Check founder pricing
NEXT_PUBLIC_SUPABASE_URL=https://copjpqtwdqrclfrwoaeb.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGpwcXR3ZHFyY2xmcndvYWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxOTgyNywiZXhwIjoyMDY5Mzk1ODI3fQ.NCo6uRV5W3MTzc9VjuT2LbwGcHPA3aTm0V3Qd_GFxpQ node -e "/* founder pricing check script */"
```

## Success Criteria

### Test Completion Requirements

- [ ] All 10 test scenarios executed
- [ ] Test #2 (original bug) passes successfully
- [ ] No false "already subscribed" errors on valid upgrades
- [ ] Duplicate detection works correctly
- [ ] Cost calculations are accurate for all scenarios
- [ ] UI properly reflects available options
- [ ] NSFW age verification gates work correctly

### Deployment Validation

- [ ] Changes deployed to production
- [ ] Database schema supports test scenarios
- [ ] Founder pricing calculations work correctly
- [ ] Error messages are user-friendly
- [ ] Refund calculations work for complex scenarios

---

*Last Updated: October 9, 2025*
*Test Plan Version: 1.0*
*Related Issues: Weekly Premium+ → Monthly Premium+ upgrade bug*