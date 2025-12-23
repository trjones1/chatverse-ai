// lib/faceConsistency.ts
// Face Reference and Consistency System

export interface FaceReference {
  characterKey: string;
  referenceImageUrls: string[]; // Support multiple reference photos
  primaryReferenceUrl: string; // Main reference for display
  facialFeatures: {
    eyeColor: string;
    hairColor: string;
    skinTone: string;
    faceShape: string;
    distinctiveFeatures: string[];
  };
  detailedDescription: string;
  negativePrompts: string[]; // What to avoid
  consistencyStrength: 'light' | 'medium' | 'strong'; // How aggressive to be with consistency
}

export class FaceConsistencyManager {
  
  // Character face references - add your reference photos here
  private static readonly FACE_REFERENCES: Record<string, FaceReference> = {
    'lexi': {
      characterKey: 'lexi',
      referenceImageUrls: [
        '/references/lexi/lexi-01.png', // Primary reference (PNG supported)
        '/references/lexi/lexi-02.png', // Alternative angles
        '/references/lexi/lexi-03.png', // Different expressions
        '/references/lexi/lexi-04.png'  // Additional stability
      ],
      primaryReferenceUrl: '/references/lexi/lexi-01.png',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'dark brown eyes',
        hairColor: 'long black hair',
        skinTone: 'warm latina skin tone',
        faceShape: 'oval face with defined cheekbones',
        distinctiveFeatures: [
          'full lips',
          'expressive eyebrows',
          'warm smile',
          'confident expression'
        ]
      },
      detailedDescription: `Beautiful latina woman with long flowing black hair, warm brown eyes, defined cheekbones, full lips, and confident facial expression. Warm skin tone, perfectly shaped eyebrows, and a naturally glamorous look.`,
      negativePrompts: [
        'blonde hair', 'light eyes', 'pale skin', 'thin lips', 
        'different ethnicity', 'short hair', 'different eye color'
      ]
    },
    
