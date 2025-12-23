// lib/contentProcessor.ts
// Background Queue Processor for Content Generation

import { getSupabaseAdmin } from './supabaseAdmin';
import { ImageGenerationService, type ImageGenerationRequest } from './imageGenerators';
import { type CharacterBible, type ContentGenerationQueue } from './contentPipeline';
import { imageStorage, type ImageDownloadResult } from './imageStorage';

export class ContentProcessor {
  private imageGenerator: ImageGenerationService;
  private supabase = getSupabaseAdmin();
  private isProcessing = false;

  constructor() {
    this.imageGenerator = new ImageGenerationService();
  }

  // Health check to reset stuck jobs before processing
  async resetStuckJobs(): Promise<number> {
    try {
      console.log('🔍 Checking for stuck jobs...');
      
      // Find jobs stuck in processing for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: stuckJobs, error: findError } = await this.supabase
        .from('content_generation_queue')
        .select('id, character_key, content_type, updated_at')
        .eq('status', 'processing')
        .lt('updated_at', fiveMinutesAgo);

      if (findError) {
        console.error('❌ Error finding stuck jobs:', findError);
        return 0;
      }

      if (!stuckJobs || stuckJobs.length === 0) {
        return 0;
      }

      console.log(`🔧 Found ${stuckJobs.length} stuck jobs, resetting to pending...`);
      
      // Reset stuck jobs to pending
      const { error: updateError } = await this.supabase
        .from('content_generation_queue')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'processing')
        .lt('updated_at', fiveMinutesAgo);

      if (updateError) {
        console.error('❌ Error resetting stuck jobs:', updateError);
        return 0;
      }

      console.log(`✅ Successfully reset ${stuckJobs.length} stuck jobs`);
      return stuckJobs.length;
    } catch (error) {
      console.error('❌ Error in resetStuckJobs:', error);
      return 0;
    }
  }

  // Main processing loop - call this from a cron job or queue system
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏸️ Queue processor already running, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting content queue processing...');
    
    // Reset any stuck jobs before processing
    await this.resetStuckJobs();

    try {
      // Get pending items ordered by priority
      const { data: queueItems, error } = await this.supabase
        .from('content_generation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10); // Process 10 items at a time

      if (error) {
        console.error('❌ Error fetching queue items:', error);
        return;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('📭 No pending items in queue');
        return;
      }

      console.log(`📋 Processing ${queueItems.length} queue items...`);

      // Process each item
      for (const item of queueItems) {
        await this.processQueueItem(item);
        
        // Add small delay between generations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      console.log('✅ Queue processing complete');
    }
  }

  private async processQueueItem(item: ContentGenerationQueue): Promise<void> {
    console.log(`🎨 Processing item ${item.id} (${item.character_key})`);

    try {
      // Mark as processing
      await this.updateQueueItemStatus(item.id, 'processing');

      const generationRequest: ImageGenerationRequest = {
        prompt: item.generation_prompt,
        characterKey: item.character_key,
        style: item.prompt_data?.style_modifiers?.[0] || 'photorealistic',
        quality: 'hd',
        size: '1024x1792', // Use portrait orientation for better character photos
        count: 1,
        // Enable face consistency for character images
        faceConsistencyMethod: 'all', // Use all methods for best results
        faceConsistencyStrength: 0.8,
        generateMultiple: 4 // Generate multiple candidates for selection
      };

      // Log which generation method will be used
      const availableProviders = this.imageGenerator.getAvailableProviders();
      const primaryProvider = availableProviders[0];
      
      if (primaryProvider === 'stable-diffusion') {
        console.log('🎯 Using LOCAL Stable Diffusion with advanced face consistency');
      } else if (primaryProvider === 'dalle') {
        console.log('🎨 Using DALL-E (cloud) - Local Stable Diffusion not available');
      } else {
        console.log(`🔄 Using ${primaryProvider} generator`);
      }

      // Generate the image with face consistency and fallback
      const result = await this.imageGenerator.generateWithFallback(generationRequest);

      if (result.success && result.urls.length > 0) {
        // Save generated content to library
        const contentId = await this.saveToContentLibrary(item, result);
        
        // Update queue item as completed
        await this.updateQueueItemStatus(item.id, 'completed', {
          output_urls: result.urls,
          generation_metadata: result.metadata,
          content_library_id: contentId,
          revised_prompt: result.revisedPrompt
        });

        const providerInfo = result.metadata?.provider === 'stable-diffusion' ? '(LOCAL SD)' : 
                            result.metadata?.provider === 'dalle' ? '(DALL-E Cloud)' : '';
        const faceInfo = result.metadata?.faceSimilarityScore ? 
                        ` - Face similarity: ${(result.metadata.faceSimilarityScore * 100).toFixed(1)}%` : '';
        console.log(`✅ Item ${item.id} completed successfully ${providerInfo}${faceInfo}`);

      } else {
        // Mark as failed
        await this.updateQueueItemStatus(item.id, 'failed', undefined, result.error);
        console.error(`❌ Item ${item.id} failed:`, result.error);
      }

    } catch (error) {
      console.error(`❌ Error processing item ${item.id}:`, error);
      await this.updateQueueItemStatus(
        item.id, 
        'failed', 
        undefined, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async updateQueueItemStatus(
    itemId: string, 
    status: 'processing' | 'completed' | 'failed',
    processingData?: any,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (processingData) {
      updateData.processing_data = processingData;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('content_generation_queue')
      .update(updateData)
      .eq('id', itemId);

    if (error) {
      console.error('Error updating queue item status:', error);
    }
  }

  private async saveToContentLibrary(item: ContentGenerationQueue, result: any): Promise<string> {
    const providerInfo = result.metadata?.provider || 'unknown';
    const faceInfo = result.metadata?.faceSimilarityScore ? 
                    ` (Face: ${(result.metadata.faceSimilarityScore * 100).toFixed(1)}%)` : '';
    console.log(`💾 Saving ${providerInfo.toUpperCase()} generated images to storage for ${item.character_key}${faceInfo}...`);
    
    // Download and store images permanently
    const storageResults = await imageStorage.storeGenerationResults(
      result.urls,
      item.character_key,
      item.id,
      'waiting_for_approval'
    );

    // Get the first successfully stored image
    const primaryImage = storageResults.find(r => r.success);
    if (!primaryImage) {
      throw new Error('Failed to store any generated images');
    }

    console.log(`✅ Images stored in: waiting_for_approval/${item.character_key}/`);

    const contentData = {
      character_key: item.character_key,
      content_type: item.content_type === 'batch' ? 'image' : item.content_type,
      title: this.generateContentTitle(item),
      file_url: primaryImage.publicUrl!, // Use stored image URL
      thumbnail_url: primaryImage.publicUrl!, // For images, thumbnail is the same
      metadata: {
        generation_prompt: item.generation_prompt,
        revised_prompt: result.revisedPrompt,
        provider: result.metadata?.provider,
        model: result.metadata?.model,
        generation_cost: result.metadata?.cost,
        generation_method: result.metadata?.provider || 'unknown',
        generation_model: result.metadata?.model || 'unknown',
        face_consistency_method: result.metadata?.faceConsistencyMethod,
        face_similarity_score: result.metadata?.faceSimilarityScore,
        candidates_generated: result.metadata?.candidatesGenerated,
        batch_id: item.batch_id,
        prompt_data: item.prompt_data,
        original_urls: result.urls, // Keep track of original URLs
        storage_path: primaryImage.storagePath,
        stored_images: storageResults.filter(r => r.success).map(r => ({
          storage_path: r.storagePath,
          public_url: r.publicUrl,
          size: r.metadata?.size,
          content_type: r.metadata?.contentType
        }))
      },
      tags: this.extractTagsFromPrompt(item.generation_prompt),
      mood: item.prompt_data?.mood || this.extractMoodFromPrompt(item.generation_prompt),
      aesthetic: this.extractAestheticFromPrompt(item.generation_prompt, item.character_key),
      quality_score: 6, // Lower default score for approval queue - can be updated after approval
      status: 'waiting_for_approval' // Mark as pending approval
    };

    const { data, error } = await this.supabase
      .from('content_library')
      .insert(contentData)
      .select()
      .single();

    if (error) {
      console.error('Error saving to content library:', error);
      throw error;
    }

    console.log(`📝 Content library entry created: ${data.id}`);
    return data.id;
  }

  private generateContentTitle(item: ContentGenerationQueue): string {
    const characterName = item.character_key.charAt(0).toUpperCase() + item.character_key.slice(1);
    const mood = item.prompt_data?.mood || 'Daily';
    const timestamp = new Date().toLocaleDateString();
    
    return `${characterName} - ${mood} (${timestamp})`;
  }

  private extractTagsFromPrompt(prompt: string): string[] {
    const commonTags = [
      'selfie', 'portrait', 'outfit', 'bedroom', 'mirror', 'makeup',
      'lingerie', 'dress', 'casual', 'bikini', 'workout', 'evening',
      'morning', 'night', 'cute', 'sexy', 'confident', 'playful'
    ];

    const promptLower = prompt.toLowerCase();
    const foundTags = commonTags.filter(tag => promptLower.includes(tag));
    
    return foundTags.length > 0 ? foundTags : ['daily'];
  }

  private extractMoodFromPrompt(prompt: string): string {
    const moodKeywords = {
      'confident': ['confident', 'strong', 'powerful', 'bold'],
      'playful': ['playful', 'fun', 'cute', 'bubbly'],
      'seductive': ['seductive', 'sultry', 'alluring', 'mysterious'],
      'casual': ['casual', 'relaxed', 'comfortable', 'chill'],
      'elegant': ['elegant', 'sophisticated', 'classy', 'formal']
    };

    const promptLower = prompt.toLowerCase();
    
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => promptLower.includes(keyword))) {
        return mood;
      }
    }

    return 'casual';
  }

  private extractAestheticFromPrompt(prompt: string, characterKey: string): string {
    const aestheticMap = {
      'lexi': 'glamorous',
      'nyx': 'gothic',
      'aiko': 'kawaii',
      'dom': 'masculine',
      'chase': 'athletic',
      'zaria': 'artistic',
      'chloe': 'trendy'
    };

    return aestheticMap[characterKey as keyof typeof aestheticMap] || 'natural';
  }

  // Manual processing for specific batch
  async processBatch(batchId: string): Promise<void> {
    console.log(`🎯 Processing specific batch: ${batchId}`);

    const { data: batchItems, error } = await this.supabase
      .from('content_generation_queue')
      .select('*')
      .eq('batch_id', batchId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching batch items:', error);
      return;
    }

    if (!batchItems || batchItems.length === 0) {
      console.log('No pending items in batch');
      return;
    }

    console.log(`Processing ${batchItems.length} items in batch ${batchId}`);

    for (const item of batchItems) {
      await this.processQueueItem(item);
      await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay for batches
    }

    console.log(`✅ Batch ${batchId} processing complete`);
  }

  // Get processing statistics
  async getProcessingStats(): Promise<any> {
    const { data: stats } = await this.supabase
      .from('content_generation_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

    const statusCounts = stats?.reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total_24h: stats?.length || 0,
      pending: statusCounts.pending || 0,
      processing: statusCounts.processing || 0,
      completed: statusCounts.completed || 0,
      failed: statusCounts.failed || 0,
      success_rate: statusCounts.completed && stats?.length 
        ? Math.round((statusCounts.completed / stats.length) * 100) 
        : 0
    };
  }

  // Clear all pending items from the generation queue
  async clearQueue(): Promise<{ cleared_count: number }> {
    console.log('🧹 Clearing generation queue...');
    
    try {
      // Delete all pending items
      const { data, error } = await this.supabase
        .from('content_generation_queue')
        .delete()
        .eq('status', 'pending')
        .select('id');

      if (error) {
        console.error('❌ Error clearing queue:', error);
        throw error;
      }

      const clearedCount = data?.length || 0;
      console.log(`✅ Cleared ${clearedCount} pending items from generation queue`);
      
      return { cleared_count: clearedCount };
    } catch (error) {
      console.error('❌ Failed to clear queue:', error);
      throw error;
    }
  }
}