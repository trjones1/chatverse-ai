const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Your 3 real users - update these email addresses
const targetUsers = [
  { email: 'user1@example.com', firstName: 'User1' },
  { email: 'user2@example.com', firstName: 'User2' },
  { email: 'user3@example.com', firstName: 'User3' }
];

async function sendRetentionEmails() {
  console.log('🚀 Starting retention email campaign...');

  let successful = 0;
  let failed = 0;
  const errors = [];

  for (const user of targetUsers) {
    try {
      const firstName = user.firstName || 'there';

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
        console.error(`❌ Failed to send to ${user.email}:`, result.error);
        failed++;
        errors.push(`${user.email}: ${result.error.message}`);
      } else {
        console.log(`✅ Email sent to ${user.email} (ID: ${result.data?.id})`);
        successful++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error sending to ${user.email}:`, error);
      failed++;
      errors.push(`${user.email}: ${error.message}`);
    }
  }

  console.log('\n📊 Retention Email Campaign Results:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n🎉 Campaign completed!');
}

// Run the script
sendRetentionEmails().catch(console.error);