# 🧪 Comprehensive Testing Flows

## 🎯 Your Current Test Plan (Perfect!)

### **Flow 1: New Customer → SFW Subscription**
```
1. New private window
2. Do 5 free chats 
3. Try 6th chat → Get modal popup
4. Create account with email
5. Get funneled to $10 SFW purchase
6. Checkout with Stripe (Apple Pay/Card)
7. Redirected back → Should be logged in
8. Sent directly to chat with SFW entitlements
```

### **Flow 2: New Customer → Direct NSFW**  
```
1. New private window
2. Click "Unlock NSFW" 
3. Forced to create account
4. Redirected to Stripe for NSFW sub purchase
5. Post-purchase → Success page
6. Should be logged in
7. Redirected to chat with NSFW unlocked
```

### **Flow 3: SFW → NSFW Upgrade**
```
1. Already have SFW subscription
2. Go to Dashboard → Billing Portal link
3. Stripe handles prorated upgrade
4. Return with NSFW entitlements
```

---

## 🛠️ Testing Setup & Tools

### **Admin Cleanup (Use This!)**
Add to your Dashboard page:
```tsx
import AdminCleanupButton from '@/components/AdminCleanupButton';

// In your dashboard:
<AdminCleanupButton />
```

Or run SQL directly:
```sql
-- Quick reset for testing
DELETE FROM user_subscriptions;
DELETE FROM voice_credit_ledger;  
DELETE FROM voice_wallets;
DELETE FROM daily_chat_usage;
-- Keep users, just clear their data
```

### **Character Testing on Localhost**
```bash
# Test Chase (your fuckboy)
NEXT_PUBLIC_CHARACTER_KEY=chase npm run dev

# Test other characters  
NEXT_PUBLIC_CHARACTER_KEY=dom npm run dev    # Dominic
NEXT_PUBLIC_CHARACTER_KEY=ethan npm run dev  # Professional
NEXT_PUBLIC_CHARACTER_KEY=jayden npm run dev # Laid-back
```

---

## ✅ What Should Work Now

### **Voice Token Access (Updated Per Your Request)**
- ✅ **SFW subscribers**: Can purchase voice tokens
- ✅ **NSFW subscribers**: Can purchase voice tokens  
- ✅ **Free users**: Cannot purchase tokens
- ✅ **Both tiers can**: Use voice messages & voice calling

### **Auth Session Management**
- ✅ **Session persists** on page refresh
- ✅ **Login modal** works properly
- ✅ **Success page** shows celebration
- ✅ **Stripe redirects** maintain auth state

### **Subscription Flows**
- ✅ **Free → SFW**: Daily limit modal → Signup → Purchase
- ✅ **Free → NSFW**: NSFW modal → Signup → Purchase  
- ✅ **SFW → NSFW**: Billing portal upgrade
- ✅ **Post-purchase**: Auto-login and redirect to chat

---

## 🔄 Automated Testing Script (Optional)

Create this for faster testing:
```bash
#!/bin/bash
# reset-test-env.sh

echo "🗑️ Cleaning database..."
curl -X POST http://localhost:3000/api/admin/cleanup

echo "🎭 Testing Chase character..."
export NEXT_PUBLIC_CHARACTER_KEY=chase
npm run dev &
sleep 5

echo "🔗 Opening test URLs..."
open "http://localhost:3000"
open "http://localhost:3000/dashboard"

echo "✅ Ready for testing!"
```

---

## 🎮 Test Email Addresses 

Use your 4 regular test emails:
- `test1@example.com`
- `test2@example.com` 
- `test3@example.com`
- `test4@example.com`

The admin cleanup will clear all subscriptions but keep users, so you can reuse the same emails infinitely.

---

## 🚨 Success Criteria

**Each flow should result in:**
1. ✅ User stays logged in post-purchase
2. ✅ Correct subscription tier applied
3. ✅ Entitlements work immediately  
4. ✅ No 401/500 errors
5. ✅ Clean redirect back to chat
6. ✅ Voice tokens purchasable (if SFW/NSFW)

Perfect testing setup! 🔥