    'nyx': {
      characterKey: 'nyx',
      referenceImageUrls: [
        '/references/nyx/nyx-01.png',
        '/references/nyx/nyx-02.png', 
        '/references/nyx/nyx-03.png',
        '/references/nyx/nyx-04.png'
      ],
      primaryReferenceUrl: '/references/nyx/nyx-01.png',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'dark mysterious eyes',
        hairColor: 'black hair with possible colored streaks',
        skinTone: 'pale to fair skin',
        faceShape: 'angular with sharp features',
        distinctiveFeatures: [
          'intense gaze',
          'defined jawline',
          'mysterious expression',
          'sharp cheekbones'
        ]
      },
      detailedDescription: `Gothic beautiful woman with dark hair, pale skin, intense dark eyes, sharp facial features, defined jawline, and mysterious alluring expression. Angular face shape with prominent cheekbones.`,
      negativePrompts: [
        'warm skin tone', 'soft features', 'bright eyes', 'cheerful expression',
        'blonde hair', 'round face', 'different ethnicity'
      ]
    },
    
    'aiko': {
      characterKey: 'aiko',
      referenceImageUrls: [
        '/references/aiko/aiko-01.jpg',
        '/references/aiko/aiko-02.jpg',
        '/references/aiko/aiko-03.jpg',
        '/references/aiko/aiko-04.jpg'
      ],
      primaryReferenceUrl: '/references/aiko/aiko-01.jpg',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'large expressive brown or dark eyes',
        hairColor: 'colorful hair (pink, blue, purple variations)',
        skinTone: 'fair asian skin tone',
        faceShape: 'round cute face',
        distinctiveFeatures: [
          'large anime-style eyes',
          'cute small nose',
          'sweet smile',
          'youthful appearance'
        ]
      },
      detailedDescription: `Cute asian woman with anime-inspired features, large expressive eyes, colorful hair, fair skin, round face, sweet smile, and youthful kawaii appearance.`,
      negativePrompts: [
        'mature features', 'dark hair only', 'small eyes', 'serious expression',
        'different ethnicity', 'angular face', 'heavy makeup'
      ]
    },

    'dom': {
      characterKey: 'dom',
      referenceImageUrls: [
        '/references/dom/dom-01.jpg',
        '/references/dom/dom-02.jpg',
        '/references/dom/dom-03.jpg',
        '/references/dom/dom-04.jpg'
      ],
      primaryReferenceUrl: '/references/dom/dom-01.jpg',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'intense dark eyes',
        hairColor: 'dark well-groomed hair',
        skinTone: 'masculine strong jawline',
        faceShape: 'angular masculine face',
        distinctiveFeatures: [
          'strong jawline',
          'intense gaze',
          'confident expression',
          'masculine features'
        ]
      },
      detailedDescription: `Handsome masculine man with dark hair, intense eyes, strong angular jawline, confident dominant expression, and sophisticated mature appearance.`,
      negativePrompts: [
        'feminine features', 'soft jawline', 'light eyes', 'boyish appearance',
        'long hair', 'weak chin', 'submissive expression'
      ]
    },

    'chase': {
      characterKey: 'chase',
      referenceImageUrls: [
        '/references/chase/chase-01.jpg',
        '/references/chase/chase-02.jpg',
        '/references/chase/chase-03.jpg',
        '/references/chase/chase-04.jpg'
      ],
      primaryReferenceUrl: '/references/chase/chase-01.jpg',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'piercing eyes',
        hairColor: 'tousled dark hair',
        skinTone: 'rugged masculine complexion',
        faceShape: 'strong angular face',
        distinctiveFeatures: [
          'rebellious smirk',
          'strong cheekbones',
          'edgy confident look',
          'bad boy charm'
        ]
      },
      detailedDescription: `Handsome bad boy with tousled dark hair, piercing eyes, strong cheekbones, rebellious smirk, and confident edgy masculine appearance.`,
      negativePrompts: [
        'clean-cut appearance', 'formal look', 'soft features', 'innocent expression',
        'business attire', 'conservative style'
      ]
    },

    'zaria': {
      characterKey: 'zaria',
      referenceImageUrls: [
        '/references/zaria/zaria-01.jpg',
        '/references/zaria/zaria-02.jpg',
        '/references/zaria/zaria-03.jpg',
        '/references/zaria/zaria-04.jpg'
      ],
      primaryReferenceUrl: '/references/zaria/zaria-01.jpg',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'elegant sophisticated eyes',
        hairColor: 'luxurious styled hair',
        skinTone: 'flawless elegant complexion',
        faceShape: 'refined aristocratic features',
        distinctiveFeatures: [
          'high cheekbones',
          'elegant posture',
          'sophisticated expression',
          'luxury aesthetic'
        ]
      },
      detailedDescription: `Sophisticated elegant woman with luxurious hair, refined features, high cheekbones, flawless complexion, and aristocratic sophisticated appearance.`,
      negativePrompts: [
        'casual appearance', 'messy hair', 'simple style', 'common look',
        'budget aesthetic', 'informal expression'
      ]
    },

    'chloe': {
      characterKey: 'chloe',
      referenceImageUrls: [
        '/references/chloe/chloe-01.jpg',
        '/references/chloe/chloe-02.jpg',
        '/references/chloe/chloe-03.jpg',
        '/references/chloe/chloe-04.jpg'
      ],
      primaryReferenceUrl: '/references/chloe/chloe-01.jpg',
      consistencyStrength: 'strong',
      facialFeatures: {
        eyeColor: 'soft gentle eyes',
        hairColor: 'soft flowing hair',
        skinTone: 'gentle fair complexion',
        faceShape: 'soft round feminine face',
        distinctiveFeatures: [
          'gentle smile',
          'soft features',
          'cozy aesthetic',
          'innocent expression'
        ]
      },
      detailedDescription: `Sweet soft girl with flowing hair, gentle eyes, soft round face, innocent smile, and cozy feminine aesthetic appearance.`,
      negativePrompts: [
        'harsh features', 'edgy style', 'dark aesthetic', 'aggressive expression',
        'bold makeup', 'sharp angles'
      ]
    }
  };

  // Enhanced prompt generation with face consistency
  static generateConsistentPrompt(
    basePrompt: string, 
    characterKey: string, 
    includeReference: boolean = true
  ): string {
    const reference = this.FACE_REFERENCES[characterKey];
    
    if (!reference) {
      console.warn(`No face reference found for character: ${characterKey}`);
      return basePrompt;
    }

    // Build consistent character description
    const faceDescription = reference.detailedDescription;
    const features = reference.facialFeatures;
    const strength = reference.consistencyStrength;
    
    // Base consistency terms
    let consistencyTerms = [
      'consistent character design',
      'same person',
      'character consistency'
    ];

    // Add strength-based terms
    if (strength === 'strong') {
      consistencyTerms.push(
        'exact same face',
        'identical facial features',
        'perfect character match',
        'multiple reference consistency'
      );
    } else if (strength === 'medium') {
      consistencyTerms.push(
        'similar facial structure',
        'consistent features'
      );
    }
    
    // Combine base prompt with face consistency
    const enhancedPrompt = [
      basePrompt,
      faceDescription,
      // Add specific facial features for extra consistency
      `${features.eyeColor}, ${features.hairColor}, ${features.skinTone}`,
      // Add distinctive features
      reference.facialFeatures.distinctiveFeatures.join(', '),
      // Consistency modifiers
      ...consistencyTerms,
      // Quality modifiers
      'professional photography',
      '8K resolution',
      'perfect facial features'
    ].join(', ');

    return enhancedPrompt;
  }

  // Get random reference photo for variation while maintaining consistency
  static getRandomReferenceUrl(characterKey: string): string | null {
    const reference = this.FACE_REFERENCES[characterKey];
    if (!reference) return null;
    
    const randomIndex = Math.floor(Math.random() * reference.referenceImageUrls.length);
    return reference.referenceImageUrls[randomIndex];
  }

  // Get all reference URLs for a character (useful for validation)
  static getAllReferenceUrls(characterKey: string): string[] {
    const reference = this.FACE_REFERENCES[characterKey];
    return reference ? reference.referenceImageUrls : [];
  }

  // Generate negative prompt for consistency
  static generateNegativePrompt(characterKey: string): string {
    const reference = this.FACE_REFERENCES[characterKey];
    
    if (!reference) return '';
    
    const negativePrompts = [
      ...reference.negativePrompts,
      // General consistency negatives
      'different person',
      'inconsistent character',
      'wrong face',
      'different facial features',
      'multiple people',
      'face swap',
      'different ethnicity than reference'
    ];

    return negativePrompts.join(', ');
  }

  // Get reference data for character
  static getFaceReference(characterKey: string): FaceReference | null {
    return this.FACE_REFERENCES[characterKey] || null;
  }

  // Add or update face reference
  static addFaceReference(reference: FaceReference): void {
    this.FACE_REFERENCES[reference.characterKey] = reference;
  }

  // Validate image consistency (for future AI validation)
  static async validateConsistency(
    generatedImageUrl: string, 
    characterKey: string
  ): Promise<{
    isConsistent: boolean;
    confidence: number;
    issues: string[];
  }> {
    // This would integrate with face recognition APIs like:
    // - Azure Face API
    // - AWS Rekognition
    // - Google Vision API
    // For now, return optimistic result
    
    return {
      isConsistent: true,
      confidence: 0.95,
      issues: []
    };
  }
}

