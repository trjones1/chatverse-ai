"use client";

import { useState } from "react";
import { useCharacter } from '@/lib/useCharacter';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const character = useCharacter();
  const SUPPORT = `${character.key}@chatverse.ai`;
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setBusy(true);
    
    try {
      // Try to send via API first
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          character: character.key,
          subject: formData.subject || 'General Inquiry'
        }),
      });

      if (response.ok) {
        toast.success('Message sent successfully! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      // Fallback to mailto
      const body = `Name: ${formData.name}
Email: ${formData.email}
Character: ${character.displayName}

${formData.message}`;
      const mailto = `mailto:${SUPPORT}?subject=${encodeURIComponent(`[Contact] ${formData.subject || 'General Inquiry'}`)}&body=${encodeURIComponent(body)}`;
      
      try {
        window.location.href = mailto;
        toast.success('Opening your email app...');
      } catch {
        toast.error('Unable to send message. Please email us directly.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="text-center mb-8 bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Get in Touch with {character.displayName}
        </h1>
        <p className="text-gray-900 text-lg">
          Have questions, feedback, or need support? We're here to help!
        </p>
        <p className="text-sm text-gray-800 mt-2">
          We typically reply within 1–2 business days.
        </p>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="name">
                Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-300 bg-white/95 backdrop-blur-sm px-4 py-3 text-black placeholder-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-200"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="email">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-300 bg-white/95 backdrop-blur-sm px-4 py-3 text-black placeholder-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-200"
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Billing, technical support, feedback, general inquiry..."
              className="w-full rounded-xl border border-gray-300 bg-white/95 backdrop-blur-sm px-4 py-3 text-black placeholder-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="message">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              required
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Tell us how we can help you..."
              className="w-full rounded-xl border border-gray-300 bg-white/95 backdrop-blur-sm px-4 py-3 text-black placeholder-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-200 resize-none"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button 
              disabled={busy} 
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Message
                </>
              )}
            </button>
            
            <div className="text-sm text-gray-800">
              Or email {character.displayName} directly at{' '}
              <a href={`mailto:${SUPPORT}`} className="text-purple-600 hover:text-purple-500 underline transition-colors">
                {SUPPORT}
              </a>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center text-sm bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-gray-800">Prefer social? Find us on social media or email us directly for immediate assistance.</p>
      </div>
    </main>
  );
}
