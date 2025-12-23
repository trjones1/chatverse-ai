# 🤖 Automated QA Testing Setup

This guide will help you set up automated QA testing for all character chat sites with email verification and full user journey testing.

## 🎯 What This Automates

Your entire manual QA checklist across **all 11 character domains**:

✅ **Full User Journey**: New user signup → Email verification → Chat testing → Subscription purchase → NSFW testing  
✅ **Email Integration**: Real email verification with temporary emails  
✅ **Payment Testing**: Stripe test mode integration  
✅ **Voice Testing**: Voice message playback and credit tracking  
✅ **Responsive Testing**: Mobile and desktop viewport testing  
✅ **Spicy Mode Testing**: NSFW toggle and styling verification  
✅ **Cross-Domain Testing**: All 11 character sites in one run  

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **NPM** or **Yarn**
3. **Playwright** browsers

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
# Install Playwright and email services
npm install playwright node-fetch imapflow

# Install Playwright browsers
npx playwright install
```

### 2. Environment Setup

Create a `.env.testing` file in your project root:

```env
# Email Testing Configuration
EMAIL_PROVIDER=tempmail          # Options: tempmail, 10minutemail, gmail
TEST_EMAIL_PREFIX=claude-qa      # Prefix for generated emails
TEST_PASSWORD=TestPassword123!   # Default test password

# Stripe Testing
STRIPE_TEST_MODE=true
STRIPE_TEST_CARD=4242424242424242

# Browser Configuration  
QA_HEADLESS=false               # Set to true for CI/background testing
QA_SLOW_MO=1000                 # Milliseconds between actions
QA_TIMEOUT=30000                # Default timeout in ms

# Test Configuration
QA_SKIP_EMAIL_VERIFICATION=false   # Skip email verification for faster testing
QA_TAKE_SCREENSHOTS=true          # Capture screenshots on failures
QA_VIDEO_RECORD=false             # Record test videos
```

## 🎮 Usage

### Test a Single Domain

```bash
# Test just one character site
node scripts/simple-qa-runner.js chatwithlexi.com
node scripts/simple-qa-runner.js fuckboychase.com
node scripts/simple-qa-runner.js talktonyx.com
```

### Test All Domains

```bash
# Run complete QA across all 11 character sites
node scripts/simple-qa-runner.js --all
```

### Advanced Testing

```bash
# Full email verification testing
node scripts/comprehensive-qa-automation.js

# Test specific features only
node scripts/simple-qa-runner.js chatwithlexi.com --steps="chat,paywall,signup"

# Headless mode for CI
QA_HEADLESS=true node scripts/simple-qa-runner.js --all
```

## 📊 Test Reports

After each run, you'll get:

- **Console Report**: Real-time progress and results
- **JSON Report**: `qa-report-[timestamp].json` with detailed data
- **Screenshots**: Captured on failures (if enabled)
- **Performance Metrics**: Timing data for each step

### Sample Report Output

```
🎭 CHATWITHLEXI.COM ✅
   Duration: 45.2s
   Steps: 7/7
     ✅ Navigate to site
     ✅ Start conversation  
     ✅ Reach message limit
     ✅ Test signup flow
     ✅ Check email verification
     ✅ Test dashboard
     ✅ Test responsive design

📈 SUMMARY:
   Total Sites: 11
   Successful: 10 ✅
   Failed: 1 ❌
   Success Rate: 90.9%
