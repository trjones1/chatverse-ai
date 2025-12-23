import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { imageStorage } from '@/lib/imageStorage';

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();

    // Check authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const character = formData.get('character') as string;
    const mood = formData.get('mood') as string;
    const aesthetic = formData.get('aesthetic') as string;
    const tags = formData.get('tags') as string;
    const isNsfw = formData.get('is_nsfw') === 'true';
    const title = formData.get('title') as string;

    if (!file || !character) {
      return NextResponse.json({ error: 'File and character are required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique ID for this upload
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store the image
    const storageResult = await imageStorage.storeImageBuffer(
      buffer,
      character,
      uploadId,
      'approved', // Direct upload goes to approved since admin is uploading
      file.type
    );

    if (!storageResult.success) {
      return NextResponse.json({ error: storageResult.error || 'Failed to upload image' }, { status: 500 });
    }

    // Add to content library
    const { data: selfieData, error: dbError } = await admin
      .from('content_library')
      .insert({
        character_key: character,
        content_type: 'selfie',
        file_url: storageResult.publicUrl,
        thumbnail_url: storageResult.publicUrl, // Use same URL for thumbnail for now
        title: title || 'Uploaded Selfie',
        mood: mood || null,
        aesthetic: aesthetic || null,
        is_nsfw: isNsfw,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
        status: 'active',
        metadata: {
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
          originalFilename: file.name,
          fileSize: file.size,
          contentType: file.type
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      selfie: selfieData,
      message: 'Selfie uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}