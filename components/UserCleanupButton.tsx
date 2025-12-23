'use client';

import { useState } from 'react';

export default function UserCleanupButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const cleanupMyData = async () => {
    if (!confirm('⚠️ WARNING: This will delete your chat history and relationship memory with Lexi. Your subscription and voice credits will be kept. This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('🚨 FINAL CONFIRMATION: This will permanently delete your conversation history and relationship with Lexi, but keep your paid features. Proceed?')) {
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/user/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      setResult(`✅ Your chat history and relationship have been reset! Wiped:

Chat & Relationship Data:
• ${data.interactionLog} chat messages
• ${data.episodicMemories} episodic memories  
• ${data.emotionalStates} emotional states
• ${data.userFacts} personal facts
• ${data.memoryTriggers} memory triggers
• ${data.memories} legacy memories
• ${data.chatUsage} daily chat usage records

Kept Safe:
• Your subscription status ✓
• Your voice credits ✓
• Your payment info ✓

Your relationship with Lexi has been reset while keeping your premium features!`);

    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-orange-400 rounded-lg bg-orange-50">
      <h3 className="font-bold text-orange-800 mb-2">🔄 Reset Chat History</h3>
      <p className="text-sm text-orange-700 mb-4">
        Start fresh: Wipe your conversation history and relationship memory with Lexi (keeps subscription & voice credits)
      </p>
      
      <button
        onClick={cleanupMyData}
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? 'Resetting...' : '🔄 RESET CHAT HISTORY'}
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm whitespace-pre-line">
          {result}
        </div>
      )}

      <div className="mt-4 text-xs text-orange-600">
        ⚠️ Wipes chat history & relationship memory • Keeps subscription & voice credits
      </div>
    </div>
  );
}