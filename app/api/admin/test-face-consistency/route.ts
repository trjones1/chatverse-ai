import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationService } from '../../../../lib/imageGenerators';

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check
    const debugToken = request.headers.get('x-debug-token') || request.nextUrl.searchParams.get('debug');
    if (debugToken !== 'dev') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { 
      prompt = 'beautiful woman in a beach setting, wearing a black dress, natural lighting, professional photography',
      characterKey = 'nyx',
      method = 'all', // 'reference', 'image-to-image', 'multiple-selection', or 'all'
      generateMultiple = 4
    } = body;

    console.log(`🧪 Testing face consistency with method: ${method} for character: ${characterKey}`);
    console.log(`📝 Prompt: ${prompt}`);

    const imageService = new ImageGenerationService();

    // Test the advanced face consistency system
    const result = await imageService.generateImage({
      prompt,
      characterKey,
      size: '1024x1024',
      faceConsistencyMethod: method,
      faceConsistencyStrength: 0.8,
      generateMultiple,
    }, 'stable-diffusion');

    if (result.success) {
      console.log('✅ Face consistency test completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Face consistency test completed',
        result: {
          urls: result.urls,
          metadata: result.metadata,
        },
        debug: {
          method,
          characterKey,
          prompt,
          faceSimilarityScore: result.metadata?.faceSimilarityScore,
          faceConsistencyMethod: result.metadata?.faceConsistencyMethod,
          candidatesGenerated: result.metadata?.candidatesGenerated,
        }
      });
    } else {
      console.error('❌ Face consistency test failed:', result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error,
        debug: {
          method,
          characterKey,
          prompt,
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Face consistency test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debug: {
        timestamp: new Date().toISOString(),
      }
    }, { status: 500 });
  }
}

// GET endpoint for basic status check
export async function GET(request: NextRequest) {
  try {
    const debugToken = request.nextUrl.searchParams.get('debug');
    if (debugToken !== 'dev') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imageService = new ImageGenerationService();
    const providers = imageService.getAvailableProviders();

    return NextResponse.json({
      message: 'Face consistency test endpoint ready',
      availableProviders: providers,
      stableDiffusionAvailable: providers.includes('stable-diffusion'),
      supportedMethods: [
        'reference',
        'image-to-image', 
        'multiple-selection',
        'all'
      ],
      supportedCharacters: [
        'nyx',
        'lexi',
        'aiko',
        'dom',
        'chase'
      ],
      usage: {
        endpoint: '/api/admin/test-face-consistency?debug=dev',
        method: 'POST',
        body: {
          prompt: 'Your image prompt here',
          characterKey: 'nyx',
          method: 'all', // or 'reference', 'image-to-image', 'multiple-selection'
          generateMultiple: 4
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}