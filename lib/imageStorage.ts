// lib/imageStorage.ts
// Utility for downloading and storing generated images in Supabase Storage

import { getSupabaseAdmin } from './supabaseAdmin';

export interface ImageDownloadResult {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
  metadata?: {
    size: number;
    contentType: string;
    originalUrl: string;
  };
}

export class ImageStorageService {
  private supabase = getSupabaseAdmin();
  private bucketName = 'generated-images';

  constructor() {
    // Ensure the bucket exists
    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        console.log(`📁 Creating storage bucket: ${this.bucketName}`);
        const { error } = await this.supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (error && error.message !== 'Bucket already exists') {
          console.error('❌ Error creating storage bucket:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error checking storage bucket:', error);
    }
  }

  /**
   * Download an image from a URL and save it to Supabase Storage
   */
  async downloadAndStoreImage(
    imageUrl: string,
    storagePath: string,
    options?: {
      maxRetries?: number;
      timeout?: number;
    }
  ): Promise<ImageDownloadResult> {
    const maxRetries = options?.maxRetries || 3;
    const timeout = options?.timeout || 30000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Downloading image (attempt ${attempt}/${maxRetries}): ${imageUrl}`);

        // Download the image with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Lexi-Bot/1.0 (Image Processing Service)'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        // Get the image buffer
        const imageBuffer = await response.arrayBuffer();
        const imageSize = imageBuffer.byteLength;

        console.log(`📊 Image downloaded: ${imageSize} bytes, type: ${contentType}`);

        // Upload to Supabase Storage
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(storagePath, imageBuffer, {
            contentType,
            cacheControl: '31536000', // 1 year cache
            upsert: true // Overwrite if exists
          });

        if (error) {
          throw error;
        }

        // Get the public URL
        const { data: publicUrlData } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(storagePath);

        console.log(`✅ Image stored successfully: ${publicUrlData.publicUrl}`);

        return {
          success: true,
          storagePath: data.path,
          publicUrl: publicUrlData.publicUrl,
          metadata: {
            size: imageSize,
            contentType,
            originalUrl: imageUrl
          }
        };

      } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown download error'
          };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Generate a unique storage path for an image
   */
  generateStoragePath(
    characterKey: string,
    status: 'waiting_for_approval' | 'approved' | 'rejected' = 'waiting_for_approval',
    imageId?: string
  ): string {
    const timestamp = Date.now();
    const randomId = imageId || Math.random().toString(36).substring(7);
    const filename = `${timestamp}_${randomId}.jpg`;
    
    return `${status}/${characterKey}/${filename}`;
  }

  /**
   * Download and store multiple images from generation results
   */
  async storeGenerationResults(
    urls: string[],
    characterKey: string,
    generationId: string,
    status: 'waiting_for_approval' | 'approved' | 'rejected' = 'waiting_for_approval'
  ): Promise<ImageDownloadResult[]> {
    const results: ImageDownloadResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const storagePath = this.generateStoragePath(characterKey, status, `${generationId}_${i}`);
      
      const result = await this.downloadAndStoreImage(url, storagePath);
      results.push(result);
      
      // Small delay between downloads to be nice to APIs
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Store image buffer directly to storage (for grid slicing and similar operations)
   */
  async storeImageBuffer(
    buffer: Buffer,
    characterKey: string,
    imageId: string,
    status: 'waiting_for_approval' | 'approved' | 'rejected' = 'waiting_for_approval',
    contentType: string = 'image/png'
  ): Promise<ImageDownloadResult> {
    try {
      const storagePath = this.generateStoragePath(characterKey, status, imageId);
      const imageSize = buffer.byteLength;

      console.log(`📊 Storing buffer: ${imageSize} bytes, type: ${contentType}`);

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(storagePath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      console.log(`✅ Buffer stored successfully: ${publicUrlData.publicUrl}`);

      return {
        success: true,
        storagePath: storagePath,
        publicUrl: publicUrlData.publicUrl,
        metadata: {
          size: imageSize,
          contentType: contentType,
          originalUrl: 'buffer' // Indicate this was from a buffer
        }
      };

    } catch (error) {
      console.error('❌ Error storing image buffer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Move an image from waiting_for_approval to approved folder
   */
  async approveImage(
    currentPath: string,
    characterKey: string,
    newImageId?: string
  ): Promise<ImageDownloadResult> {
    try {
      // Generate new approved path
      const approvedPath = this.generateStoragePath(characterKey, 'approved', newImageId);

      // Copy the file to the approved location
      const { data: copyData, error: copyError } = await this.supabase.storage
        .from(this.bucketName)
        .copy(currentPath, approvedPath);

      if (copyError) {
        throw copyError;
      }

      // Get the public URL for the approved image
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(approvedPath);

      console.log(`✅ Image approved and moved: ${publicUrlData.publicUrl}`);

      return {
        success: true,
        storagePath: approvedPath,
        publicUrl: publicUrlData.publicUrl
      };

    } catch (error) {
      console.error('❌ Error approving image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown approval error'
      };
    }
  }

  /**
   * Move an image from waiting_for_approval to rejected folder
   */
  async rejectImage(
    currentPath: string,
    characterKey: string,
    reason?: string
  ): Promise<ImageDownloadResult> {
    try {
      // Generate new rejected path
      const rejectedPath = this.generateStoragePath(characterKey, 'rejected', `rejected_${Date.now()}`);

      // Move the file to the rejected location
      const { data: moveData, error: moveError } = await this.supabase.storage
        .from(this.bucketName)
        .move(currentPath, rejectedPath);

      if (moveError) {
        throw moveError;
      }

      console.log(`🗑️ Image rejected and moved: ${rejectedPath}`);

      return {
        success: true,
        storagePath: rejectedPath
      };

    } catch (error) {
      console.error('❌ Error rejecting image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown rejection error'
      };
    }
  }

  /**
   * Clean up old rejected images (older than 30 days)
   */
  async cleanupOldRejectedImages(): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const { data: files } = await this.supabase.storage
        .from(this.bucketName)
        .list('rejected', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (!files) return;

      const filesToDelete = files
        .filter(file => {
          if (!file.created_at) return false;
          const fileTime = new Date(file.created_at).getTime();
          return fileTime < thirtyDaysAgo;
        })
        .map(file => `rejected/${file.name}`);

      if (filesToDelete.length > 0) {
        console.log(`🧹 Cleaning up ${filesToDelete.length} old rejected images`);
        
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .remove(filesToDelete);

        if (error) {
          console.error('❌ Error cleaning up old images:', error);
        } else {
          console.log(`✅ Cleaned up ${filesToDelete.length} old rejected images`);
        }
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    waitingForApproval: number;
    approved: number;
    rejected: number;
    totalSize: number;
  }> {
    try {
      const [waitingFiles, approvedFiles, rejectedFiles] = await Promise.all([
        this.supabase.storage.from(this.bucketName).list('waiting_for_approval'),
        this.supabase.storage.from(this.bucketName).list('approved'),
        this.supabase.storage.from(this.bucketName).list('rejected')
      ]);

      const countFiles = (result: any) => result.data?.length || 0;
      const calculateSize = (result: any) => 
        result.data?.reduce((total: number, file: any) => total + (file.metadata?.size || 0), 0) || 0;

      return {
        waitingForApproval: countFiles(waitingFiles),
        approved: countFiles(approvedFiles),
        rejected: countFiles(rejectedFiles),
        totalSize: calculateSize(waitingFiles) + calculateSize(approvedFiles) + calculateSize(rejectedFiles)
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return {
        waitingForApproval: 0,
        approved: 0,
        rejected: 0,
        totalSize: 0
      };
    }
  }
}

export const imageStorage = new ImageStorageService();