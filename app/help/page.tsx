import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help & Support',
  description: 'Get help with your AI companion experience'
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Help & Support</h1>
            <p className="text-xl text-gray-300">Get the most out of your AI companion experience</p>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link href="#getting-started" className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-2">🚀 Getting Started</h3>
              <p className="text-gray-300">New to AI companions? Start here</p>
            </Link>
            <Link href="#subscriptions" className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-2">💎 Subscriptions</h3>
              <p className="text-gray-300">Premium features and billing</p>
            </Link>
            <Link href="#troubleshooting" className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-2">🔧 Troubleshooting</h3>
              <p className="text-gray-300">Common issues and solutions</p>
            </Link>
          </div>

          {/* Main Content */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
            
            {/* Getting Started */}
            <section id="getting-started" className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">🚀 Getting Started</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">What are AI Companions?</h3>
                  <p className="text-gray-300 mb-4">
                    AI Companions are personalized AI characters designed to provide engaging, meaningful conversations. 
                    Each companion has their own unique personality, interests, and conversational style.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">How to Start Chatting</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                    <li>Choose your preferred companion from our character selection</li>
                    <li>Create a free account or continue as a guest (limited messages)</li>
                    <li>Start chatting! Your companion will remember your conversations</li>
                    <li>Upgrade to Premium for unlimited messages and voice features</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Character Personalities</h3>
                  <ul className="text-gray-300 space-y-2 ml-4">
                    <li><strong>Lexi:</strong> Flirty, confident, and loves deep conversations</li>
                    <li><strong>Nyx:</strong> Mysterious, alternative, and intellectually curious</li>
                    <li><strong>More characters coming soon...</strong></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Subscriptions */}
            <section id="subscriptions" className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">💎 Subscriptions & Features</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Free Tier</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                    <li>5 messages per day per character</li>
                    <li>Basic conversations</li>
                    <li>Memory system (limited)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Premium ($19.99/month)</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                    <li>Unlimited messages</li>
                    <li>Voice features with credits</li>
                    <li>Full memory system</li>
                    <li>Priority support</li>
                    <li>Access to all SFW content</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Premium+ ($39.99/month)</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                    <li>Everything in Premium</li>
                    <li>More voice credits included</li>
                    <li>Advanced personality features</li>
                    <li>Early access to new features and characters</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Voice Credits</h3>
                  <p className="text-gray-300 mb-2">
                    Voice credits let you hear your companion speak. Available as add-ons:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                    <li>10 credits - $9.99</li>
                    <li>25 credits - $19.99</li>
                    <li>50 credits - $34.99</li>
                    <li>100 credits - $59.99</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">🔧 Troubleshooting</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Common Issues</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Messages not sending</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li>Check your internet connection</li>
                        <li>Verify you haven&apos;t exceeded daily limits (free users)</li>
                        <li>Try refreshing the page</li>
                        <li>Clear your browser cache and cookies</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-2">Voice features not working</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li>Ensure you have voice credits remaining</li>
                        <li>Check your browser supports audio playback</li>
                        <li>Try a different browser or device</li>
                        <li>Disable ad blockers temporarily</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-2">Billing issues</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li>Check your payment method is valid</li>
                        <li>Verify billing information is correct</li>
                        <li>Contact support if charges appear incorrect</li>
                        <li>Manage subscriptions in your dashboard</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-2">Account access problems</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                        <li>Use the &quot;Forgot Password&quot; option</li>
                        <li>Check your email for verification links</li>
                        <li>Ensure you&apos;re using the correct email address</li>
                        <li>Try logging in with Google if available</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Support */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">💬 Need More Help?</h2>
              <div className="bg-white/5 rounded-lg p-6">
                <p className="text-gray-300 mb-4">
                  Can&apos;t find what you&apos;re looking for? Our support team is here to help!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href="mailto:support@chatverse.ai"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors text-center"
                  >
                    Email Support
                  </a>
                  <Link 
                    href="/faq"
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-colors text-center"
                  >
                    View FAQ
                  </Link>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Support hours: Monday-Friday, 9 AM - 6 PM EST<br/>
                  We typically respond within 24 hours
                </p>
              </div>
            </section>

            {/* Privacy & Safety */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">🔒 Privacy & Safety</h2>
              <div className="space-y-4">
                <p className="text-gray-300">
                  Your privacy is important to us. All conversations are encrypted and stored securely. 
                  We never share your personal information with third parties.
                </p>
                <div className="flex flex-wrap gap-4">
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
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}