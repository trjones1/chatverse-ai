// lib/imageGenerators.ts
// AI Image Generation Service Integrations

import OpenAI from 'openai';
import { MockImageGenerator } from './mockImageGenerator';
import { StableDiffusionGenerator, StableDiffusionOptions } from './stableDiffusionGenerator';
import { faceAnalyzer } from './faceAnalysis';

export interface ImageGenerationRequest {
  prompt: string;
  characterKey: string;
  style?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  quality?: 'standard' | 'hd';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  count?: number;
  // Advanced face consistency options
  faceConsistencyMethod?: 'reference' | 'image-to-image' | 'multiple-selection' | 'all';
  faceConsistencyStrength?: number;
  generateMultiple?: number;
}

export interface ImageGenerationResult {
  success: boolean;
  urls: string[];
  revisedPrompt?: string;
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    cost?: number;
    generationTime?: number;
    faceConsistencyMethod?: string;
    faceSimilarityScore?: number;
    candidatesGenerated?: number;
    midjourneyPrompt?: string;
  };
}

// OpenAI DALL-E 3 Integration
export class DalleGenerator {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const timeout = 120000; // 2 minute timeout for DALL-E
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const startTime = Date.now();
      
      // DALL-E 3 specific optimizations
      const optimizedPrompt = this.optimizePromptForDalle(request.prompt, request.characterKey);
      
      console.log(`🎨 Starting DALL-E generation with ${timeout/1000}s timeout...`);
      
