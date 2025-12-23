# Midjourney Manual Workflow Setup

## ✅ **What's Already Done**

The system now provides **DALL-E automation + Midjourney prompts** for manual comparison:

- ✅ **DALL-E as primary** - automated generation continues working
- ✅ **Midjourney prompt output** - optimized prompts logged for manual use
- ✅ **Character reference integration** - prompts include `--cref` URLs
- ✅ **Same admin panel** - works with existing queue system
- ✅ **Best of both worlds** - automation + manual quality comparison

## 🔧 **Setup Required**

### 1. Upload Character Reference Images (Only Step Needed)
Create these files in your public directory:
```
public/references/
├── nyx/nyx-reference.jpg        # The best reference photo of Nyx
├── lexi/lexi-reference.jpg      # The best reference photo of Lexi  
├── aiko/aiko-reference.jpg      # etc...
├── dom/dom-reference.jpg
└── chase/chase-reference.jpg
```

**Reference Image Requirements:**
- Clear, high-quality face shot
- Good lighting, front-facing
- 1024px+ resolution
- Shows the character's face clearly

## 🎯 **How It Works**

When generating images for Nyx, the system will:

1. **Generate DALL-E image** automatically (for the queue)
2. **Output Midjourney prompt** in console logs for manual use
3. **You copy/paste** the optimized prompt into Midjourney Discord
4. **Compare results** and use the best images in your selfie bank

**Example Console Output:**
```
🎯 MIDJOURNEY PROMPT FOR MANUAL USE:
📋 in beach setting, black dress --cref https://chatwithlexi.com/references/nyx/nyx-reference.jpg --cw 100 --v 6.1 --style raw --ar 1:1 --q 1
✂️ Copy this to Midjourney for comparison!
```

## 🚀 **Workflow**

1. **Queue processes automatically** with DALL-E (keeps working)
2. **Check console logs** for Midjourney prompts
3. **Copy prompts to Midjourney** manually when you want better quality
4. **Compare results** and choose the best images
5. **Upload winners** to your selfie bank

## ✅ **Benefits of This Approach**

- ✅ **No automation risk** with Midjourney TOS
- ✅ **DALL-E keeps working** for basic automation  
- ✅ **Perfect Midjourney prompts** ready to copy/paste
- ✅ **Character reference URLs** automatically included
- ✅ **Best of both worlds** - speed + quality options

## 🧪 **Testing**

Process the queue and watch console logs:
```bash
curl -X POST "http://localhost:3000/api/content/process" \
  -d '{"action": "process_queue"}'
```

You'll see both DALL-E generation AND Midjourney prompts ready for manual use! 🎉