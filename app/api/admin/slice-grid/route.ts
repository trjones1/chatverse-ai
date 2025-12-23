// app/api/admin/slice-grid/route.ts
// Admin API for slicing 2x2 grid images and adding to approval queue

import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { imageStorage } from '@/lib/imageStorage';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const formData = await req.formData();
    const file = formData.get('image') as File;
    const characterKey = formData.get('character_key') as string;
    const mood = formData.get('mood') as string || 'casual';
    const tags = formData.get('tags') as string || 'batch,grid';

    if (!file || !characterKey) {
      return NextResponse.json({ 
        error: 'image file and character_key are required' 
      }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'File must be an image' 
      }, { status: 400 });
    }

    console.log(`🔪 Slicing 2x2 grid for ${characterKey}...`);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Get image dimensions
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ 
        error: 'Unable to read image dimensions' 
      }, { status: 400 });
    }

    // Calculate slice dimensions (2x2 grid)
    const sliceWidth = Math.floor(metadata.width / 2);
    const sliceHeight = Math.floor(metadata.height / 2);

    console.log(`📐 Original: ${metadata.width}x${metadata.height}, Slices: ${sliceWidth}x${sliceHeight}`);

    // Generate 4 slices
    const slices = [];
    const positions = [
      { left: 0, top: 0, name: 'top-left' },
      { left: sliceWidth, top: 0, name: 'top-right' },
      { left: 0, top: sliceHeight, name: 'bottom-left' },
      { left: sliceWidth, top: sliceHeight, name: 'bottom-right' }
    ];

    for (const [index, pos] of positions.entries()) {
      try {
        const sliceBuffer = await sharp(buffer)
          .extract({ 
            left: pos.left, 
            top: pos.top, 
            width: sliceWidth, 
            height: sliceHeight 
          })
          .png() // Convert to PNG for consistency
          .toBuffer();

        slices.push({
          buffer: sliceBuffer,
          position: pos.name,
          index: index + 1
        });

        console.log(`✂️ Created slice ${index + 1}/4 (${pos.name})`);
      } catch (error) {
        console.error(`❌ Error creating slice ${index + 1}:`, error);
        throw error;
      }
    }

    // Store slices and add to approval queue
    // Use admin client for database operations to bypass RLS
    const adminSupabase = getSupabaseAdmin();
    const batchId = `grid-${Date.now()}`;
    const storedImages = [];
    const contentLibraryEntries = [];

    for (const slice of slices) {
      try {
        // Store image buffer directly
        const tempFilename = `grid_${batchId}_slice_${slice.index}_${characterKey}`;
        
        // Store buffer directly using the new storeImageBuffer method
        const storedImage = await imageStorage.storeImageBuffer(
          slice.buffer,
          characterKey,
          tempFilename,
          'waiting_for_approval',
          'image/png'
        );
        if (!storedImage.success) {
          throw new Error(`Failed to store slice ${slice.index}: ${storedImage.error}`);
        }

        storedImages.push({
          slice: slice.index,
          position: slice.position,
          url: storedImage.publicUrl,
          path: storedImage.storagePath
        });

        // Add to content library for approval
        const contentData = {
          character_key: characterKey,
          content_type: 'image',
          title: `${characterKey.charAt(0).toUpperCase() + characterKey.slice(1)} - Grid Slice ${slice.index} (${slice.position})`,
          file_url: storedImage.publicUrl,
          thumbnail_url: storedImage.publicUrl,
          is_nsfw: false, // Grid slices are not NSFW by default
          metadata: {
            source: 'grid_slice',
            batch_id: batchId,
            slice_position: slice.position,
            slice_index: slice.index,
            original_grid_file: file.name,
            storage_path: storedImage.storagePath,
            slice_dimensions: {
              width: sliceWidth,
              height: sliceHeight
            },
            created_by: 'admin'
          },
          tags: tags.split(',').map(t => t.trim()),
          mood: mood,
          aesthetic: getAestheticForCharacter(characterKey),
          quality_score: 6,
          status: 'waiting_for_approval'
        };

        const { data, error } = await adminSupabase
          .from('content_library')
          .insert(contentData)
          .select()
          .single();

        if (error) {
          console.error(`Error adding slice ${slice.index} to content library:`, error);
          throw error;
        }

        contentLibraryEntries.push(data);
        console.log(`📝 Added slice ${slice.index} to approval queue: ${data.id}`);

      } catch (error) {
        console.error(`❌ Error processing slice ${slice.index}:`, error);
        // Continue with other slices even if one fails
      }
    }

    const successCount = contentLibraryEntries.length;
    const failCount = 4 - successCount;

    console.log(`✅ Grid slicing complete: ${successCount}/4 slices successful`);

    return NextResponse.json({
      success: true,
      message: `Successfully sliced grid into ${successCount} images`,
      batch_id: batchId,
      character_key: characterKey,
      slices_created: successCount,
      slices_failed: failCount,
      stored_images: storedImages,
      content_library_ids: contentLibraryEntries.map(entry => entry.id),
      debug_info: {
        original_dimensions: { width: metadata.width, height: metadata.height },
        slice_dimensions: { width: sliceWidth, height: sliceHeight },
        is_debug_mode: false
      }
    });

  } catch (error) {
    console.error('Grid slicing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getAestheticForCharacter(characterKey: string): string {
  const aestheticMap: Record<string, string> = {
    'lexi': 'glamorous',
    'nyx': 'gothic',
    'aiko': 'kawaii',
    'dom': 'masculine',
    'chase': 'athletic',
    'zaria': 'artistic',
    'chloe': 'trendy'
  };

  return aestheticMap[characterKey] || 'natural';
}