      // Also generate Midjourney prompt for manual comparison
      const midjourneyPrompt = this.generateMidjourneyPrompt(request.prompt, request.characterKey);
      console.log(`\n🎯 MIDJOURNEY PROMPT FOR MANUAL USE:`);
      console.log(`📋 ${midjourneyPrompt}`);
      console.log(`✂️ Copy this to Midjourney for comparison!\n`);
      
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: optimizedPrompt,
        n: 1, // DALL-E 3 only supports n=1
        size: request.size || "1024x1792", // Use higher resolution by default
        quality: "hd", // Always use HD quality
        style: "natural", // Natural style for photorealism
      }, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const generationTime = Date.now() - startTime;
      
      console.log(`✅ DALL-E generation completed in ${generationTime}ms`);

      return {
        success: true,
        urls: response.data?.map(img => img.url!) || [],
        revisedPrompt: response.data?.[0]?.revised_prompt,
        metadata: {
          provider: 'openai',
          model: 'dall-e-3',
          cost: this.calculateDalleCost(request.quality || 'hd', request.size || '1024x1024'),
          generationTime,
          midjourneyPrompt // Include for manual use
        }
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (controller.signal.aborted) {
        console.error(`❌ DALL-E generation timed out after ${timeout/1000}s`);
        return {
          success: false,
          urls: [],
          error: `Generation timed out after ${timeout/1000} seconds`
        };
      }
      
      console.error('❌ DALL-E generation error:', error);
      return {
        success: false,
        urls: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private optimizePromptForDalle(prompt: string, characterKey: string): string {
    // Character-specific facial features (this is the KEY part)
    const characterFaceTraits = this.getCharacterFaceTraits(characterKey);

    // Focus on photorealistic face consistency
    const faceConsistencyTerms = [
      'photorealistic portrait',
      'exact facial features match',
      'consistent face shape',
      'identical facial structure',
      'same person',
      'character consistency'
    ];

    // Technical quality without forcing style
    const qualityTerms = [
      'high resolution',
      'sharp focus',
      'professional photography',
      'detailed skin texture',
      'natural lighting'
    ];

    // Safety terms that don't override style
    const safetyTerms = [
      'tasteful',
      'artistic',
      'professional'
    ];

    return `${characterFaceTraits}, ${prompt}, ${faceConsistencyTerms.join(', ')}, ${qualityTerms.join(', ')}, ${safetyTerms.join(', ')}`;
  }

  private getCharacterFaceTraits(characterKey: string): string {
    // Character-specific facial feature descriptions for consistency
    const faceTraits: Record<string, string> = {
      'nyx': 'Beautiful woman with dark hair, pale skin, intense dark eyes, sharp facial features, defined jawline, mysterious expression, angular face shape with prominent cheekbones',
      'lexi': 'Beautiful latina woman with long flowing black hair, warm brown eyes, defined cheekbones, full lips, confident facial expression, warm skin tone, perfectly shaped eyebrows',
      'aiko': 'Beautiful asian woman with sleek black hair, almond-shaped eyes, delicate facial features, porcelain skin, gentle expression',
      'dom': 'Handsome man with strong jawline, intense eyes, masculine facial features',
      'chase': 'Attractive young man with confident expression, well-defined facial features'
    };

    return faceTraits[characterKey] || 'Beautiful person with consistent facial features';
  }

  private generateMidjourneyPrompt(prompt: string, characterKey: string): string {
    // Generate the Midjourney equivalent prompt for manual use
    const characterFaceTraits = this.getCharacterFaceTraits(characterKey);
    
    // Midjourney-specific optimizations with character reference
    const midjourneyOptimizations = [
      '--cref https://chatwithlexi.com/references/' + characterKey + '/' + characterKey + '-reference.jpg',
      '--cw 100', // Maximum character weight
      '--v 6.1', // Latest version
      '--style raw', // More photorealistic  
      '--ar 1:1', // Aspect ratio
      '--q 1' // Standard quality
    ];

    // Clean prompt for Midjourney (no face descriptions since we use --cref)
    const cleanPrompt = prompt;
    
    return `${cleanPrompt} ${midjourneyOptimizations.join(' ')}`;
  }

  private calculateDalleCost(quality: string, size: string): number {
    // DALL-E 3 pricing (as of 2024)
    const pricing = {
      'standard': {
        '1024x1024': 0.040,
        '1792x1024': 0.080,
        '1024x1792': 0.080
      },
      'hd': {
        '1024x1024': 0.080,
        '1792x1024': 0.120,
        '1024x1792': 0.120
      }
    };
    
    return pricing[quality as keyof typeof pricing]?.[size as keyof typeof pricing.standard] || 0.080;
  }
}


// Replicate Integration (for Flux, SDXL, and other models)
export class ReplicateGenerator {
  private apiKey: string;
  private baseUrl = 'https://api.replicate.com/v1';

  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }
    this.apiKey = process.env.REPLICATE_API_TOKEN;
  }

  async generateImage(request: ImageGenerationRequest, model: string = 'flux-pro'): Promise<ImageGenerationResult> {
    try {
      const startTime = Date.now();
      
      const modelVersions = {
        'flux-pro': 'black-forest-labs/flux-pro',
        'flux-dev': 'black-forest-labs/flux-dev',
        'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        'realistic-vision': 'SG161222/realistic_vision_v5.1_novatiaihub',
      };

      const selectedModel = modelVersions[model as keyof typeof modelVersions] || modelVersions['flux-dev'];
      
      // Create prediction
      const prediction = await this.createPrediction({
        version: selectedModel,
        input: {
          prompt: this.optimizePromptForReplicate(request.prompt, request.characterKey),
          width: parseInt(request.size?.split('x')[0] || '1024'),
          height: parseInt(request.size?.split('x')[1] || '1024'),
          num_outputs: request.count || 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
          seed: Math.floor(Math.random() * 1000000),
        }
      });

      // Poll for completion
      const result = await this.waitForCompletion(prediction.id);
      const generationTime = Date.now() - startTime;

      if (result.status === 'succeeded') {
        return {
          success: true,
          urls: Array.isArray(result.output) ? result.output : [result.output],
          metadata: {
            provider: 'replicate',
            model,
            cost: this.calculateReplicateCost(model, generationTime),
            generationTime
          }
        };
      } else {
        return {
          success: false,
          urls: [],
          error: result.error || 'Generation failed'
        };
      }

    } catch (error) {
      console.error('Replicate generation error:', error);
      return {
        success: false,
        urls: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createPrediction(data: any) {
    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async waitForCompletion(predictionId: string, maxWaitTime = 300000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      });

      const prediction = await response.json();
      
      if (['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
        return prediction;
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Generation timeout');
  }

  private optimizePromptForReplicate(prompt: string, characterKey: string): string {
    // Add model-specific optimizations
    const replicateOptimizations = [
      'masterpiece',
      'best quality',
      'highly detailed',
      'sharp focus',
      'professional photography'
    ];

    return `${prompt}, ${replicateOptimizations.join(', ')}`;
  }

  private calculateReplicateCost(model: string, generationTimeMs: number): number {
    // Replicate pricing varies by model and compute time
    const costPerSecond = {
      'flux-pro': 0.05,
      'flux-dev': 0.025,
      'sdxl': 0.0023,
      'realistic-vision': 0.0023
    };

    const seconds = generationTimeMs / 1000;
    return (costPerSecond[model as keyof typeof costPerSecond] || 0.025) * seconds;
  }
}

// Discord Bot Integration for Midjourney
export class MidjourneyGenerator {
  private discordBotToken: string;
  private discordChannelId: string;
  private webhookUrl?: string;

  constructor() {
    // Use Discord bot instead of unofficial API
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.MIDJOURNEY_CHANNEL_ID) {
      throw new Error('DISCORD_BOT_TOKEN and MIDJOURNEY_CHANNEL_ID environment variables required');
    }
    
    this.discordBotToken = process.env.DISCORD_BOT_TOKEN;
    this.discordChannelId = process.env.MIDJOURNEY_CHANNEL_ID;
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL; // Optional for notifications
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const startTime = Date.now();
      
      const mjPrompt = this.optimizePromptForMidjourney(request.prompt, request.characterKey);
      
      // This is a generic implementation - adjust for your MJ API service
      const response = await fetch(`https://discord.com/api/v10/channels/${this.discordChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${this.discordBotToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: mjPrompt,
          aspect_ratio: request.aspectRatio || '1:1',
          quality: 2, // Highest quality
        }),
      });

      if (!response.ok) {
        throw new Error(`Midjourney API error: ${response.statusText}`);
      }

      const result = await response.json();
      const generationTime = Date.now() - startTime;

      return {
        success: true,
        urls: [result.image_url],
        metadata: {
          provider: 'midjourney',
          model: 'midjourney-v6',
          cost: 0.10, // Approximate cost per generation
          generationTime
        }
      };

    } catch (error) {
      console.error('Midjourney generation error:', error);
      return {
        success: false,
        urls: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private optimizePromptForMidjourney(prompt: string, characterKey: string): string {
    // Get character reference URL for face consistency
    const referenceUrl = this.getCharacterReferenceUrl(characterKey);
    
    // Create Midjourney prompt with character reference
    const characterConsistencyPrompt = `${prompt} --cref ${referenceUrl} --cw 100`;
    
    // Midjourney-specific optimizations for photorealism
    const mjOptimizations = [
      '--v 6.1', // Latest version
      '--style raw', // More photorealistic
      '--q 1', // Standard quality (faster)
    ];

    // Add aspect ratio detection
    const aspectRatio = this.getMidjourneyAspectRatio(prompt);
    if (aspectRatio) {
      mjOptimizations.push(`--ar ${aspectRatio}`);
    }

    console.log(`📷 Using character reference: ${referenceUrl}`);
    return `${characterConsistencyPrompt} ${mjOptimizations.join(' ')}`;
  }

  private getCharacterReferenceUrl(characterKey: string): string {
    // Character reference image URLs (these should be hosted and accessible)
    const referenceUrls: Record<string, string> = {
      'nyx': '/references/nyx/nyx-reference.jpg',
      'lexi': '/references/lexi/lexi-reference.jpg',
      'aiko': '/references/aiko/aiko-reference.jpg',
      'dom': '/references/dom/dom-reference.jpg',
      'chase': '/references/chase/chase-reference.jpg'
    };

    const relativeUrl = referenceUrls[characterKey];
    if (!relativeUrl) {
      throw new Error(`No reference image configured for character: ${characterKey}`);
    }

    // Convert to absolute URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chatwithlexi.com';
    return `${baseUrl}${relativeUrl}`;
  }

  private getMidjourneyAspectRatio(prompt: string): string | null {
    // Detect desired aspect ratio from prompt
    if (prompt.includes('portrait') || prompt.includes('headshot')) {
      return '2:3';
    }
    if (prompt.includes('landscape') || prompt.includes('wide')) {
      return '16:9';
    }
    // Default to square for most cases
    return '1:1';
  }
}

// Main Image Generation Service
export class ImageGenerationService {
  private dalleGenerator: DalleGenerator | null = null;
  private replicateGenerator: ReplicateGenerator | null = null;
  private midjourneyGenerator: MidjourneyGenerator | null = null;
  private stableDiffusionGenerator: StableDiffusionGenerator | null = null;
  private mockGenerator: MockImageGenerator;

  constructor() {
    // Always available mock generator for testing
    this.mockGenerator = new MockImageGenerator();
    
    // Initialize available generators based on environment variables
    try {
      this.dalleGenerator = new DalleGenerator();
    } catch (e) {
      console.warn('DALL-E generator not available:', e);
    }

    try {
      this.replicateGenerator = new ReplicateGenerator();
    } catch (e) {
      console.warn('Replicate generator not available:', e);
    }

    try {
      this.midjourneyGenerator = new MidjourneyGenerator();
    } catch (e) {
      console.warn('Midjourney generator not available:', e);
    }

    try {
      this.stableDiffusionGenerator = new StableDiffusionGenerator();
      // Check if WebUI is available on startup
      this.stableDiffusionGenerator.isAvailable().then(available => {
        if (!available) {
          console.warn('Stable Diffusion WebUI not available - start with: cd ~/stable-diffusion-webui && ./webui.sh --api');
        } else {
          console.log('✅ Stable Diffusion WebUI is available with advanced face consistency');
        }
      });
    } catch (e) {
      console.warn('Stable Diffusion generator not available:', e);
    }
  }

  async generateImage(
    request: ImageGenerationRequest, 
    provider: 'dalle' | 'replicate' | 'midjourney' | 'stable-diffusion' = 'dalle'
  ): Promise<ImageGenerationResult> {
    // If stable-diffusion is requested and face consistency is enabled, use advanced methods
    if (provider === 'stable-diffusion' && request.faceConsistencyMethod) {
      return this.generateWithAdvancedFaceConsistency(request);
    }

    switch (provider) {
      case 'dalle':
        if (!this.dalleGenerator) {
          return { success: false, urls: [], error: 'DALL-E not configured' };
        }
        return this.dalleGenerator.generateImage(request);

      case 'replicate':
        if (!this.replicateGenerator) {
          return { success: false, urls: [], error: 'Replicate not configured' };
        }
        return this.replicateGenerator.generateImage(request);

      case 'midjourney':
        if (!this.midjourneyGenerator) {
          return { success: false, urls: [], error: 'Midjourney not configured' };
        }
        return this.midjourneyGenerator.generateImage(request);

      case 'stable-diffusion':
        if (!this.stableDiffusionGenerator) {
          return { success: false, urls: [], error: 'Stable Diffusion not configured' };
        }
        return this.generateWithStableDiffusion(request);

      default:
        return { success: false, urls: [], error: 'Unknown provider' };
    }
  }

  getAvailableProviders(): string[] {
    const providers = [];
    // Stable Diffusion as primary for face consistency
    if (this.stableDiffusionGenerator) providers.push('stable-diffusion');
    // DALL-E as secondary
    if (this.dalleGenerator) providers.push('dalle');
    if (this.replicateGenerator) providers.push('replicate');
    if (this.midjourneyGenerator) providers.push('midjourney');
    // Always include mock for testing
    providers.push('mock');
    return providers;
  }

  async generateWithFallback(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // If face consistency is requested, prioritize stable-diffusion
    if (request.faceConsistencyMethod && this.stableDiffusionGenerator) {
      console.log('🎯 Using Stable Diffusion for advanced face consistency...');
      const result = await this.generateWithAdvancedFaceConsistency(request);
      if (result.success) {
        return result;
      }
      console.warn('❌ Advanced face consistency failed, falling back to standard generation');
    }

    const providers = this.getAvailableProviders();
    
    // Try real providers first
    for (const provider of providers) {
      if (provider === 'mock') continue; // Skip mock in main loop
      
      console.log(`Trying ${provider} for image generation...`);
      
      const result = await this.generateImage(request, provider as any);
      
      if (result.success) {
        console.log(`✅ ${provider} generation successful`);
        return result;
      }
      
      console.warn(`❌ ${provider} failed:`, result.error);
    }

    // If no real providers available or all failed, use mock generator
    console.log('🎨 No real image generators available, using mock generator for testing...');
    const mockResult = await this.mockGenerator.generateImage(request.prompt, request.characterKey);
    
    // Convert mock result to standard format
    return {
      success: mockResult.success,
      urls: mockResult.urls,
      revisedPrompt: mockResult.revisedPrompt,
      error: mockResult.error,
      metadata: mockResult.metadata
    };
  }

  /**
   * Generate with standard Stable Diffusion (no advanced face consistency)
   */
  private async generateWithStableDiffusion(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    if (!this.stableDiffusionGenerator) {
      return { success: false, urls: [], error: 'Stable Diffusion not available' };
    }

    const options: StableDiffusionOptions = {
      prompt: request.prompt,
      width: parseInt(request.size?.split('x')[0] || '512'),
      height: parseInt(request.size?.split('x')[1] || '512'),
      steps: 25,
      cfgScale: 7,
    };

    const result = await this.stableDiffusionGenerator.generate(request.prompt, options);
    
    if (result.success && result.imageData) {
      // Convert Buffer to data URL for consistency with other generators
      const dataUrl = `data:image/png;base64,${result.imageData.toString('base64')}`;
      return {
        success: true,
        urls: [dataUrl],
        metadata: {
          provider: 'stable-diffusion',
          model: 'stable-diffusion-xl-base-1.0',
          ...result.metadata
        }
      };
    }

    return {
      success: false,
      urls: [],
      error: result.error || 'Generation failed'
    };
  }

  /**
   * Generate with advanced face consistency using all three methods
   */
  private async generateWithAdvancedFaceConsistency(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    if (!this.stableDiffusionGenerator) {
      return { success: false, urls: [], error: 'Stable Diffusion not available for face consistency' };
    }

    try {
      console.log('🎯 Loading character reference for advanced face consistency...');
      
      // Load character reference image
      const referenceBuffer = await faceAnalyzer.loadCharacterReference(request.characterKey);
      if (!referenceBuffer) {
        console.warn('⚠️ No reference image found, falling back to standard generation');
        return this.generateWithStableDiffusion(request);
      }

      const options: StableDiffusionOptions = {
        prompt: request.prompt,
        width: parseInt(request.size?.split('x')[0] || '512'),
        height: parseInt(request.size?.split('x')[1] || '512'),
        steps: 25,
        cfgScale: 7,
        faceReferenceImage: referenceBuffer,
        faceConsistencyStrength: request.faceConsistencyStrength || 0.8,
        generateMultiple: request.generateMultiple || 4,
        useImageToImage: request.faceConsistencyMethod === 'image-to-image',
      };

      // Determine which method(s) to use
      const method = request.faceConsistencyMethod || 'all';
      
      if (method === 'all') {
        // Use all three methods and return the best result
        return this.generateWithAllMethods(options, request);
      }

      // Use specific method
      const result = await this.stableDiffusionGenerator.generate(request.prompt, options);
      
      if (result.success && result.imageData) {
        const dataUrl = `data:image/png;base64,${result.imageData.toString('base64')}`;
        return {
          success: true,
          urls: [dataUrl],
          metadata: {
            provider: 'stable-diffusion',
            model: 'stable-diffusion-xl-base-1.0',
            ...result.metadata,
            faceConsistencyMethod: method,
            faceSimilarityScore: result.metadata?.faceSimilarity?.similarity,
          }
        };
      }

      return {
        success: false,
        urls: [],
        error: result.error || 'Advanced face consistency generation failed'
      };

    } catch (error) {
      console.error('❌ Advanced face consistency failed:', error);
      return {
        success: false,
        urls: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Use all three face consistency methods and return the best result
   */
  private async generateWithAllMethods(options: StableDiffusionOptions, request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    console.log('🎯 Testing all face consistency methods...');
    
    const results: Array<{ method: string; result: any; score: number }> = [];

    // Method 1: Face Reference Integration
    try {
      console.log('📸 Testing Method 1: Face Reference Integration...');
      const method1Options = { ...options, useImageToImage: false, generateMultiple: 1 };
      const result1 = await this.stableDiffusionGenerator!.generate(request.prompt, method1Options);
      if (result1.success) {
        const score = result1.metadata?.faceSimilarity?.similarity || 0.5;
        results.push({ method: 'face-reference', result: result1, score });
        console.log(`✅ Method 1 score: ${(score * 100).toFixed(1)}%`);
      }
    } catch (error) {
      console.warn('⚠️ Method 1 failed:', error);
    }

    // Method 2: Image-to-Image Generation
    try {
      console.log('🖼️ Testing Method 2: Image-to-Image Generation...');
      const method2Options = { ...options, useImageToImage: true, generateMultiple: 1 };
      const result2 = await this.stableDiffusionGenerator!.generate(request.prompt, method2Options);
      if (result2.success) {
        const score = result2.metadata?.faceSimilarity?.similarity || 0.5;
        results.push({ method: 'image-to-image', result: result2, score });
        console.log(`✅ Method 2 score: ${(score * 100).toFixed(1)}%`);
      }
    } catch (error) {
      console.warn('⚠️ Method 2 failed:', error);
    }

    // Method 3: Multiple Generation with Selection
    try {
      console.log('🎲 Testing Method 3: Multiple Generation with Selection...');
      const method3Options = { ...options, useImageToImage: false, generateMultiple: 4 };
      const result3 = await this.stableDiffusionGenerator!.generate(request.prompt, method3Options);
      if (result3.success) {
        const score = result3.metadata?.faceSimilarity?.similarity || 0.5;
        results.push({ method: 'multiple-selection', result: result3, score });
        console.log(`✅ Method 3 score: ${(score * 100).toFixed(1)}%`);
      }
    } catch (error) {
      console.warn('⚠️ Method 3 failed:', error);
    }

    if (results.length === 0) {
      return {
        success: false,
        urls: [],
        error: 'All face consistency methods failed'
      };
    }

    // Select the best result
    results.sort((a, b) => b.score - a.score);
    const bestResult = results[0];
    
    console.log(`🏆 Best method: ${bestResult.method} with score ${(bestResult.score * 100).toFixed(1)}%`);
    console.log(`📊 All scores: ${results.map(r => `${r.method}: ${(r.score * 100).toFixed(1)}%`).join(', ')}`);

    const result = bestResult.result;
    if (result.imageData) {
      const dataUrl = `data:image/png;base64,${result.imageData.toString('base64')}`;
      return {
        success: true,
        urls: [dataUrl],
        metadata: {
          ...result.metadata,
          faceConsistencyMethod: 'all-methods-best',
          faceSimilarityScore: bestResult.score,
          candidatesGenerated: results.length,
        }
      };
    }

    return {
      success: false,
      urls: [],
      error: 'Best result conversion failed'
    };
  }
}