```

## 🔧 Configuration Options

### Email Services

**Option 1: Temporary Email (Recommended)**
- Uses 1secmail.com or similar services
- No setup required
- Emails auto-delete after testing
- Perfect for automated testing

**Option 2: Gmail Integration** 
- Requires Gmail API setup
- More reliable but needs configuration
- Good for production CI/CD

**Option 3: Mailosaur (Professional)**
- Paid service with robust API
- Best for enterprise testing
- Requires API key

### Browser Configuration

```javascript
// In your test script
const CONFIG = {
  headless: false,        // Show browser during testing
  slowMo: 1000,          // Slow down for visibility
  viewport: { width: 1280, height: 720 },
  
  // Capture evidence
  screenshots: true,
  videoRecord: false,
  
  // Test data
  testUser: {
    email: 'auto-generated',
    password: 'TestPassword123!',
    name: 'Claude QA Test'
  }
};
```

## 🧪 Test Scenarios Covered

### 1. **New User Journey**
- Navigate to character site
- Start conversation with bot
- Hit free message limit
- Sign up for account
- Verify email address
- Complete onboarding

### 2. **Subscription Flow**
- Purchase SFW subscription
- Test Stripe checkout (test mode)
- Verify subscription activation
- Test unlimited messaging
- Check dashboard shows correct plan

### 3. **Voice Features**
- Play voice messages
- Verify credit deduction
- Test credit purchase flow
- Exhaust credits and test prompts

### 4. **NSFW Testing**
- Purchase NSFW upgrade
- Toggle NSFW mode
- Verify spicy styling activation
- Test explicit chat responses
- Verify character personality consistency

### 5. **Relationship Tracking**
- Send multiple messages
- Check relationship score increases
- Verify selfie triggers (if applicable)
- Test relationship milestones

### 6. **Cross-Platform Testing**
- Desktop viewport testing
- Mobile responsive design
- Touch interaction verification
- Performance on different screen sizes

## 🚨 Important Notes

### Stripe Testing
- **Only uses test cards** (4242424242424242)
- **Never processes real payments**
- **Requires Stripe test mode** to be enabled
- Test webhooks work in test environment

### Email Verification
- Uses **temporary/disposable emails**
- **Real email verification links** are clicked
- Emails are **automatically deleted** after testing
- **No spam** to real email accounts

### Rate Limiting
- Tests include **automatic delays** between actions
- **Respects API rate limits** 
- **Won't overload** your servers
- Configurable **concurrency limits**

### Data Cleanup
- **No persistent test data** left behind
- Test accounts are **temporary**
- **Screenshots/videos** can be auto-deleted
- **Clean state** after each test run

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: QA Testing
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  push:
    branches: [main]

jobs:
  qa-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          npx playwright install --with-deps
      
      - name: Run QA Tests
        env:
          QA_HEADLESS: true
          QA_TIMEOUT: 60000
        run: node scripts/simple-qa-runner.js --all
      
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: qa-reports
          path: qa-report-*.json
```

## 🛠️ Troubleshooting

### Common Issues

**"Browser not found"**
```bash
npx playwright install
```

**"Email verification timeout"**
```bash
# Increase timeout in config
QA_TIMEOUT=60000 node scripts/simple-qa-runner.js
```

**"Stripe checkout failed"**
```bash
# Ensure test mode is enabled in your Stripe dashboard
# Check that test webhooks are configured
```

**"Page load timeout"**
```bash
# Check if site is accessible
curl -I https://chatwithlexi.com

# Try with increased timeout
QA_TIMEOUT=45000 node scripts/simple-qa-runner.js
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=true node scripts/simple-qa-runner.js chatwithlexi.com

# Show browser for debugging
QA_HEADLESS=false QA_SLOW_MO=2000 node scripts/simple-qa-runner.js
```

## 📈 Advanced Features

### Custom Test Scenarios

```javascript
// Add custom test step
await qa.step('Custom Feature Test', async () => {
  // Your custom testing logic
  await page.click('[data-testid="custom-feature"]');
  const result = await page.textContent('.result');
  return { customResult: result };
}, result);
```

### Parallel Testing

```bash
# Test multiple domains simultaneously
node scripts/parallel-qa-runner.js --domains="chatwithlexi.com,fuckboychase.com,talktonyx.com" --concurrent=3
```

### Performance Monitoring

```javascript
// Built-in performance metrics
const metrics = await page.evaluate(() => performance.getEntriesByType('navigation')[0]);
console.log('Page load time:', metrics.loadEventEnd - metrics.fetchStart);
```

---

## 🎉 Ready to Run!

Your automated QA testing is now set up! This will save you hours of manual testing while providing more comprehensive coverage than manual testing alone.

```bash
# Start with a single domain test
node scripts/simple-qa-runner.js chatwithlexi.com

# When ready, test everything
node scripts/simple-qa-runner.js --all
```

The system will handle email verification, payment testing, and comprehensive user journey validation automatically across all your character domains. 🚀