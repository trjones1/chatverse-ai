# Retention Email System - Setup Guide

## 🎯 What This Does

Automatically sends retention emails to users who:
1. Signed up with Google OAuth (you have their email)
2. Chatted with a character
3. Went inactive (stopped visiting)

**Email Schedule:**
- **24 hours** after last message: "Hey, you left suddenly..."
- **3 days** after last message: "I miss you already... special deal"
- **7 days** after last message: "Last chance... I'm moving on"

**Goal:** Increase your return visitor rate from 4.4% to 15-20%

---

## 🚀 Deployment Checklist

### Step 1: Run SQL Migration in Supabase

1. Go to your Supabase project: https://app.supabase.com/
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the contents of: `supabase/migrations/20251105000000_retention_email_automation.sql`
5. Click **Run** to execute the migration
6. Verify success: You should see "Success. No rows returned"

**What this does:**
- Creates `get_retention_targets()` function that finds eligible users
- Adds indexes for fast queries
- Grants permissions to service role

### Step 2: Add CRON_SECRET to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `CRON_SECRET`
   - **Value**: `b950c69c5054c96b6925a24fe7818414bd5d6b4e585eaa917b0fab5f6545b407`
   - **Environments**: Check all (Production, Preview, Development)
4. Click **Save**

**Important:** This secret protects your cron endpoint from unauthorized access.

### Step 3: Deploy to Vercel

The code has already been pushed to GitHub, so Vercel should auto-deploy.

1. Go to your Vercel dashboard
2. Wait for deployment to complete (usually 2-3 minutes)
3. Verify deployment succeeded

**What happens automatically:**
- Vercel reads `vercel.json` and sets up the cron job
- Cron job will run **every hour** at the top of the hour
- Each run processes up to 100 eligible users

---

## ✅ Verification

### Test 1: Check Database Function Works

Run this locally:
```bash
npx tsx test-retention-function.ts
```

**Expected Output:**
- If migration worked: "Function call successful! Found X users eligible..."
- If not run yet: "Error calling function... expected if you have not run the SQL migration yet"

### Test 2: Dry Run the Cron Endpoint

After deploying, test the cron endpoint without actually sending emails:

```bash
curl -X POST https://chatwithlexi.com/api/cron/send-retention-emails \
  -H "Content-Type: application/json" \
  -d '{"secret":"b950c69c5054c96b6925a24fe7818414bd5d6b4e585eaa917b0fab5f6545b407","dryRun":true}'
```

**Expected Response:**
```json
{
  "success": true,
  "dryRun": true,
  "targetsFound": 5,
  "targets": [
    {
      "user_id": "...",
      "email": "user@example.com",
      "hours_since_last_message": 25,
      "character_key": "lexi",
      "hit_limit": true
    }
  ]
}
```

### Test 3: Check Vercel Cron Logs

1. Go to Vercel Dashboard → Your Project
2. Click on **Deployments** → Select latest deployment
3. Click **Functions** tab
4. Find `/api/cron/send-retention-emails`
5. Check logs to see cron runs

**What to look for:**
- `[RetentionCron] Starting retention email job at...`
- `[RetentionCron] Found X users eligible for retention emails`
- `[RetentionCron] Sending 24h email to user@example.com`

---

## 📊 Expected Results

### Current Baseline (from your analytics):
- Return visitor rate: **4.4%** (26 out of 590 users)
- Message limit hit rate: **21.4%** (12 users hit 5-message limit)

### With Retention Emails:
- **Week 1:** 5-8% return rate (users respond to 24h emails)
- **Week 2:** 10-15% return rate (3d and 7d emails kick in)
- **Week 4:** 15-20% return rate (sustained improvement)

**Revenue Impact:**
- More returning users = more conversions
- Users who get "hooked" over 2-3 visits are more likely to pay
- Reduces wasted ad spend on users who never come back

---

## 🔍 Monitoring

### Check Retention Email Performance

