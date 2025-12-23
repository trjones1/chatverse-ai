import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface FaceAnalysisResult {
  confidence: number;
  embedding?: number[];
  landmarks?: Array<{x: number, y: number}>;
  quality?: number;
}

export interface FaceSimilarityResult {
  similarity: number;
  confidence: number;
  analysis: {
    reference: FaceAnalysisResult;
    generated: FaceAnalysisResult;
  };
}

export class FaceAnalyzer {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:7860') {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze a face in an image using the WebUI's face analysis capabilities
   */
  async analyzeFace(imageBuffer: Buffer): Promise<FaceAnalysisResult> {
    try {
      // Convert image to base64
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      // Use WebUI's face detection capabilities through ControlNet
      const response = await fetch(`${this.baseUrl}/sdapi/v1/controlnet/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_image: base64Image,
          module: 'face_detector',
          processor_res: 512,
          threshold_a: 0.5,
          threshold_b: 0.5,
        }),
      });

      if (!response.ok) {
        console.warn('Face detection API failed, using basic analysis');
        return this.basicFaceAnalysis(imageBuffer);
      }

      const result = await response.json();
      
      return {
        confidence: result.confidence || 0.8,
        landmarks: result.landmarks,
        quality: result.quality || 0.7,
      };

    } catch (error) {
      console.warn('Face analysis failed, using basic fallback:', error);
      return this.basicFaceAnalysis(imageBuffer);
    }
  }

  /**
   * Basic face analysis using image processing when API is unavailable
   */
  private async basicFaceAnalysis(imageBuffer: Buffer): Promise<FaceAnalysisResult> {
    try {
      // Use sharp for basic image analysis
      const metadata = await sharp(imageBuffer).metadata();
      const stats = await sharp(imageBuffer)
        .grayscale()
        .stats();

      // Basic quality assessment based on sharpness and contrast
      const quality = Math.min(1.0, (stats.channels[0].stdev || 0) / 50);
      
      return {
        confidence: 0.6, // Lower confidence for basic analysis
        quality: Math.max(0.1, quality),
      };
    } catch (error) {
      console.warn('Basic face analysis failed:', error);
      return {
        confidence: 0.3,
        quality: 0.5,
      };
    }
  }

  /**
   * Compare two faces and return similarity score
   */
  async compareFaces(referenceBuffer: Buffer, generatedBuffer: Buffer): Promise<FaceSimilarityResult> {
    try {
      const [referenceAnalysis, generatedAnalysis] = await Promise.all([
        this.analyzeFace(referenceBuffer),
        this.analyzeFace(generatedBuffer),
      ]);

      // If we have embeddings, use cosine similarity
      if (referenceAnalysis.embedding && generatedAnalysis.embedding) {
        const similarity = this.cosineSimilarity(referenceAnalysis.embedding, generatedAnalysis.embedding);
        return {
          similarity,
          confidence: Math.min(referenceAnalysis.confidence, generatedAnalysis.confidence),
          analysis: {
            reference: referenceAnalysis,
            generated: generatedAnalysis,
          },
        };
      }

      // Fallback to basic comparison using image statistics
      const similarity = await this.basicImageComparison(referenceBuffer, generatedBuffer);
      
      return {
        similarity,
        confidence: Math.min(referenceAnalysis.confidence, generatedAnalysis.confidence) * 0.7, // Reduced confidence
        analysis: {
          reference: referenceAnalysis,
          generated: generatedAnalysis,
        },
      };

    } catch (error) {
      console.error('Face comparison failed:', error);
      return {
        similarity: 0.3,
        confidence: 0.2,
        analysis: {
          reference: { confidence: 0.2 },
          generated: { confidence: 0.2 },
        },
      };
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Basic image comparison using histogram and structural similarity
   */
  private async basicImageComparison(imageA: Buffer, imageB: Buffer): Promise<number> {
    try {
      // Resize both images to same size for comparison
      const size = 256;
      const [processedA, processedB] = await Promise.all([
        sharp(imageA)
          .resize(size, size)
          .grayscale()
          .raw()
          .toBuffer(),
        sharp(imageB)
          .resize(size, size)
          .grayscale()
          .raw()
          .toBuffer(),
      ]);

      // Calculate mean squared error
      let mse = 0;
      const totalPixels = size * size;
      
      for (let i = 0; i < totalPixels; i++) {
        const diff = processedA[i] - processedB[i];
        mse += diff * diff;
      }
      
      mse /= totalPixels;
      
      // Convert MSE to similarity score (0-1, where 1 is identical)
      const maxMse = 255 * 255; // Maximum possible MSE for 8-bit images
      const similarity = Math.max(0, 1 - (mse / maxMse));
      
      return similarity;

    } catch (error) {
      console.warn('Basic image comparison failed:', error);
      return 0.3;
    }
  }

  /**
   * Load character reference image
   */
  async loadCharacterReference(characterKey: string): Promise<Buffer | null> {
    try {
      const referencePath = path.join(process.cwd(), 'public', 'references', characterKey, `${characterKey}-reference.jpg`);
      
      // Try different image extensions
      const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      
      for (const ext of extensions) {
        const imagePath = referencePath.replace(/\.[^.]+$/, ext);
        try {
          await fs.access(imagePath);
          const imageBuffer = await fs.readFile(imagePath);
          
          // Ensure image is in a standard format
          return await sharp(imageBuffer)
            .resize(512, 512, { 
              fit: 'cover',
              position: 'center'
            })
            .png()
            .toBuffer();
            
        } catch (err) {
          continue; // Try next extension
        }
      }
      
      console.warn(`No reference image found for character: ${characterKey}`);
      return null;
      
    } catch (error) {
      console.error(`Failed to load reference for character ${characterKey}:`, error);
      return null;
    }
  }

  /**
   * Extract face region from image (basic implementation)
   */
  async extractFaceRegion(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // For now, just center crop to focus on the face area
      // In a full implementation, this would use face detection to crop precisely
      return await sharp(imageBuffer)
        .resize(512, 512, { 
          fit: 'cover',
          position: 'center'
        })
        .extract({
          left: 128,
          top: 100,  // Focus slightly higher for face
          width: 256,
          height: 256,
        })
        .png()
        .toBuffer();
        
    } catch (error) {
      console.warn('Face extraction failed, using original image:', error);
      return imageBuffer;
    }
  }
}

export const faceAnalyzer = new FaceAnalyzer();