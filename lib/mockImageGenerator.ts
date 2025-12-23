// lib/mockImageGenerator.ts
// Mock Image Generator for Testing Pipeline

export interface MockImageGenerationResult {
  success: boolean;
  urls: string[];
  revisedPrompt?: string;
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    cost?: number;
    generationTime?: number;
  };
}

export class MockImageGenerator {
  async generateImage(prompt: string, characterKey: string): Promise<MockImageGenerationResult> {
    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Use high-quality reference images from the local references folder
    // These are permanent URLs that won't expire and match the quality standards
    const referenceImages = {
      'lexi': [
        '/references/lexi/lexi-01.png',
        '/references/lexi/lexi-02.png', 
        '/references/lexi/lexi-03.png',
        '/references/lexi/lexi-04.png'
      ],
      'nyx': [
        '/references/nyx/nyx-01.jpg',
        '/references/nyx/nyx-02.jpg',
        '/references/nyx/nyx-03.jpg',
        '/references/nyx/nyx-04.jpg'
      ],
      'aiko': [
        '/references/aiko/aiko-01.jpg',
        '/references/aiko/aiko-02.jpg',
        '/references/aiko/aiko-03.jpg',
        '/references/aiko/aiko-04.jpg'
      ],
      'default': [
        '/references/lexi/lexi-01.png',
        '/references/lexi/lexi-02.png'
      ]
    };
    
    const characterImages = referenceImages[characterKey as keyof typeof referenceImages] || referenceImages.default;
    const selectedImage = characterImages[Math.floor(Math.random() * characterImages.length)];
    
    // 95% success rate for testing
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        urls: [selectedImage],
        revisedPrompt: `Mock generated image for ${characterKey}: ${prompt.substring(0, 50)}...`,
        metadata: {
          provider: 'mock',
          model: 'test-generator-v1',
          cost: 0.001, // Fake cost for testing
          generationTime: 2000 + Math.random() * 3000
        }
      };
    } else {
      return {
        success: false,
        urls: [],
        error: 'Mock generation failure (5% chance for testing error handling)'
      };
    }
  }
}