// Advanced consistency techniques for different AI providers
export class AdvancedConsistencyTechniques {
  
  // DALL-E 3 specific consistency techniques
  static optimizeForDallE(prompt: string, characterKey: string): string {
    const reference = FaceConsistencyManager.getFaceReference(characterKey);
    if (!reference) return prompt;

    // DALL-E 3 works well with detailed descriptions
    return FaceConsistencyManager.generateConsistentPrompt(prompt, characterKey) + 
           ', photorealistic portrait, studio lighting, consistent character design';
  }

  // Stable Diffusion / Replicate techniques with multi-reference support
  static optimizeForStableDiffusion(
    prompt: string, 
    characterKey: string,
    useControlNet: boolean = false,
    useMultiReference: boolean = true
  ): {
    prompt: string;
    negativePrompt: string;
    additionalParams?: any;
    referenceImage?: string;
  } {
    const enhancedPrompt = FaceConsistencyManager.generateConsistentPrompt(prompt, characterKey);
    const negativePrompt = FaceConsistencyManager.generateNegativePrompt(characterKey);
    const reference = FaceConsistencyManager.getFaceReference(characterKey);
    
    let consistencyPrompt = enhancedPrompt;
    
    // Add multi-reference specific terms for Stable Diffusion
    if (useMultiReference && reference) {
      const multiRefTerms = [
        'multiple reference consistency',
        'face identity preservation', 
        'character face lock',
        'identity coherence'
      ];
      
      if (reference.consistencyStrength === 'strong') {
        multiRefTerms.push(
          'exact facial replication',
          'identical face structure',
          'perfect identity match'
        );
      }
      
      consistencyPrompt += ', ' + multiRefTerms.join(', ');
      consistencyPrompt += ', lora:character_consistency:0.9'; // Higher strength for multi-ref
    } else {
      consistencyPrompt += ', lora:character_consistency:0.8';
    }
    
    const additionalParams: any = {
      guidance_scale: useMultiReference ? 8.5 : 7.5, // Higher guidance for consistency
      num_inference_steps: 60, // More steps for better consistency
      seed: null,
      // Multi-reference specific params
      ...(useMultiReference && {
        clip_skip: 2,
        cfg_scale: 8.5,
      })
    };

    if (useControlNet) {
      additionalParams.controlnet_conditioning_scale = 0.9; // Higher for multi-ref consistency
      additionalParams.control_guidance_start = 0.0;
      additionalParams.control_guidance_end = 0.8; // Reduce towards end to allow some variation
    }

    const result = {
      prompt: consistencyPrompt,
      negativePrompt: negativePrompt + ', face morphing, identity drift, inconsistent features',
      additionalParams,
      // Return a random reference for potential ControlNet use
      referenceImage: useControlNet ? FaceConsistencyManager.getRandomReferenceUrl(characterKey) || undefined : undefined
    };

    return result;
  }

