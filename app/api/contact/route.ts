// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

const admin = getSupabaseAdmin();
const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message, character } = await req.json();

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Store contact form submission in database for tracking (optional)
    try {
      await admin
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim(),
          subject: (subject || 'General Inquiry').trim(),
          message: message.trim(),
          character_key: character || 'lexi',
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.log('DB storage not available (table may not exist):', dbError);
      // Continue without DB storage - don't block the contact form
    }

    // Send email notification to the appropriate character email
    const characterEmails = {
      'lexi': 'lexi@chatverse.ai',
      'nyx': 'nyx@chatverse.ai',
      'aiko': 'aiko@chatverse.ai',
      'zaria': 'zaria@chatverse.ai'
    };

    const recipientEmail = characterEmails[character as keyof typeof characterEmails] || 'lexi@chatverse.ai';
    const formattedSubject = subject?.trim() || 'General Inquiry';

    try {
      // Send email via Resend
      const emailResult = await resend.emails.send({
        from: 'Contact Form <noreply@mail.chatwithlexi.com>',
        to: [recipientEmail],
        subject: `Contact Form: ${formattedSubject} - From ${name.trim()}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #ff7db5 0%, #ff69b4 100%); color: white; padding: 20px; text-align: center;">
              <h2>📧 New Contact Form Submission</h2>
              <p>From the ${character ? character.charAt(0).toUpperCase() + character.slice(1) : 'Lexi'} contact form</p>
            </div>

            <div style="padding: 20px; background: #f8f9fa; margin: 20px 0;">
              <h3>Contact Details:</h3>
              <p><strong>Name:</strong> ${name.trim()}</p>
              <p><strong>Email:</strong> ${email.trim()}</p>
              <p><strong>Subject:</strong> ${formattedSubject}</p>
              <p><strong>Character:</strong> ${character || 'lexi'}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="padding: 20px;">
              <h3>Message:</h3>
              <div style="background: white; padding: 15px; border-left: 4px solid #ff7db5; white-space: pre-wrap;">${message.trim()}</div>
            </div>

            <div style="padding: 20px; text-align: center; color: #666; border-top: 1px solid #eee;">
              <p><small>Reply directly to this email to respond to ${name.trim()}</small></p>
            </div>
          </div>
        `,
        text: `
Contact Form Submission

Name: ${name.trim()}
Email: ${email.trim()}
Subject: ${formattedSubject}
Character: ${character || 'lexi'}
Submitted: ${new Date().toLocaleString()}

Message:
${message.trim()}

Reply directly to this email to respond to ${name.trim()}
        `,
        replyTo: email.trim()
      });

      if (emailResult.error) {
        console.error('Failed to send contact email:', emailResult.error);
        // Still return success to user, but log the error
        return NextResponse.json({
          success: true,
          message: 'Thank you for contacting us! We\'ll get back to you soon.'
        });
      }

      console.log('Contact form submission sent successfully:', {
        name: name.trim(),
        email: email.trim(),
        subject: formattedSubject,
        character: character || 'lexi',
        recipientEmail,
        messageId: emailResult.data?.id
      });

    } catch (emailError) {
      console.error('Error sending contact email:', emailError);
      // Still return success to user, but log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form. Please try again.' },
      { status: 500 }
    );
  }
}