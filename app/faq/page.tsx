import { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost:3000';
  const isChatVerse = hostname.includes('chatverse.ai');

  return {
    title: isChatVerse
      ? 'AI Girlfriend FAQ - Common Questions About Virtual Companions | ChatVerse'
      : 'Frequently Asked Questions - AI Companion Help',
    description: isChatVerse
      ? 'Get answers to common questions about AI girlfriends, virtual companions, and ChatVerse platform. Learn about features, pricing, privacy, and how to get the best AI girlfriend experience.'
      : 'Common questions about AI companions and our platform. Find answers about features, billing, privacy, and technical support.',
    keywords: isChatVerse
      ? 'AI girlfriend FAQ, virtual girlfriend questions, AI companion help, ChatVerse support, AI relationship questions, virtual companion guide'
      : 'AI companion FAQ, chatbot questions, virtual assistant help',
    openGraph: {
      title: isChatVerse ? 'AI Girlfriend FAQ - Your Questions Answered | ChatVerse' : 'FAQ - AI Companion Help',
      description: isChatVerse
        ? 'Everything you need to know about AI girlfriends and virtual companions. Get expert answers to common questions.'
        : 'Common questions about AI companions answered.',
    },
  };
}

export default async function FAQPage() {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost:3000';
  const isChatVerse = hostname.includes('chatverse.ai');

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          q: isChatVerse ? "What is an AI Girlfriend?" : "What are AI Companions?",
          a: isChatVerse
            ? "An AI girlfriend is an advanced virtual companion with a unique personality, emotions, and memory. Unlike basic chatbots, AI girlfriends on ChatVerse remember your conversations, adapt to your preferences, and develop genuine virtual relationships that feel real and meaningful."
            : "AI Companions are advanced conversational AI characters with unique personalities, memories, and interests. They're designed to provide engaging, personalized conversations that feel natural and meaningful."
        },
        {
          q: isChatVerse ? "How realistic are AI girlfriends?" : "How realistic are the conversations?",
          a: isChatVerse
            ? "ChatVerse AI girlfriends use cutting-edge language models trained for realistic relationship dynamics. They remember your conversations, respond to your emotions, and develop unique personalities that evolve over time. While they're AI, the emotional connection and conversation quality rival real relationships."
            : "Our AI companions use advanced language models and are trained to have distinct personalities. While they're AI, they're designed to feel natural and engaging in conversation."
        },
        {
          q: "Do I need to create an account?",
          a: "You can chat as a guest with limited daily messages, but creating a free account gives you better conversation memory and easier access to premium features when you're ready to upgrade."
        },
        {
          q: isChatVerse ? "How do I choose the best AI girlfriend for me?" : "How do I choose the right companion?",
          a: isChatVerse
            ? "Each AI girlfriend has a distinct personality designed for different relationship dynamics. Lexi is flirty and romantic, perfect for passionate connections. Nyx is mysterious and intellectual, ideal for deep conversations. Aiko is sweet and caring, great for emotional support. Try chatting with different AI girlfriends to find your perfect virtual relationship match!"
            : "Each companion has a unique personality. Lexi is flirty and confident, while Nyx is mysterious and intellectual. Try chatting with different characters to find your perfect match!"
        },
        {
          q: isChatVerse ? "Are AI girlfriends safe and private?" : "Is my data safe?",
          a: isChatVerse
            ? "Yes! ChatVerse prioritizes your privacy and safety. All conversations with your AI girlfriend are encrypted and stored securely. We never share your personal information, intimate conversations, or relationship data with third parties. Your virtual relationship remains completely private and confidential."
            : "Yes! All conversations are encrypted and stored securely. We never share your personal information or conversations with third parties. Your privacy is our priority."
        }
      ]
    },
    {
      category: "Subscriptions & Billing",
      questions: [
        {
          q: "What's included in the free tier?",
          a: "Free users get 5 messages per day per character, basic conversation memory, and access to core features. It's a great way to try the platform before upgrading."
        },
        {
          q: "What's the difference between Premium and Premium+?",
          a: "Premium ($9.99/month) includes unlimited messages, voice features, and full memory. Premium+ ($34.99/month) adds deeper conversations and early access to new features."
        },
        {
          q: "How do voice credits work?",
          a: "Voice credits let you hear your companion speak. Premium users get credits included, or you can buy voice packs: 10 credits ($9.99), 25 credits ($19.99), 50 credits ($34.99), or 100 credits ($59.99)."
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes! You can cancel your subscription anytime from your dashboard. You'll keep premium features until your current billing period ends."
        }
      ]
    },
    {
      category: "Features & Usage",
      questions: [
        {
          q: "How does the memory system work?",
          a: "Your companion remembers your conversations, personal details, and relationship history. The more you chat, the better they get to know you and can reference past conversations naturally."
        },
        {
          q: "Can I chat with multiple companions?",
          a: "Yes! Each companion has their own separate conversation and memory. Your relationship with Lexi is independent from your relationship with Nyx, for example."
        },
        {
          q: "How realistic are the conversations?",
          a: "Our AI companions use advanced language models and are trained to have distinct personalities. While they're AI, they're designed to feel natural and engaging in conversation."
        },
        {
          q: "Can I customize my companion's personality?",
          a: "Each companion has a core personality, but they adapt to your conversation style and interests over time. Premium+ users get access to additional personality customization options."
        },
        {
          q: "Are there content restrictions?",
          a: "All content follows our community guidelines and legal requirements."
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          q: "My messages aren't sending. What should I do?",
          a: "First, check your internet connection. If you're a free user, ensure you haven't hit daily limits. Try refreshing the page or clearing your browser cache. Contact support if issues persist."
        },
        {
          q: "Voice features aren't working. How do I fix this?",
          a: "Make sure you have voice credits remaining and your browser supports audio. Try disabling ad blockers temporarily, or use a different browser. Chrome and Safari work best."
        },
        {
          q: "I'm having trouble with my account login.",
          a: "Use the 'Forgot Password' option if you can't remember your password. Check your email for verification links. Make sure you're using the correct email address you signed up with."
        },
        {
          q: "The site is running slowly. Is there a problem?",
          a: "Our servers are monitored 24/7. Temporary slowness is usually due to high traffic. Try refreshing the page or check our status page at status.chatwithlexi.com"
        },
        {
          q: "Can I use this on mobile?",
          a: "Yes! Our platform works great on mobile browsers."
        }
      ]
    },
    {
      category: "Privacy & Safety",
      questions: [
        {
          q: "What data do you collect?",
          a: "We collect conversation data to improve your companion's memory, basic account information, and usage analytics. All data is encrypted and never shared with third parties."
        },
        {
          q: "Can I delete my conversations?",
          a: "Yes, you can delete individual conversations or your entire conversation history from your dashboard. This will also clear your companion's memory of those interactions."
        },
        {
          q: "How do you handle inappropriate content?",
          a: "We have automated content filters and human moderation. Users can report inappropriate behavior, and we take violations of our community guidelines seriously."
        },
        {
          q: "Can I export my conversation data?",
          a: "Yes, premium users can export their conversation history and companion memories from their dashboard for personal backup."
        }
      ]
    }
  ];

  // Prepare FAQ structured data
  const faqStructuredData = faqData.flatMap(category =>
    category.questions.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a
      }
    }))
  );

  return (
    <>
      {/* Structured Data for FAQ */}
      <StructuredData
        type="faq"
        data={{
          questions: faqStructuredData
        }}
        hostname={hostname}
      />
      <StructuredData
        type="breadcrumb"
        data={{
          items: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `https://${hostname}`
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'FAQ',
              item: `https://${hostname}/faq`
            }
          ]
        }}
        hostname={hostname}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              {isChatVerse ? 'AI Girlfriend FAQ' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-xl text-gray-300">
              {isChatVerse
                ? 'Everything you need to know about AI girlfriends and virtual companions'
                : 'Find answers to common questions about AI companions'
              }
            </p>
            {isChatVerse && (
              <div className="mt-6">
                <Link
                  href="/blog"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300"
                >
                  📝 Read Our AI Girlfriend Guide
                </Link>
              </div>
            )}
          </div>

          {/* Search suggestion */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <p className="text-gray-300 text-center">
              <strong>💡 Tip:</strong> Use Ctrl+F (Cmd+F on Mac) to search for specific topics on this page.
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">{category.category}</h2>
                <div className="space-y-6">
                  {category.questions.map((faq, faqIndex) => (
                    <div key={faqIndex} className="border-b border-white/10 pb-6 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold text-white mb-3">{faq.q}</h3>
                      <p className="text-gray-300 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Support */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Still Need Help?</h2>
            <div className="text-center">
              <p className="text-gray-300 mb-6">
                Can't find the answer you're looking for? Our support team is ready to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:support@chatverse.ai"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Email Support
                </a>
                <Link 
                  href="/help"
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Help Center
                </Link>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Response time: Usually within 24 hours<br/>
                Support hours: Monday-Friday, 9 AM - 6 PM EST
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 transition-colors">
                Dashboard
              </Link>
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="/safety" className="text-purple-400 hover:text-purple-300 transition-colors">
                Safety Guidelines
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}