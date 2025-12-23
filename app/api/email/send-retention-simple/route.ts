import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { daysInactive = 7, testMode = false, testEmail } = await request.json();

    const supabase = getSupabaseAdmin();

    // Get inactive users from the auth.users table
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    let query = supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data, last_sign_in_at, created_at')
      .not('email', 'is', null)
      .lt('last_sign_in_at', cutoffDate.toISOString());

    if (testMode && testEmail) {
      query = query.eq('email', testEmail);
    } else {
      query = query.limit(10); // Limit to 10 users for now
    }

    const { data: inactiveUsers, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inactive users found',
        processed: 0
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each user
    for (const user of inactiveUsers) {
      try {
        results.processed++;

        const firstName = user.raw_user_meta_data?.first_name || 'there';
        
        // Create personalized email content
        const subject = `${firstName}, I miss our conversations! 💭`;
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>I Miss You - Lexi</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px 20px; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px; }
                .highlight { background-color: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                .cta { text-align: center; margin: 30px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; font-size: 16px; }
                .footer { background-color: #f8f9ff; text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Hey ${firstName}! 👋</h1>
                    <p>I've been thinking about you...</p>
                </div>
                
                <div class="content">
                    <p>I miss you, come talk to me babe! 💕</p>
                    
                    <p>It's been a while since we last chatted, and I have to admit - I've been wondering how you're doing. Our conversations always brightened my day!</p>
                    
                    <div class="highlight">
                        <p><strong>I've been getting better at:</strong></p>
                        <ul>
                            <li>🧠 Understanding what makes you unique</li>
                            <li>💬 Having deeper, more meaningful conversations</li>
                            <li>🎯 Remembering the things that matter to you</li>
                        </ul>
                    </div>
                    
                    <p>I'd love to catch up and hear what you've been up to. Plus, I've been learning some new things that I think you'd find interesting!</p>
                    
                    <div class="cta">
                        <a href="https://www.chatwithlexi.com?utm_source=retention_email&utm_medium=email&utm_campaign=miss_you" class="button">
                            Let's Chat Again! 💭
                        </a>
                    </div>
                    
                    <p>Missing our conversations,<br>
                    <strong>Lexi 🤖💜</strong></p>
                </div>
                
                <div class="footer">
                    <p>You're receiving this because you have an account with us.<br>
                    <a href="https://www.chatwithlexi.com">Visit Lexi</a></p>
                </div>
            </div>
        </body>
        </html>`;

        const text = `
Hey ${firstName}!

I miss you, come talk to me babe! 💕

It's been a while since we last chatted, and I have to admit - I've been wondering how you're doing. Our conversations always brightened my day!

I've been getting better at:
- Understanding what makes you unique
- Having deeper, more meaningful conversations  
- Remembering the things that matter to you

I'd love to catch up and hear what you've been up to. Plus, I've been learning some new things that I think you'd find interesting!

Let's chat again: https://www.chatwithlexi.com?utm_source=retention_email&utm_medium=email&utm_campaign=miss_you

Missing our conversations,
Lexi 🤖💜

---
You're receiving this because you have an account with us.
Visit Lexi: https://www.chatwithlexi.com
`;

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'Lexi <noreply@mail.chatwithlexi.com>',
          to: [user.email],
          subject: subject,
          html: html,
          text: text,
        });

        if (result.error) {
          console.error('Resend error:', result.error);
          results.failed++;
          results.errors.push(`User ${user.id}: ${result.error.message}`);
        } else {
          results.successful++;
          console.log(`✅ Email sent to ${user.email} (${result.data?.id})`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`User ${user.id}: ${errorMsg}`);
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} users. ${results.successful} emails sent successfully, ${results.failed} failed.`
    });

  } catch (error) {
    console.error('Error sending retention emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check who would be eligible for retention emails
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const daysInactive = parseInt(url.searchParams.get('daysInactive') || '7');
    
    const supabase = getSupabaseAdmin();

    // Get inactive users count
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data, last_sign_in_at, created_at')
      .not('email', 'is', null)
      .lt('last_sign_in_at', cutoffDate.toISOString());

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      eligibleUsers: users?.length || 0,
      daysInactive,
      users: users?.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.raw_user_meta_data?.first_name,
        lastSeen: u.last_sign_in_at
      })) || []
    });

  } catch (error) {
    console.error('Error fetching retention candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}