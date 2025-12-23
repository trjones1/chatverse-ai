// app/api/admin/content/approval/route.ts
// Admin API for approving/rejecting generated images

import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { imageStorage } from '@/lib/imageStorage';

export const dynamic = 'force-dynamic';

// Get pending images for approval
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    // Use admin client to query content_library entries
    const adminSupabase = getSupabaseAdmin();
    const characterFilter = req.nextUrl.searchParams.get('character');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');

    // Get pending images from content library
    let query = adminSupabase
      .from('content_library')
      .select('*')
      .eq('status', 'waiting_for_approval')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (characterFilter) {
      query = query.eq('character_key', characterFilter);
    }

    const { data: pendingImages, error } = await query;

    if (error) {
      throw error;
    }

    // Get storage statistics
    const storageStats = await imageStorage.getStorageStats();

    // Add generation method info to each image for display
    const enrichedImages = (pendingImages || []).map(image => ({
      ...image,
      generation_info: {
        provider: image.metadata?.generation_method || image.metadata?.provider || 'unknown',
        model: image.metadata?.generation_model || image.metadata?.model || 'unknown',
        face_consistency: image.metadata?.face_consistency_method || null,
        face_similarity: image.metadata?.face_similarity_score || null,
        candidates_generated: image.metadata?.candidates_generated || null
      }
    }));

    return NextResponse.json({
      success: true,
      pending_images: enrichedImages,
      storage_stats: storageStats,
      total_pending: pendingImages?.length || 0,
      debug_info: {
        is_local_dev: false,
        debug_mode: false,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Content approval API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Approve or reject an image
export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const {
      image_id,
      action, // 'approve' or 'reject'
      reason,
      quality_score,
      add_to_selfie_bank = false,
      is_nsfw = false
    } = await req.json();

    if (!image_id || !action) {
      return NextResponse.json({ 
        error: 'image_id and action are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'action must be either "approve" or "reject"' 
      }, { status: 400 });
    }

    const querySupabase = getSupabaseAdmin();

    // Get the image record
    const { data: image, error: fetchError } = await querySupabase
      .from('content_library')
      .select('*')
      .eq('id', image_id)
      .eq('status', 'waiting_for_approval')
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ 
        error: 'Image not found or already processed' 
      }, { status: 404 });
    }

    const storagePath = image.metadata?.storage_path;
    if (!storagePath) {
      return NextResponse.json({ 
        error: 'Image storage path not found' 
      }, { status: 400 });
    }

    if (action === 'approve') {
      console.log(`✅ Approving image ${image_id} for ${image.character_key}`);

      // Move image to approved folder
      const approvalResult = await imageStorage.approveImage(
        storagePath,
        image.character_key,
        `approved_${image_id}`
      );

      if (!approvalResult.success) {
        return NextResponse.json({ 
          error: 'Failed to approve image in storage',
          details: approvalResult.error
        }, { status: 500 });
      }

      // Update database record
      const updateData: any = {
        status: 'approved',
        file_url: approvalResult.publicUrl,
        thumbnail_url: approvalResult.publicUrl,
        quality_score: quality_score || 8,
        is_nsfw: is_nsfw, // Use manual NSFW flag from admin
        updated_at: new Date().toISOString(),
        metadata: {
          ...image.metadata,
          approved_storage_path: approvalResult.storagePath,
          approval_date: new Date().toISOString(),
          approved_by: 'admin',
          manual_nsfw_flag: is_nsfw // Track that this was manually flagged
        }
      };

      const { error: updateError } = await querySupabase
        .from('content_library')
        .update(updateData)
        .eq('id', image_id);

      if (updateError) {
        console.error('Error updating approved image:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update image record' 
        }, { status: 500 });
      }

      // If requested, add to selfie bank
      let selfieResult = null;
      if (add_to_selfie_bank) {
        try {
          const { data: selfieData, error: selfieError } = await querySupabase
            .from('content_library')
            .insert({
              character_key: image.character_key,
              content_type: 'selfie',
              title: `${image.character_key.charAt(0).toUpperCase() + image.character_key.slice(1)} Selfie - ${image.mood}`,
              file_url: approvalResult.publicUrl,
              thumbnail_url: approvalResult.publicUrl,
              mood: image.mood,
              aesthetic: image.aesthetic,
              is_nsfw: is_nsfw, // Use manual NSFW flag from admin
              tags: image.tags,
              metadata: {
                source: 'generated_content',
                original_content_library_id: image_id,
                generation_prompt: image.metadata?.generation_prompt,
                approved_storage_path: approvalResult.storagePath
              },
              quality_score: quality_score || 8,
              status: 'active'
            })
            .select()
            .single();

          if (selfieError) {
            console.warn('Warning: Failed to add to selfie bank:', selfieError);
          } else {
            selfieResult = selfieData;
            console.log(`📸 Added to selfie bank: ${selfieData.id}`);
          }
        } catch (selfieError) {
          console.warn('Warning: Selfie bank addition failed:', selfieError);
        }
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        image_id,
        new_url: approvalResult.publicUrl,
        added_to_selfie_bank: !!selfieResult,
        selfie_id: selfieResult?.id
      });

    } else if (action === 'reject') {
      console.log(`❌ Rejecting image ${image_id} for ${image.character_key}: ${reason || 'No reason provided'}`);

      // Move image to rejected folder
      const rejectionResult = await imageStorage.rejectImage(
        storagePath,
        image.character_key,
        reason
      );

      if (!rejectionResult.success) {
        return NextResponse.json({ 
          error: 'Failed to reject image in storage',
          details: rejectionResult.error
        }, { status: 500 });
      }

      // Update database record
      const { error: updateError } = await querySupabase
        .from('content_library')
        .update({
          status: 'rejected',
          quality_score: quality_score || 3,
          updated_at: new Date().toISOString(),
          metadata: {
            ...image.metadata,
            rejected_storage_path: rejectionResult.storagePath,
            rejection_date: new Date().toISOString(),
            rejection_reason: reason,
            rejected_by: 'admin'
          }
        })
        .eq('id', image_id);

      if (updateError) {
        console.error('Error updating rejected image:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update image record' 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'rejected',
        image_id,
        reason
      });
    }

  } catch (error) {
    console.error('Content approval action error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Batch approve/reject multiple images
export async function PUT(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const { image_ids, action, reason } = await req.json();

    if (!image_ids || !Array.isArray(image_ids) || !action) {
      return NextResponse.json({ 
        error: 'image_ids (array) and action are required' 
      }, { status: 400 });
    }

    const results = [];
    const batchSupabase = getSupabaseAdmin();

    // Process each image
    for (const imageId of image_ids) {
      try {
        // Simulate individual POST request
        const individualResult = await fetch(`${req.url}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_id: imageId,
            action,
            reason,
            quality_score: action === 'approve' ? 7 : 3
          })
        });

        const individualData = await individualResult.json();
        results.push({
          image_id: imageId,
          success: individualData.success,
          error: individualData.error
        });

      } catch (error) {
        results.push({
          image_id: imageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      batch_action: action,
      total_processed: results.length,
      successful: successCount,
      failed: failCount,
      results
    });

  } catch (error) {
    console.error('Batch approval error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}