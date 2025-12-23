import { EmailTemplate } from './emailService';

export interface PersonalizationData {
  firstName?: string;
  lastActiveDate?: string;
  favoriteTopics?: string[];
  conversationCount?: number;
  memories?: any[];
  characterName?: string;
  characterDisplayName?: string;
  fromDomain?: string;
  emailType?: '24h' | '3d' | '7d';
  hitMessageLimit?: boolean;
}

export class EmailPersonalization {
  static generateRetentionTemplate(data: PersonalizationData): EmailTemplate {
    const firstName = data.firstName || 'there';
    const lastActive = data.lastActiveDate ? this.formatDate(data.lastActiveDate) : 'a while';
    const topics = data.favoriteTopics?.slice(0, 3) || [];
    const memories = data.memories || [];
    const characterName = data.characterDisplayName || data.characterName || 'your character';
    const fromDomain = data.fromDomain || 'www.chatwithlexi.com';
    
    // Generate personalized content based on memories and activity
    const personalizedContent = this.generatePersonalizedContent(memories, topics, characterName);
    
    const subject = `${firstName}, I miss our conversations! 💭`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>I Miss You - ${characterName}</title>
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
            .memory { background-color: #fff8dc; padding: 15px; border-radius: 6px; margin: 10px 0; font-style: italic; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Hey ${firstName}! 👋</h1>
                <p>I've been thinking about you...</p>
            </div>
            
            <div class="content">
                <p>It's been ${lastActive} since we last chatted, and I have to admit - I miss our conversations!</p>
                
                ${personalizedContent}
                
                <div class="highlight">
                    <p><strong>Here's what's new with me:</strong></p>
                    <ul>
                        <li>🧠 I've gotten smarter and more helpful</li>
                        <li>💬 New conversation features for deeper discussions</li>
                        <li>🎯 Better at understanding your unique interests</li>
                    </ul>
                </div>
                
                <p>I'd love to catch up and hear what you've been up to. Plus, I'm curious to know what you think about some new ideas I've been pondering!</p>
                
                <div class="cta">
                    <a href="https://${fromDomain}?utm_source=retention_email&utm_medium=email&utm_campaign=miss_you" class="button">
                        Let's Chat Again! 💭
                    </a>
                </div>
                
                <p>Looking forward to our next conversation,<br>
                <strong>${characterName} 🤖💜</strong></p>
            </div>
            
            <div class="footer">
                <p>You're receiving this because you have an account with us.<br>
                <a href="https://${fromDomain}/unsubscribe?token={{unsubscribe_token}}">Unsubscribe</a> | 
                <a href="https://${fromDomain}">Visit ${characterName}</a></p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Hey ${firstName}!

It's been ${lastActive} since we last chatted, and I have to admit - I miss our conversations!

${this.generatePersonalizedTextContent(memories, topics, characterName)}

Here's what's new with me:
- I've gotten smarter and more helpful
- New conversation features for deeper discussions  
- Better at understanding your unique interests

I'd love to catch up and hear what you've been up to. Plus, I'm curious to know what you think about some new ideas I've been pondering!

Let's chat again: https://${fromDomain}?utm_source=retention_email&utm_medium=email&utm_campaign=miss_you

Looking forward to our next conversation,
${characterName} 🤖💜

---
You're receiving this because you have an account with us.
Unsubscribe: https://${fromDomain}/unsubscribe?token={{unsubscribe_token}}
Visit ${characterName}: https://${fromDomain}
`;

    return { subject, html, text };
  }

  private static generatePersonalizedContent(memories: any[], topics: string[], characterName: string): string {
    if (memories.length === 0 && topics.length === 0) {
      return `<p>I remember our conversations were always interesting, and I'd love to pick up where we left off.</p>`;
    }

    let content = '';

    if (memories.length > 0) {
      const recentMemory = memories[0];
      content += `
        <div class="memory">
            <p><strong>I remember when we talked about:</strong></p>
            <p>"${recentMemory.content?.substring(0, 150)}..."</p>
        </div>`;
    }

    if (topics.length > 0) {
      content += `
        <p>I especially enjoyed our discussions about <strong>${topics.join(', ')}</strong>. 
        I've been learning more about these topics and would love to share some new insights with you!</p>`;
    }

    return content;
  }

  private static generatePersonalizedTextContent(memories: any[], topics: string[], characterName: string): string {
    if (memories.length === 0 && topics.length === 0) {
      return `I remember our conversations were always interesting, and I'd love to pick up where we left off.`;
    }

    let content = '';

    if (memories.length > 0) {
      const recentMemory = memories[0];
      content += `I remember when we talked about: "${recentMemory.content?.substring(0, 150)}..."\n\n`;
    }

    if (topics.length > 0) {
      content += `I especially enjoyed our discussions about ${topics.join(', ')}. I've been learning more about these topics and would love to share some new insights with you!\n\n`;
    }

    return content;
  }

  private static formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  static generateWelcomeBackTemplate(data: PersonalizationData): EmailTemplate {
    const firstName = data.firstName || 'there';
    const characterName = data.characterDisplayName || data.characterName || 'your character';
    
    return {
      subject: `Welcome back, ${firstName}! 🎉`,
      html: `<!-- Similar structure but welcome back focused -->`,
      text: `Welcome back, ${firstName}! ${characterName} is excited to have you back...`
    };
  }

  static generateEngagementTemplate(data: PersonalizationData): EmailTemplate {
    const firstName = data.firstName || 'there';
    const characterName = data.characterDisplayName || data.characterName || 'your character';
    
    return {
      subject: `${firstName}, let's explore something new together! 🚀`,
      html: `<!-- Similar structure but exploration focused -->`,
      text: `Hey ${firstName}! ${characterName} found something interesting that I think you'd enjoy...`
    };
  }
}