# 🎨 AI Image Generation Setup Guide

Your automated content pipeline is ready! Here's how to connect real AI image generators.

## 🔧 Quick Setup

### 1. Add API Keys to `.env.local`

```bash
# OpenAI DALL-E 3 (Recommended - Highest Quality)
OPENAI_API_KEY=sk-your-openai-api-key

# Replicate (Alternative Models - Good for NSFW)
REPLICATE_API_TOKEN=r8_your-replicate-token

# Midjourney (Optional - Via 3rd Party Service)
MIDJOURNEY_API_KEY=your-midjourney-api-key
MIDJOURNEY_API_URL=https://api.your-midjourney-service.com

# Enable automated processing
AUTO_PROCESS_QUEUE=true
```

### 2. Install Additional Dependencies (if needed)

```bash
# OpenAI is already installed
# Add Replicate if you want more models
npm install replicate
```

## 🚀 How to Use

### Option 1: Admin Interface
1. Go to `http://localhost:3009/admin`
2. Navigate to "Content Pipeline Manager"
3. Click "Initialize All Character Bibles" 
4. Click "Generate 2-Week Batch" for automatic generation
5. Processing happens in background automatically

### Option 2: Manual Processing
```bash
# Process the entire queue
npm run content:process-queue

# Or call the API directly
curl -X POST "http://localhost:3009/api/content/process" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_queue"}'
```

### Option 3: Automated Cron Job
```bash
# Add to your crontab to process every 30 minutes
*/30 * * * * cd /path/to/your/app && npm run content:process-queue

# Or every hour at minute 0
0 * * * * cd /path/to/your/app && npm run content:process-queue
```

## 💰 Provider Comparison

### DALL-E 3 (OpenAI) - **RECOMMENDED**
- ✅ Highest quality and most realistic images
- ✅ Best safety filters for content policy compliance  
- ✅ Excellent prompt following
- ✅ Consistent character appearance
- 💰 Cost: $0.040-$0.120 per image
- ⚠️ Content policy restrictions (good for SFW content)

**Best for**: High-quality SFW content, professional photos, consistent branding

### Replicate (Multiple Models) - **GOOD FOR NSFW**
- ✅ Multiple model options (Flux, SDXL, Realistic Vision)
- ✅ More permissive content policies
- ✅ Lower cost than DALL-E
- ✅ Good for adult content
- 💰 Cost: $0.0023-$0.05 per image
- ⚠️ Variable quality depending on model

**Best for**: NSFW content, bulk generation, experimentation

### Midjourney (Via 3rd Party) - **ARTISTIC**
- ✅ Best artistic and stylized images
- ✅ Unique aesthetic styles
- 💰 Cost: ~$0.10 per image (via API services)
- ⚠️ Requires 3rd party service (UseAPI, GoAPI, etc.)
- ⚠️ Less realistic than DALL-E

**Best for**: Artistic content, unique styles, creative posts

## 🎯 Recommended Setup Strategy

### For SFW Characters (Lexi, Aiko, etc.)
```env
OPENAI_API_KEY=your-key
# Primary: DALL-E 3 for high-quality, compliant content
```

### For NSFW Characters (Nyx, Dom, etc.)
```env
REPLICATE_API_TOKEN=your-token
# Primary: Replicate with Realistic Vision or Flux models
```

### For Maximum Coverage
```env
OPENAI_API_KEY=your-openai-key
REPLICATE_API_TOKEN=your-replicate-token
# Fallback system: Tries DALL-E first, falls back to Replicate
```

## 📊 Monitoring & Analytics

### Check Processing Status
```bash
# Get current stats
curl -X GET "http://localhost:3009/api/content/process"

# View processing stats in admin interface
# Go to /admin → Content Pipeline Manager → Queue tab
```

### Key Metrics to Track
- **Success Rate**: Should be >90% 
- **Processing Time**: 30-120 seconds per image
- **Cost Per Image**: Track spending across providers
- **Queue Backlog**: Keep under 50 pending items

## 🛠️ Troubleshooting

### Common Issues

**"All image generation providers failed"**
- Check API keys are set correctly
- Verify account has sufficient credits
- Check rate limits haven't been exceeded

**Images not generating**
- Check `AUTO_PROCESS_QUEUE=true` is set
- Manually trigger: `npm run content:process-queue`
- Check logs for specific error messages

**Poor image quality**
- Switch to DALL-E 3 for higher quality
- Adjust prompts in character bibles
- Increase quality settings in generator config

### Getting API Keys

**OpenAI (DALL-E 3)**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add credits to your account ($5+ recommended)

**Replicate** 
1. Go to https://replicate.com/account/api-tokens
2. Create new token
3. Add payment method for usage

**Midjourney (3rd Party)**
1. Choose service: UseAPI, GoAPI, ThenextLeg, etc.
2. Sign up and get API credentials
3. More complex setup - see service docs

## 🚀 Production Deployment

### Environment Setup
```env
# Production environment variables
NODE_ENV=production
ENABLE_ADMIN_TOOLS=true
AUTO_PROCESS_QUEUE=true

# Image generation providers
OPENAI_API_KEY=your-production-key
REPLICATE_API_TOKEN=your-production-token

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Recommended Cron Setup
```bash
# Process queue every 30 minutes
*/30 * * * * /usr/local/bin/node /app/scripts/process-content-queue.js >> /var/log/content-processing.log 2>&1

# Weekly batch generation (Sundays at 2 AM)
0 2 * * 0 curl -X PUT "https://yourdomain.com/api/content/schedule" -H "Content-Type: application/json" -d '{"character_keys":["lexi","nyx","aiko","dom","chase","zaria","chloe"],"weeks_ahead":2}'
```

## 💡 Pro Tips

1. **Start with DALL-E 3** for highest quality and safety
2. **Use Replicate for NSFW** content that DALL-E won't generate  
3. **Set up fallback chain** for maximum reliability
4. **Monitor costs closely** - can add up quickly at scale
5. **Test character prompts** manually before automation
6. **Batch generate** during off-peak hours for better rates

## 🎉 You're Ready!

Your automated content pipeline can now:
- ✅ Generate hundreds of unique character images 
- ✅ Process queue automatically in background
- ✅ Handle multiple characters with individual styles
- ✅ Scale to 11 characters without manual work
- ✅ Track costs and performance analytics

Just add your API keys and watch the content flow! 🚀