'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from '@/hooks/useAuthState';
import { isAdminUser } from '@/lib/admin';

export default function AdminCleanupButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuthState();

  useEffect(() => {
    setIsAdmin(isAdminUser(user));
  }, [user]);

  const cleanupDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL user data, subscriptions, voice credits, and memories. This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('🚨 FINAL CONFIRMATION: This will permanently delete everything. Only proceed if this is a test environment!')) {
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      setResult(`✅ NUCLEAR CLEANUP SUCCESSFUL! Deleted:

User Data:
• ${data.userSubscriptions} user subscriptions
• ${data.voiceWallets} voice wallets  
• ${data.voiceCredits} voice credits
• ${data.tipLedger} tip transactions
• ${data.chatUsage} chat usage records
• ${data.displayNames} display names

Memory System:
• ${data.interactionLog} chat messages
• ${data.episodicMemories} episodic memories
• ${data.emotionalStates} emotional states
• ${data.userFacts} user facts
• ${data.memoryTriggers} memory triggers
• ${data.memories} legacy memories

🧨 ALL USER DATA OBLITERATED! Database is clean for testing!`);

    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Only show when admin tools are enabled AND user is admin AND not in production
  if (!process.env.NEXT_PUBLIC_ENABLE_ADMIN_TOOLS || !isAdmin || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="p-4 border-2 border-red-500 rounded-lg bg-red-50">
      <h3 className="font-bold text-red-800 mb-2">🧨 NUCLEAR ADMIN TOOLS</h3>
      <p className="text-sm text-red-600 mb-4">
        <strong>MASTER WIPE:</strong> Delete EVERY user's data across ALL tables including enhanced memory system
      </p>
      
      <button
        onClick={cleanupDatabase}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'NUKING...' : '🧨 NUCLEAR WIPE ALL DATA'}
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm whitespace-pre-line">
          {result}
        </div>
      )}

      <div className="mt-4 text-xs text-red-500">
        ⚠️ Admin only • Development only • Affects ALL users
      </div>
    </div>
  );
}