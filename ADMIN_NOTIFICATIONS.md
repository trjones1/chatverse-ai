# Admin Email Notifications

## Overview
You'll now receive instant email notifications whenever:
- 🎉 A new user signs up
- 💰 Someone makes a purchase

## Email Addresses
Notifications are sent to:
- `tramel.jones@gmail.com`
- `tramel.jones@icloud.com`

## What You'll Receive

### New User Signup Emails
**Subject:** 🎉 New User Signup: [user@email.com]

**Contains:**
- User email address
- User ID (for looking up in Supabase)
- Signup method (Google, email, etc.)
- Character they signed up with
- Timestamp
- Action items reminder (monitor engagement, check for bounce)
- Link to Supabase Auth dashboard

### New Purchase Emails
**Subject:** 💰 NEW PURCHASE: $XX.XX from [user@email.com]

**Contains:**
- Big green banner with purchase amount
- Customer email
- User ID
- Purchase type (subscription, VerseCoins, voice credits)
- Product name (e.g., "Premium+ All Access Pass")
- Character
- Order ID
- Timestamp
- Next steps reminder (celebrate, monitor satisfaction, thank you message)
- Link to admin dashboard

## Testing

### Test All Notifications
You can test the email system without waiting for real signups/purchases:

```bash
# Test basic email system
curl -X POST https://www.chatwithlexi.com/api/admin/test-notifications \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'

# Test signup notification
curl -X POST https://www.chatwithlexi.com/api/admin/test-notifications \
  -H "Content-Type: application/json" \
  -d '{"type":"signup"}'

# Test purchase notification
curl -X POST https://www.chatwithlexi.com/api/admin/test-notifications \
  -H "Content-Type: application/json" \
  -d '{"type":"purchase"}'
```

Or test locally:
```bash
curl -X POST http://localhost:3000/api/admin/test-notifications \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

### Expected Behavior
After running a test, you should receive:
- ✅ Email within 1-2 seconds
- ✅ Beautiful HTML formatting
- ✅ All relevant data included

## Technical Details

### When Notifications Are Sent

**Signup Notifications:**
- Triggered in: `app/auth/callback/route.ts`
- Sent after successful OAuth callback
- Only for NEW users (within 60 seconds of account creation)
- Doesn't block authentication if email fails

**Purchase Notifications:**
- Triggered in: `app/api/versecoins/purchase-subscription/route.ts`
- Sent after successful purchase
- Includes all purchase details
- Doesn't block purchase if email fails

### Email Service
- Provider: **Resend** (already configured)
- From: "Lexi Bot Notifications <support@chatverse.ai>"
- HTML + Plain text versions
- Non-blocking (won't fail auth/purchase if email fails)

### Configuration
Emails are configured in `.env.local`:
```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=support@chatverse.ai
ADMIN_NOTIFICATION_EMAIL=tramel.jones@gmail.com  # Optional additional email
```

## Troubleshooting

### Not Receiving Emails?

1. **Check spam folder** - First time emails might go to spam
2. **Test the system:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/test-notifications \
     -H "Content-Type: application/json" \
     -d '{"type":"test"}'
   ```
3. **Check Resend dashboard** - Verify emails are being sent
4. **Check server logs** - Look for "Admin notification sent" messages

### Add More Email Addresses

Edit `lib/adminNotifications.ts`:
```typescript
private get adminEmails(): string[] {
  const emails = [
    'tramel.jones@gmail.com',
    'tramel.jones@icloud.com',
    'another.email@example.com',  // Add here
  ];
  return emails;
}
```

## What to Do When You Get Notifications

### New Signup Email:
1. ✅ Celebrate! You have a new user
2. 📊 Check your admin dashboard within 5 minutes
3. 💬 See if they sent their first message
4. 📈 Monitor bounce rate (did they engage?)
5. 📧 Consider retention email in 24 hours if they don't return

### New Purchase Email:
1. 🎉 CELEBRATE! You made money!
2. ✅ Verify in admin dashboard
3. 💌 Consider sending a personal thank you
4. 📊 Track their usage/satisfaction
5. 💰 Add to revenue tracking

## Future Enhancements

Potential additions:
- Daily summary emails (X signups, $X revenue)
- Weekly reports
- Churn notifications (subscription cancellations)
- Refund notifications
- High-value customer alerts
- Threshold alerts (e.g., "10 signups today!")

## Files

- `lib/adminNotifications.ts` - Main notification service
- `app/api/admin/test-notifications/route.ts` - Test endpoint
- `app/auth/callback/route.ts` - Signup notifications
- `app/api/versecoins/purchase-subscription/route.ts` - Purchase notifications

## Support

If you have issues with notifications:
1. Check server logs for errors
2. Test with the test endpoint
3. Verify Resend API key is valid
4. Check that emails aren't being marked as spam

Remember: Email failures won't break signups or purchases - they fail silently!
