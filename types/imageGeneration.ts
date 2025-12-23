export interface ImageGenerationProvider {
  generate(prompt: string, options?: any): Promise<GenerationResult>;
}

export interface GenerationResult {
  imageData?: Buffer;
  success: boolean;
  error?: string;
  metadata?: {
    provider?: string;
    method?: string;
    faceSimilarity?: {
      similarity: number;
      confidence: number;
    };
    parameters?: any;
    [key: string]: any;
  };
}

export interface FaceConsistencyOptions {
  method: 'reference' | 'image-to-image' | 'multiple-selection' | 'all';
  strength: number;
  generateCount?: number;
}

export interface CharacterReference {
  key: string;
  referenceImagePath: string;
  traits: {
    face: string;
    hair: string;
    eyes: string;
    skin: string;
  };
}