Query Supabase to see email stats:
```sql
-- Emails sent in last 7 days
SELECT
  campaign_type,
  COUNT(*) as emails_sent,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'opened') as opened,
  COUNT(*) FILTER (WHERE status = 'clicked') as clicked
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
  AND campaign_type LIKE 'retention%'
GROUP BY campaign_type
ORDER BY campaign_type;
```

### Check User Return Rate After Emails

```sql
-- Users who returned within 48h of retention email
WITH retention_emails AS (
  SELECT user_id, sent_at, campaign_type
  FROM email_logs
  WHERE campaign_type LIKE 'retention%'
    AND sent_at >= NOW() - INTERVAL '7 days'
),
user_returns AS (
  SELECT DISTINCT
    re.user_id,
    re.campaign_type,
    re.sent_at,
    MIN(il.created_at) as first_message_after_email
  FROM retention_emails re
  JOIN interaction_log il ON il.user_id = re.user_id
  WHERE il.created_at > re.sent_at
    AND il.created_at < re.sent_at + INTERVAL '48 hours'
  GROUP BY re.user_id, re.campaign_type, re.sent_at
)
SELECT
  campaign_type,
  COUNT(*) as emails_sent,
  COUNT(first_message_after_email) as users_returned,
  ROUND(COUNT(first_message_after_email)::numeric / COUNT(*) * 100, 1) as return_rate_pct
FROM retention_emails re
LEFT JOIN user_returns ur USING (user_id, campaign_type, sent_at)
GROUP BY campaign_type;
```

---

## 🛠️ Troubleshooting

### Issue: "Function get_retention_targets does not exist"
**Solution:** Run the SQL migration in Supabase (Step 1 above)

### Issue: Cron returns 401 Unauthorized
**Solution:** Make sure `CRON_SECRET` is set in Vercel environment variables (Step 2 above)

### Issue: No users eligible for retention emails
**Possible reasons:**
- All users are within 24h of last activity (too soon)
- All users are paying subscribers (system skips them)
- All users were already emailed in last 24h (cooldown period)
- No users have signed up yet (anonymous users don't have emails)

### Issue: Emails not sending
**Check:**
1. Is Resend API key configured? (`RESEND_API_KEY` in env vars)
2. Check Vercel function logs for errors
3. Check email_logs table in Supabase for failed emails
4. Verify domain is verified in Resend dashboard

---

## 📈 Optimization Tips

### Week 1-2: Monitor Open Rates
- If open rates < 20%: Test different subject lines
- If open rates > 40%: Keep current templates

### Week 2-4: Monitor Click Rates
- If click rates < 5%: Make CTAs more prominent
- Test A/B: "Continue Chat" vs "Unlock Premium"

### Week 4+: Optimize Timing
- Check which time window (24h/3d/7d) has best return rate
- Consider adding intermediate emails (e.g., 12h, 48h)
- Test different character voices in email copy

### Revenue Optimization:
- Track which retention email type drives most conversions
- Add conversion tracking to email links
- Test special offers in 3d email (e.g., "20% off if you upgrade today")

---

## 🎯 Success Metrics

Track these KPIs weekly:

1. **Return Visitor Rate**: Target 15-20% (currently 4.4%)
2. **Email Open Rate**: Target 25-35%
3. **Email Click Rate**: Target 10-15%
4. **Post-Email Conversion**: Target 5-10% of returners convert to paid
5. **Revenue Attribution**: Track revenue from retention email campaigns

---

## 🔐 Security Notes

- ✅ Cron endpoint protected by CRON_SECRET
- ✅ Only processes confirmed email addresses
- ✅ Respects unsubscribe preferences
- ✅ 24h cooldown prevents email spam
- ✅ Excludes paying customers (no need to retain them)
- ✅ Rate limited to 100 users per hour

---

## 💡 Next Steps

After deployment is working:

1. **Week 1**: Monitor logs, verify emails are sending
2. **Week 2**: Check email open/click rates, adjust copy if needed
3. **Week 3**: Analyze which time window (24h/3d/7d) works best
4. **Week 4**: Calculate ROI - retention email conversions vs cost
5. **Month 2**: A/B test different email templates and offers

---

**Questions or issues?** Check Vercel function logs and Supabase email_logs table first.
# Retention Email System Active