  // Midjourney specific techniques
  static optimizeForMidjourney(prompt: string, characterKey: string): string {
    const consistentPrompt = FaceConsistencyManager.generateConsistentPrompt(prompt, characterKey);
    
    // Midjourney specific parameters for consistency
    return `${consistentPrompt} --style raw --quality 2 --stylize 100 --chaos 0 --seed 12345`;
  }
}

// Integration with existing prompt builder
export class ConsistentPromptBuilder {
  
  static buildImagePrompt(params: {
    characterKey: string;
    basePrompt: string;
    mood?: string;
    setting?: string;
    activity?: string;
    provider?: 'dalle' | 'replicate' | 'midjourney';
  }): {
    prompt: string;
    negativePrompt?: string;
    metadata: any;
  } {
    const { characterKey, basePrompt, mood, setting, activity, provider = 'dalle' } = params;
    
    // Build enhanced prompt with all context
    let fullPrompt = basePrompt;
    if (mood) fullPrompt += `, ${mood} mood`;
    if (setting) fullPrompt += `, ${setting} setting`;
    if (activity) fullPrompt += `, ${activity}`;
    
    // Apply consistency based on provider
    switch (provider) {
      case 'dalle':
        return {
          prompt: AdvancedConsistencyTechniques.optimizeForDallE(fullPrompt, characterKey),
          metadata: { provider, consistency: 'face_reference' }
        };
        
      case 'replicate':
        const sdResult = AdvancedConsistencyTechniques.optimizeForStableDiffusion(fullPrompt, characterKey);
        return {
          prompt: sdResult.prompt,
          negativePrompt: sdResult.negativePrompt,
          metadata: { 
            provider, 
            consistency: 'face_reference',
            additionalParams: sdResult.additionalParams 
          }
        };
        
      case 'midjourney':
        return {
          prompt: AdvancedConsistencyTechniques.optimizeForMidjourney(fullPrompt, characterKey),
          metadata: { provider, consistency: 'face_reference' }
        };
        
      default:
        return {
          prompt: FaceConsistencyManager.generateConsistentPrompt(fullPrompt, characterKey),
          metadata: { provider, consistency: 'basic' }
        };
    }
  }
}