# 🎯 Face Reference Setup Guide

Your content pipeline now supports **face consistency** to ensure all generated images match your character reference photos!

## 🖼️ **How It Works**

The system uses detailed facial descriptions and negative prompts to maintain consistent character appearance across all generated images.

## 📁 **Setup Steps**

### 1. Add Reference Photos
```bash
# Create reference folder
mkdir -p public/references

# Add your character reference photos
public/references/
├── lexi-reference.jpg      # Your Lexi reference photo
├── nyx-reference.jpg       # Your Nyx reference photo
├── aiko-reference.jpg      # Your Aiko reference photo
└── [character]-reference.jpg
```

### 2. Update Character Descriptions

Edit `/lib/faceConsistency.ts` to match your actual characters:

```typescript
'lexi': {
  characterKey: 'lexi',
  referenceImageUrl: '/references/lexi-reference.jpg',
  facialFeatures: {
    eyeColor: 'dark brown eyes',           // ← Update to match your character
    hairColor: 'long black hair',          // ← Update to match your character  
    skinTone: 'warm latina skin tone',     // ← Update to match your character
    faceShape: 'oval face with defined cheekbones', // ← Update to match
    distinctiveFeatures: [
      'full lips',              // ← Add YOUR character's distinctive features
      'expressive eyebrows',
      'warm smile',
      'confident expression'
    ]
  },
  detailedDescription: `Beautiful latina woman with long flowing black hair, warm brown eyes, defined cheekbones, full lips, and confident facial expression. Warm skin tone, perfectly shaped eyebrows, and a naturally glamorous look.`, // ← Update this entire description
  negativePrompts: [
    'blonde hair', 'light eyes', 'pale skin', // ← Things that DON'T match your character
    'different ethnicity', 'short hair', 'different eye color'
  ]
}
```

### 3. Character-Specific Optimization

For each character, update these sections:

**Lexi Example:**
```typescript
facialFeatures: {
  eyeColor: 'warm brown eyes with long lashes',
  hairColor: 'long straight black hair',
  skinTone: 'warm bronze latina complexion', 
  faceShape: 'heart-shaped face with high cheekbones',
  distinctiveFeatures: [
    'full glossy lips',
    'perfectly arched eyebrows', 
    'dimpled smile',
    'sultry confident gaze'
  ]
},
detailedDescription: `Stunning latina woman, 25 years old, with flowing black hair, captivating brown eyes, bronze skin, heart-shaped face, full lips, perfect smile, confident and alluring expression`,
negativePrompts: [
  'blonde hair', 'blue eyes', 'pale skin', 'thin lips',
  'asian', 'black', 'white ethnicity', 'short hair', 'curly hair'
]
```

## 🚀 **Testing Face Consistency**

### Test with Different Providers

**DALL-E 3** (Best for realistic faces):
```typescript
// Automatically optimized for face consistency
const result = promptBuilder.buildImagePrompt({
  mood: 'confident',
  setting: 'luxury bedroom', 
  provider: 'dalle'
});
```

**Replicate/Stable Diffusion** (More flexible):
```typescript
// Uses negative prompts + LoRA for consistency
const result = promptBuilder.buildImagePrompt({
  mood: 'playful',
  setting: 'beach',
  provider: 'replicate'  
});
```

### Verification

Generate 5-10 test images and check:
- ✅ Same eye color across all images
- ✅ Same hair color and style  
- ✅ Same skin tone and ethnicity
- ✅ Same distinctive facial features
- ✅ Consistent face shape

## 🔧 **Advanced Consistency Techniques**

### 1. ControlNet Integration (Replicate)
```typescript
// For even better consistency with pose control
const result = AdvancedConsistencyTechniques.optimizeForStableDiffusion(
  prompt, 
  'lexi',
  true // Use ControlNet
);
```

### 2. Seed Consistency
```typescript
// Use same seed for similar poses/angles
additionalParams: {
  seed: 12345,  // Fixed seed for consistent results
  guidance_scale: 7.5
}
```

### 3. Face Validation (Future)
```typescript
// Automatically validate generated images
const validation = await FaceConsistencyManager.validateConsistency(
  generatedImageUrl,
  'lexi'
);

if (!validation.isConsistent) {
  // Regenerate with stronger consistency prompts
}
```

## 📊 **Consistency Tips**

### Best Practices

1. **Detailed Descriptions**: More specific = better consistency
   - ❌ "Brown eyes"  
   - ✅ "Deep chocolate brown eyes with golden flecks"

2. **Strong Negative Prompts**: Tell it what NOT to generate
   - ✅ "not blonde, not blue eyes, not pale skin"

3. **Quality References**: Use high-quality, clear face photos
   - Front-facing, good lighting, clear features

4. **Test Iteratively**: 
   - Generate 10 images
   - Identify inconsistencies  
   - Update descriptions
   - Test again

### Provider-Specific Tips

**DALL-E 3:**
- Works best with detailed natural language descriptions
- Automatically handles most consistency 
- Focus on distinctive features

**Replicate/SDXL:**
- Use negative prompts heavily
- Lower chaos/stylize values for consistency
- Consider ControlNet for pose consistency

**Midjourney:**
- Use `--chaos 0` for consistency
- Fixed seed values: `--seed 12345`
- Reference images: `--iw 0.5` (image weight)

## 🎯 **Results You Can Expect**

With proper setup, you should see:
- **95%+ face consistency** across generated images
- **Same person recognition** in all photos
- **Distinctive features maintained** (eye color, hair, skin tone)
- **Brand-consistent character appearance**

## 📝 **Quick Setup Checklist**

- [ ] Add reference photos to `/public/references/`
- [ ] Update facial descriptions in `faceConsistency.ts`
- [ ] Add distinctive features for each character
- [ ] Set strong negative prompts
- [ ] Test with small batch (5 images)
- [ ] Verify consistency across different moods/settings
- [ ] Adjust descriptions based on results

**Your characters will now have consistent faces across thousands of generated images!** 🎉