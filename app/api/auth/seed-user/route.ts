import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const sbAdmin = getSupabaseAdmin();

export async function POST(req: Request) {
  try {
    const { email, metadata, character_key } = await req.json();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Missing email' }, { status: 400 });
    }

    if (!character_key) {
      return NextResponse.json({ ok: false, error: 'Missing character_key' }, { status: 400 });
    }

    // First, check if user already exists in auth.users
    const { data: existingUsers, error: getUserError } = await sbAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);
    
    if (existingUser) {
      // User exists - grant character access
      const { error: grantError } = await sbAdmin
        .from('user_character_access')
        .insert({
          user_id: existingUser.id,
          character_key,
          subscription_tier: 'free',
          granted_by: 'signup'
        });

      if (grantError) {
        // Check if it's a duplicate (user already has access to this character)
        if (grantError.code === '23505') {
          return NextResponse.json({ 
            ok: true, 
            status: 'character_access_exists',
            message: 'User already has access to this character'
          });
        }
        console.error('Error granting character access:', grantError);
        return NextResponse.json({ ok: false, error: 'Failed to grant character access' }, { status: 500 });
      }

      return NextResponse.json({ 
        ok: true, 
        status: 'character_access_granted',
        message: 'Character access granted to existing user'
      });
    }

    // User doesn't exist - create new auth user and grant character access
    const { data: inviteData, error: inviteError } = await sbAdmin.auth.admin.inviteUserByEmail(email, {
      data: { ...(metadata || {}), initial_character: character_key },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return NextResponse.json({ ok: false, error: inviteError.message }, { status: 500 });
    }

    if (!inviteData?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Failed to create user' }, { status: 500 });
    }

    // Grant character access to new user
    const { error: grantError } = await sbAdmin
      .from('user_character_access')
      .insert({
        user_id: inviteData.user.id,
        character_key,
        subscription_tier: 'free',
        granted_by: 'signup'
      });

    if (grantError) {
      console.error('Error granting character access to new user:', grantError);
      // Don't fail the request - user was created successfully
    }

    return NextResponse.json({ 
      ok: true, 
      status: 'user_invited_with_character_access',
      message: 'New user invited and character access granted'
    });

  } catch (err: any) {
    console.error('Unexpected error in seed-user:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
