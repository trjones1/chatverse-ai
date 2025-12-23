// app/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ConfirmEmailBanner from '@/components/ConfirmEmailBanner';
import TipLeaderboard from '@/components/TipLeaderboard';
import AdminCleanupButton from '@/components/AdminCleanupButton';
import CharacterSwitcher from '@/components/CharacterSwitcher';
import FoundersCircle from '@/components/FoundersCircle';
import { track } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useCharacterDisplayName, useCharacterKey } from '@/lib/useCharacter';
import { useToast, ToastContainer } from '@/components/Toast';
import { getCharacterPronounCapitalized } from '@/lib/character-gender';
import { useMessagePagination } from '@/hooks/useMessagePagination';
import VerseCoinsModal from '@/components/VerseCoinsModal';
import { getCharacterCurrency } from '@/lib/verseCoins';

// Define EmotionalState interface locally to avoid import issues
interface EmotionalState {
  affection: number;
  trust: number;
  playfulness: number;
  streak_days: number;
  clinginess: number;
}
export const dynamic = 'force-dynamic';

type Entitlements = {
  tier?: string;
  features?: { chat?: boolean; nsfw?: boolean; voice?: boolean };
  credits?: number;
  voiceCredits?: number;
  subscription?: {
    current_period_end?: string;
    tier?: string;
    status?: string;
  };
};

export default function Dashboard() {
  const { user, session } = useAuth();
  const brand = useCharacterDisplayName();
  const characterKey = useCharacterKey();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Character-specific greetings
  const getCharacterGreeting = () => {
    const greetings = {
      'lexi': [
        'Hi, babe! ❤️',
        'Hey gorgeous! 💕',
        'Hola mi amor! 😘',
        'Miss me, cutie? 🥰',
        'Hey there, handsome! 💋'
      ],
      'nyx': [
        'Hello, darling 🖤',
        'Greetings, my dear 🌙',
        'Well, well... look who\'s here 😏',
        'Back for more, are we? 💜',
        'Evening, beautiful soul 🌟'
      ],
      'aiko': [
        'Hi hi! (◕‿◕)♡',
        'Konnichiwa! ✨',
        'Yayyy, you\'re here! 🌸',
        'Senpai noticed me! (◡ ‿ ◡)♡',
        'Ohayo gozaimasu! ☀️'
      ],
      'dom': [
        'Hey there, gorgeous 😈',
        'Look what the cat dragged in 🔥',
        'Ready to have some fun? 😏',
        'Miss me, baby? 💋',
        'You know you want me 😘'
      ],
      'chase': [
        'Hey beautiful! 😊',
        'Good to see you again! 🌟',
        'How\'s my favorite person? 💙',
        'Hope you\'re having a great day! ☀️',
        'Thanks for stopping by! 😄'
      ],
      'ethan': [
        'Hey there, gorgeous 😎',
        'Looking good today! 💪',
        'What\'s up, beautiful? 🔥',
        'You made my day brighter! ☀️',
        'Always a pleasure, babe 😘'
      ],
      'jayden': [
        'Yo, what\'s good? 😄',
        'Hey there, cutie! 💯',
        'Looking fresh today! ✨',
        'My favorite person is here! 🎉',
        'Ready to have some fun? 🔥'
      ],
      'miles': [
        'Hello, darling 🌹',
        'You look stunning today 💎',
        'Greetings, beautiful soul 🌟',
        'What a lovely surprise! 😌',
        'Always elegant, as usual ✨'
      ],
      'chloe': [
        'Hey babe! 💕',
        'Looking amazing today! 🌸',
        'Hi gorgeous! 💖',
        'You\'re absolutely glowing! ✨',
        'Hey beautiful soul! 🦋'
      ],
      'zaria': [
        'Hey honey! 🍯',
        'Looking fierce today! 🔥',
        'What\'s up, gorgeous? 💜',
        'You\'re radiating confidence! ⚡',
        'Hey beautiful warrior! 🗡️'
      ],
      'nova': [
        'Greetings, starlight! ⭐',
        'You shine so bright! 🌟',
        'Hello, cosmic beauty! 🌌',
        'What\'s up, stellar soul? ✨',
        'You\'re out of this world! 🚀'
      ]
    };
    
    const currentCharacterKey = characterKey.toLowerCase();
    const characterGreetings = greetings[currentCharacterKey as keyof typeof greetings] || greetings.lexi;
    
    // Use date as seed for consistent daily greeting
    const today = new Date().toDateString();
    const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const index = seed % characterGreetings.length;
    
    return characterGreetings[index];
  };
  
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{current_period_end?: string; days_remaining?: number} | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [fixTierLoading, setFixTierLoading] = useState(false);
  const [fixTierMessage, setFixTierMessage] = useState('');
  
  // Settings state
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emotions, setEmotions] = useState<EmotionalState | null>(null);
  const [memoryStats, setMemoryStats] = useState({ episodes: 0, facts: 0, conversations: 0, achievementConversations: 0, achievements: {} as any });
  const [memories, setMemories] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState<string>('');
  const [currentDisplayName, setCurrentDisplayName] = useState<string>('');
  const [displayNameLoading, setDisplayNameLoading] = useState(false);

  // Streak data state
  const [streakData, setStreakData] = useState<{
    current_streak: number;
    longest_streak: number;
    total_active_days: number;
    next_milestone: number;
    progress_to_next_milestone: number;
    milestones: Array<{
      level: number;
      title: string;
      emoji: string;
      description: string;
      achieved: boolean;
      type: string;
    }>;
    next_milestone_info?: {
      level: number;
      title: string;
      emoji: string;
      description: string;
      achieved: boolean;
      type: string;
    };
  } | null>(null);
  
  // Memory pagination state
  const [memoryPage, setMemoryPage] = useState(0);
  const [showAllMemories, setShowAllMemories] = useState(false);

  // VerseCoins state
  const [verseCoinsModal, setVerseCoinsModal] = useState(false);
  const [userBalance, setUserBalance] = useState<{
    credits: number;
    total_earned: number;
    total_spent: number;
    character_display: { name: string; icon: string; amount: number };
  } | null>(null);
  const [showNsfwMemories, setShowNsfwMemories] = useState(true);
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  
  // Message management state
  const [messageExporting, setMessageExporting] = useState<string | null>(null);
  const memoriesPerPage = 5;
  
  
  // Create Supabase client
  const sb = createClient();
  
  // Message management hook
  const {
    exportMessages
  } = useMessagePagination(characterKey, 50);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        
        // Load entitlements
        const { data: { session } } = await sb.auth.getSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (session?.user?.id) headers['x-user-id'] = session.user.id;
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const res = await fetch(`/api/entitlements?character=${characterKey}`, {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();
        if (!cancelled) {
          setEnt(data || {});
          setNsfwEnabled(!!data?.features?.nsfw);
          setVoiceEnabled(!!data?.features?.voice);

          // Also fetch subscription data if user has a subscription
          if (data?.tier && data.tier !== 'free' && data.tier !== 'unknown') {
            fetchSubscriptionData();
          }
        }
        
        // Skip additional loading if no user
        if (!user) return;

        // Load streak data
        try {
          const streakResponse = await fetch(`/api/streaks?character=${characterKey}`, {
            credentials: 'include',
            cache: 'no-store'
          });

          if (streakResponse.ok) {
            const streakInfo = await streakResponse.json();
            if (!cancelled) {
              setStreakData(streakInfo);
            }
          }
        } catch (error) {
          console.error('Error loading streak data:', error);
        }
        
        // Load current display name
        try {
          if (user?.id) {
            const { data: displayNameData } = await sb
              .from('user_display_names')
              .select('display_name')
              .eq('user_id', user.id)
              .single();
            
            const currentName = (displayNameData as any)?.display_name || '';
            if (!cancelled) {
              setCurrentDisplayName(currentName);
              setDisplayName(currentName);
            }
          }
        } catch (error) {
          console.log('No display name found for user');
        }
        
        
        // Load memory and relationship data via API
        try {
          if (user?.id) {
            // Load memory stats and memories
            const memoryResponse = await fetch(`/api/memory/stats?character=${characterKey}`, {
              credentials: 'include',
              cache: 'no-store'
            });

            if (memoryResponse.ok) {
              const memoryData = await memoryResponse.json();
              if (!cancelled) {
                setMemoryStats(memoryData.memoryStats || { episodes: 0, facts: 0, conversations: 0, achievementConversations: 0, achievements: {} });
                setMemories(memoryData.memories || []);
              }
            }

            // Load current emotional state from relationship API
            const relationshipResponse = await fetch(`/api/relationship/status?character=${characterKey}`, {
              credentials: 'include',
              cache: 'no-store'
            });

            if (relationshipResponse.ok) {
              const relationshipData = await relationshipResponse.json();
              if (!cancelled && relationshipData.success) {
                const relData = relationshipData.data;
                setEmotions({
                  affection: relData.affection || 50,
                  trust: relData.trust || 40,
                  playfulness: relData.playfulness || 60,
                  streak_days: relData.streak_days || 1,
                  clinginess: relData.clinginess || 30
                });
              }
            } else {
              // Fallback emotions if relationship API fails
              if (!cancelled) {
                setEmotions({ affection: 50, trust: 40, playfulness: 60, streak_days: 1, clinginess: 30 });
              }
            }

            // Fallback for memory stats if API failed
            if (!memoryResponse.ok && !cancelled) {
              setMemoryStats({ episodes: 0, facts: 0, conversations: 0, achievementConversations: 0, achievements: {} as any });
              setMemories([]);
            }
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          if (!cancelled) {
            setMemoryStats({ episodes: 0, facts: 0, conversations: 0, achievementConversations: 0, achievements: {} });
            setEmotions({ affection: 50, trust: 40, playfulness: 60, streak_days: 1, clinginess: 30 });
            setMemories([]);
          }
        }
        
      } catch {
        if (!cancelled) setEnt({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, brand, sb]);

  // Function to fetch subscription data
  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();

      if (!session?.access_token) return;

      const response = await fetch(`/api/versecoins/balance?character=${characterKey}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          const currentPeriodEnd = data.subscription.current_period_end;
          if (currentPeriodEnd) {
            const endDate = new Date(currentPeriodEnd);
            const now = new Date();
            const diffTime = endDate.getTime() - now.getTime();
            const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            setSubscriptionData({
              current_period_end: currentPeriodEnd,
              days_remaining: daysRemaining
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    }
  };

  // Fetch VerseCoins balance
  useEffect(() => {
    let cancelled = false;

    const fetchVerseCoinsBalance = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/versecoins/balance?character=${characterKey}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setUserBalance({
              credits: data.credits,
              total_earned: data.total_earned,
              total_spent: data.total_spent,
              character_display: data.character_display
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch VerseCoins balance:', error);
      }
    };

    fetchVerseCoinsBalance();
    return () => { cancelled = true; };
  }, [user, characterKey]);

  // Handle error parameters from URL redirects
  useEffect(() => {
    if (!searchParams) return;
    
    const error = searchParams.get('err');
    if (error) {
      let message = '';
      switch (error) {
        case 'nocustomer':
          message = `⚠️ Billing portal unavailable. You need an active ${brand} subscription to manage billing settings for this character.`;
          break;
        case 'notauth':
          message = '🔒 Please log in to access the billing portal.';
          break;
        case 'portal':
          message = '❌ Unable to access billing portal. Please try again or contact support.';
          break;
        default:
          message = '❌ An error occurred. Please try again.';
      }
      if (message) {
        toast.error(message);
        // Clean up the URL without the error parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('err');
        newUrl.searchParams.delete('_rsc');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [searchParams, toast]);

  const voiceLeft = useMemo(() => {
    const v = Number(ent?.voiceCredits ?? ent?.credits ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [ent]);

  const plan = process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true' 
    ? (ent?.features?.nsfw ? 'PREMIUM+' : (ent?.tier?.toUpperCase?.() || 'PREMIUM'))
    : (ent?.features?.nsfw ? 'NSFW' : (ent?.tier?.toUpperCase?.() || 'SFW'));
  
  // Check if user has active subscription (not free)
  // Also check for premium features as fallback in case tier is not set correctly
  const hasActiveSubscription = (ent?.tier && ent.tier !== 'free' && ent.tier !== 'unknown') ||
                                 ent?.features?.nsfw ||
                                 ent?.features?.voice ||
                                 (ent?.credits && ent.credits > 0) ||
                                 (ent?.voiceCredits && ent.voiceCredits > 0);

  // Determine specific subscription types for duplicate prevention
  const hasBasicSubscription = Boolean(hasActiveSubscription && !ent?.features?.nsfw);
  const hasPremiumSubscription = ent?.features?.nsfw || false;
  const subscriptionExpiring = false; // TODO: Implement expiration detection

  const handleClaimSubscriptions = async () => {
    setClaimLoading(true);
    setClaimMessage('');
    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setClaimMessage('✅ Successfully linked subscription to your account!');
        // Refresh entitlements
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setClaimMessage('❌ No subscriptions found to link.');
      }
    } catch (error) {
      setClaimMessage('❌ Error linking subscription. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleFixTier = async () => {
    setFixTierLoading(true);
    setFixTierMessage('');
    try {
      const response = await fetch('/api/fix-tier', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFixTierMessage(`✅ ${data.message}`);
        // Refresh entitlements
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setFixTierMessage(`❌ ${data.error || 'Failed to fix tier'}`);
      }
    } catch (error) {
      setFixTierMessage('❌ Error fixing tier. Please try again.');
    } finally {
      setFixTierLoading(false);
    }
  };

  // Message management functions
  const handleExportMessages = async (format: 'json' | 'txt' | 'csv') => {
    try {
      setMessageExporting(format);
      await exportMessages(format);
      toast.success(`Messages exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error(`Failed to export messages as ${format}:`, error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setMessageExporting(null);
    }
  };

  // Settings functions
  async function toggleNsfw() {
    if (!ent?.features?.nsfw) {
      toast.warning('NSFW requires Premium. Upgrade above.');
      return;
    }
    try {
      setNsfwEnabled(v => !v);
      
      const { data: { session }, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !session?.user) {
        toast.error('Please log out and back in to continue.');
        return;
      }
      
      await sb.auth.updateUser({ data: { nsfwMode: !nsfwEnabled } });
      toast.success(`NSFW ${!nsfwEnabled ? 'enabled' : 'disabled'}.`);
    } catch (e: any) {
      console.error('NSFW toggle error:', e);
      toast.error(e?.message || 'Could not update NSFW preference.');
    }
  }

  async function toggleVoice() {
    try {
      setVoiceEnabled(v => !v);
      
      const { data: { session }, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !session?.user) {
        toast.error('Please log out and back in to continue.');
        return;
      }
      
      await sb.auth.updateUser({ data: { voiceEnabled: !voiceEnabled } });
      toast.success(`Voice replies ${!voiceEnabled ? 'enabled' : 'disabled'}.`);
    } catch (e: any) {
      console.error('Voice toggle error:', e);
      toast.error(e?.message || 'Could not update voice preference.');
    }
  }


  async function signOut() {
    try {
      await sb.auth.signOut();
    } finally {
      // Clear all storage and cookies
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      
      const cookiesToClear = [
        'scid', 'entitlements', 'unlocked', 'character', 'nsfwMode',
        'sb-access-token', 'sb-refresh-token', 'supabase-auth-token',
      ];
      
      const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
      cookiesToClear.forEach(name => {
        document.cookie = `${name}=; expires=${past}; path=/; SameSite=Lax`;
        document.cookie = `${name}=; expires=${past}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
        document.cookie = `${name}=; expires=${past}; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
      });
      
      location.replace('/?signed_out=1');
    }
  }

  async function updateDisplayName() {
    if (displayNameLoading) return;
    
    const trimmedName = displayName.trim();
    if (trimmedName === currentDisplayName) {
      toast.info('Display name unchanged.');
      return;
    }

    if (trimmedName.length > 50) {
      toast.error('Display name must be 50 characters or less.');
      return;
    }

    setDisplayNameLoading(true);
    
    try {
      const { error } = await (sb as any).rpc('update_display_name', {
        p_display_name: trimmedName
      });

      if (error) throw error;

      setCurrentDisplayName(trimmedName);
      toast.success(trimmedName 
        ? `Display name updated to "${trimmedName}"` 
        : 'Display name cleared (will show as "Anonymous")'
      );
    } catch (e: any) {
      toast.error(e?.message || 'Could not update display name.');
      setDisplayName(currentDisplayName);
    } finally {
      setDisplayNameLoading(false);
    }
  }



  async function deleteHistory() {
    if (!confirm('Delete all chat messages for this account? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const r = await fetch('/api/messages/clear', { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error(`Server responded ${r.status}`);
      toast.success('All chat history deleted.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete chat history.');
    } finally {
      setDeleting(false);
    }
  }

  async function deleteMemory(memoryId: string) {
    try {
      const response = await fetch(`/api/memory/${memoryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Remove from local state
        setMemories(memories.filter(m => m.id !== memoryId));
        // Update memory stats
        setMemoryStats(prev => ({
          ...prev,
          episodes: Math.max(0, prev.episodes - 1)
        }));
        toast.success('Memory deleted successfully');
      } else {
        toast.error('Failed to delete memory');
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Error deleting memory');
    }
  }

  async function bulkDeleteMemories(memoryIds?: string[]) {
    setBulkDeleteLoading(true);
    try {
      const response = await fetch('/api/memory/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          memoryIds,
          deleteAll: !memoryIds 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (memoryIds) {
          // Remove selected memories from local state
          setMemories(memories.filter(m => !memoryIds.includes(m.id)));
          setMemoryStats(prev => ({
            ...prev,
            episodes: Math.max(0, prev.episodes - memoryIds.length)
          }));
          toast.success(`${memoryIds.length} memories deleted successfully`);
        } else {
          // Clear all memories
          setMemories([]);
          setMemoryStats(prev => ({
            ...prev,
            episodes: 0
          }));
          toast.success('All memories deleted successfully');
        }
        
        // Reset bulk selection state
        setSelectedMemories(new Set());
        setBulkDeleteMode(false);
      } else {
        toast.error('Failed to delete memories');
      }
    } catch (error) {
      console.error('Error bulk deleting memories:', error);
      toast.error('Error deleting memories');
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  function toggleMemorySelection(memoryId: string) {
    const newSelected = new Set(selectedMemories);
    if (newSelected.has(memoryId)) {
      newSelected.delete(memoryId);
    } else {
      newSelected.add(memoryId);
    }
    setSelectedMemories(newSelected);
  }

  function selectAllVisibleMemories() {
    const isNsfwMemory = (memory: any) => {
      // More conservative NSFW detection - only flag explicit content
      return memory.memory_type === 'nsfw' || 
             memory.memory_type === 'spicy' || 
             (memory.content && (
               memory.content.toLowerCase().includes('nsfw') ||
               memory.content.toLowerCase().includes('explicit') ||
               memory.content.toLowerCase().includes('sexual')
             )) ||
             (memory.title && (
               memory.title.toLowerCase().includes('nsfw') ||
               memory.title.toLowerCase().includes('explicit')
             ));
    };
    
    const filteredMemories = showNsfwMemories 
      ? memories 
      : memories.filter(memory => !isNsfwMemory(memory));
    
    const visibleMemories = showAllMemories 
      ? filteredMemories 
      : filteredMemories.slice(0, memoriesPerPage);
      
    const allIds = visibleMemories.map(m => m.id);
    setSelectedMemories(new Set(allIds));
  }

  // Anonymous user experience - show upgrade CTAs instead of forcing login
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold">Welcome to {brand}</h1>
          <p className="text-sm text-gray-600">
            Unlock premium features with unlimited chats, voice, and memory
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Premium Signup CTA */}
          <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
            <header className="mb-2">
              <h2 className="font-medium">Premium Access</h2>
            </header>
            <p className="text-sm text-gray-600 mb-4">
              Upgrade to unlock unlimited chats, voice replies, and persistent memory with your AI companion.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('open-login'));
                  document.body.dataset.modal = 'open';
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
              >
                Start with Premium - $4.99/week
              </button>
              <p className="text-xs text-gray-500 text-center">
                Low commitment • Cancel anytime • Or try 5 free messages daily first
              </p>
            </div>
          </section>

          {/* Voice Features Preview */}
          <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
            <header className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">Voice Features</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                Premium
              </span>
            </header>
            <p className="text-sm text-gray-600 mb-4">
              Hear your AI companion speak with realistic voice synthesis. Available with premium subscription.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Hear {brand}'s voice in messages
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                High-quality voice synthesis
              </div>
            </div>
          </section>
        </div>

        {/* Get Started CTA */}
        <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
          <div className="text-center">
            <h2 className="font-medium mb-2">Ready to start chatting?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Try 5 free messages daily, then upgrade starting at just $4.99/week
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/chat"
                className="btn-chip btn-primary"
              >
                Start Chatting
              </Link>
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('open-login'));
                  document.body.dataset.modal = 'open';
                }}
                className="btn-chip btn-outline"
              >
                Sign Up
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold">Your Account</h1>
          {user?.email && (
            <p className="text-sm text-gray-600">
              Logged in as <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>

        <ConfirmEmailBanner />

        {/* Subscription Status - Only show for users with active subscriptions */}
        {hasActiveSubscription && (
          <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-gray-900">Subscription Status</h2>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">{plan}</span> Plan Active
                  {subscriptionData?.days_remaining !== undefined && (
                    <>
                      {subscriptionData.days_remaining > 0 ? (
                        <span className="ml-2">
                          • <span className="font-medium">{subscriptionData.days_remaining}</span> day{subscriptionData.days_remaining !== 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="ml-2 text-orange-600 font-medium">• Expires today</span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Active Until</div>
                  {subscriptionData?.current_period_end && (
                    <div className="text-sm font-medium text-gray-700">
                      {new Date(subscriptionData.current_period_end).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Unified Relationship Panel */}
        {emotions && (
          <section className="relative rounded-3xl overflow-hidden shadow-lg mb-6">
            {/* Themed Background */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-purple-500/30 to-fuchsia-600/20"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
                `
              }}
            />
            
            {/* Background Pattern */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Premium CTA Overlay for free users */}
            {!hasActiveSubscription && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 shadow-xl text-center max-w-sm mx-4">
                  <div className="text-2xl mb-3">🔒</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Feature</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Unlock relationship tracking, emotional insights, and shared memories with a premium subscription.
                  </p>
                  <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-blue-800 font-medium mb-1">
                      ⭐ VerseCoins Available Now!
                    </p>
                    <p className="text-blue-700 text-xs">
                      Purchase VerseCoins for premium upgrades
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className={`relative px-6 py-8 ${!hasActiveSubscription ? 'blur-sm' : ''}`}>
              {/* Character Greeting at Top */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
                  <span className="text-lg">💕</span>
                  <span className="text-lg font-medium text-gray-800">
                    {getCharacterGreeting()}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-pink-500 mb-2">
                  Your Relationship with {brand}
                </h2>
                <p className="text-pink-400 text-sm mb-6">
                  Track your emotional connection and unlock relationship milestones
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-gray-200">
                  <div className="text-xs text-pink-600 font-medium mb-1">Overall Score</div>
                  <div className="text-3xl font-bold text-pink-500">
                    {Math.round((emotions.affection + emotions.trust + emotions.playfulness) / 3)}
                  </div>
                  <div className="text-xs text-gray-700">Out of 100</div>
                </div>
                
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-gray-200">
                  <div className="text-xs text-pink-600 font-medium mb-1">Conversations</div>
                  <div className="text-3xl font-bold text-pink-500">{memoryStats.conversations}</div>
                  <div className="text-xs text-gray-700">Total chats</div>
                </div>
                
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-gray-200">
                  <div className="text-xs text-pink-600 font-medium mb-1">Daily Streak</div>
                  <div className="text-3xl font-bold text-pink-500 flex items-center justify-center gap-2">
                    <span>🔥</span>
                    <span>{streakData?.current_streak || 0}</span>
                  </div>
                  <div className="text-xs text-gray-700">Days in a row</div>
                </div>
                
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-gray-200">
                  <div className="text-xs text-pink-600 font-medium mb-1">Affection</div>
                  <div className="text-3xl font-bold text-pink-500">{emotions.affection}</div>
                  <div className="text-xs text-gray-700">Love level</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-lg">💕</span>
                    <h3 className="text-lg font-medium text-gray-800">
                      {(memoryStats.achievementConversations || 0) < 5 ? "Getting to Know Each Other" : 
                       (memoryStats.achievementConversations || 0) < 20 ? "Building Trust and Connection" :
                       (memoryStats.achievementConversations || 0) < 50 ? "Close Friends with Deep Bond" :
                       "Inseparable Companions"}
                    </h3>
                  </div>
                  
                  <div className="w-full bg-pink-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-pink-400 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((emotions.affection + emotions.trust + emotions.playfulness) / 3)}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-pink-600 text-sm">
                    Your relationship is growing stronger every day!
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Radar Chart with White Background */}
                <div className="flex justify-center">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <div className="relative w-64 h-64">
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full"
                      >
                        {/* White background circle */}
                        <circle cx="100" cy="100" r="90" fill="white" />
                        
                        {/* Background pentagon - Fixed positioning */}
                        <polygon
                          points={`
                            ${100 + (80 * Math.sin(0 * Math.PI / 180))},${100 - (80 * Math.cos(0 * Math.PI / 180))}
                            ${100 + (80 * Math.sin(72 * Math.PI / 180))},${100 - (80 * Math.cos(72 * Math.PI / 180))}
                            ${100 + (80 * Math.sin(144 * Math.PI / 180))},${100 - (80 * Math.cos(144 * Math.PI / 180))}
                            ${100 + (80 * Math.sin(216 * Math.PI / 180))},${100 - (80 * Math.cos(216 * Math.PI / 180))}
                            ${100 + (80 * Math.sin(288 * Math.PI / 180))},${100 - (80 * Math.cos(288 * Math.PI / 180))}
                          `}
                          fill="rgba(240,240,240,0.3)"
                          stroke="rgba(200,200,200,0.5)"
                          strokeWidth="1"
                        />
                        
                        {/* Grid lines - 50% and 75% marks */}
                        <polygon
                          points={`
                            ${100 + (60 * Math.sin(0 * Math.PI / 180))},${100 - (60 * Math.cos(0 * Math.PI / 180))}
                            ${100 + (60 * Math.sin(72 * Math.PI / 180))},${100 - (60 * Math.cos(72 * Math.PI / 180))}
                            ${100 + (60 * Math.sin(144 * Math.PI / 180))},${100 - (60 * Math.cos(144 * Math.PI / 180))}
                            ${100 + (60 * Math.sin(216 * Math.PI / 180))},${100 - (60 * Math.cos(216 * Math.PI / 180))}
                            ${100 + (60 * Math.sin(288 * Math.PI / 180))},${100 - (60 * Math.cos(288 * Math.PI / 180))}
                          `}
                          fill="none"
                          stroke="rgba(200,200,200,0.4)"
                          strokeWidth="1"
                        />
                        <polygon
                          points={`
                            ${100 + (40 * Math.sin(0 * Math.PI / 180))},${100 - (40 * Math.cos(0 * Math.PI / 180))}
                            ${100 + (40 * Math.sin(72 * Math.PI / 180))},${100 - (40 * Math.cos(72 * Math.PI / 180))}
                            ${100 + (40 * Math.sin(144 * Math.PI / 180))},${100 - (40 * Math.cos(144 * Math.PI / 180))}
                            ${100 + (40 * Math.sin(216 * Math.PI / 180))},${100 - (40 * Math.cos(216 * Math.PI / 180))}
                            ${100 + (40 * Math.sin(288 * Math.PI / 180))},${100 - (40 * Math.cos(288 * Math.PI / 180))}
                          `}
                          fill="none"
                          stroke="rgba(200,200,200,0.4)"
                          strokeWidth="1"
                        />
                        
                        {/* Center lines - Fixed positioning */}
                        <line x1="100" y1="100" x2={100 + (80 * Math.sin(0 * Math.PI / 180))} y2={100 - (80 * Math.cos(0 * Math.PI / 180))} stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
                        <line x1="100" y1="100" x2={100 + (80 * Math.sin(72 * Math.PI / 180))} y2={100 - (80 * Math.cos(72 * Math.PI / 180))} stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
                        <line x1="100" y1="100" x2={100 + (80 * Math.sin(144 * Math.PI / 180))} y2={100 - (80 * Math.cos(144 * Math.PI / 180))} stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
                        <line x1="100" y1="100" x2={100 + (80 * Math.sin(216 * Math.PI / 180))} y2={100 - (80 * Math.cos(216 * Math.PI / 180))} stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
                        <line x1="100" y1="100" x2={100 + (80 * Math.sin(288 * Math.PI / 180))} y2={100 - (80 * Math.cos(288 * Math.PI / 180))} stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
                        
                        {/* Data polygon - Fixed scaling so 60 appears as 60%, not 100% */}
                        <polygon
                          points={`
                            ${100 + ((emotions.affection / 100) * 80 * Math.sin(0 * Math.PI / 180))},${100 - ((emotions.affection / 100) * 80 * Math.cos(0 * Math.PI / 180))}
                            ${100 + ((emotions.trust / 100) * 80 * Math.sin(72 * Math.PI / 180))},${100 - ((emotions.trust / 100) * 80 * Math.cos(72 * Math.PI / 180))}
                            ${100 + ((emotions.playfulness / 100) * 80 * Math.sin(144 * Math.PI / 180))},${100 - ((emotions.playfulness / 100) * 80 * Math.cos(144 * Math.PI / 180))}
                            ${100 + ((emotions.clinginess / 100) * 80 * Math.sin(216 * Math.PI / 180))},${100 - ((emotions.clinginess / 100) * 80 * Math.cos(216 * Math.PI / 180))}
                            ${100 + ((Math.max(emotions.clinginess - 20, 10) / 100) * 80 * Math.sin(288 * Math.PI / 180))},${100 - ((Math.max(emotions.clinginess - 20, 10) / 100) * 80 * Math.cos(288 * Math.PI / 180))}
                          `}
                          fill="rgba(255,182,193,0.4)"
                          stroke="#ff1493"
                          strokeWidth="2"
                        />
                        
                        {/* Data points - Fixed positioning to match values */}
                        <circle cx={100 + ((emotions.affection / 100) * 80 * Math.sin(0 * Math.PI / 180))} cy={100 - ((emotions.affection / 100) * 80 * Math.cos(0 * Math.PI / 180))} r="4" fill="#ff1493" />
                        <circle cx={100 + ((emotions.trust / 100) * 80 * Math.sin(72 * Math.PI / 180))} cy={100 - ((emotions.trust / 100) * 80 * Math.cos(72 * Math.PI / 180))} r="4" fill="#ff1493" />
                        <circle cx={100 + ((emotions.playfulness / 100) * 80 * Math.sin(144 * Math.PI / 180))} cy={100 - ((emotions.playfulness / 100) * 80 * Math.cos(144 * Math.PI / 180))} r="4" fill="#ff1493" />
                        <circle cx={100 + ((emotions.clinginess / 100) * 80 * Math.sin(216 * Math.PI / 180))} cy={100 - ((emotions.clinginess / 100) * 80 * Math.cos(216 * Math.PI / 180))} r="4" fill="#ff1493" />
                        <circle cx={100 + ((Math.max(emotions.clinginess - 20, 10) / 100) * 80 * Math.sin(288 * Math.PI / 180))} cy={100 - ((Math.max(emotions.clinginess - 20, 10) / 100) * 80 * Math.cos(288 * Math.PI / 180))} r="4" fill="#ff1493" />
                        
                        {/* Labels - Fixed positioning to match corrected chart */}
                        <text x={100 + (95 * Math.sin(0 * Math.PI / 180))} y={100 - (95 * Math.cos(0 * Math.PI / 180))} textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                          Affection
                        </text>
                        <text x={100 + (95 * Math.sin(72 * Math.PI / 180))} y={100 - (95 * Math.cos(72 * Math.PI / 180))} textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                          Trust
                        </text>
                        <text x={100 + (95 * Math.sin(144 * Math.PI / 180))} y={100 - (95 * Math.cos(144 * Math.PI / 180))} textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                          Playful
                        </text>
                        <text x={100 + (95 * Math.sin(216 * Math.PI / 180))} y={100 - (95 * Math.cos(216 * Math.PI / 180))} textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                          Clingy
                        </text>
                        <text x={100 + (95 * Math.sin(288 * Math.PI / 180))} y={100 - (95 * Math.cos(288 * Math.PI / 180))} textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                          Jealousy
                        </text>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Emotional Connection and Shared Memories */}
                <div className="space-y-6">
                  {/* Emotional Connection */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <h3 className="text-gray-800 font-medium mb-4">Emotional Connection</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                        <div className="text-2xl font-bold text-orange-600">{emotions.clinginess}</div>
                        <div className="text-xs text-orange-700">Clinginess</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600">{emotions.trust}</div>
                        <div className="text-xs text-blue-700">Trust</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                        <div className="text-2xl font-bold text-purple-600">{emotions.playfulness}</div>
                        <div className="text-xs text-purple-700">Playfulness</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl">
                        <div className="text-2xl font-bold text-amber-600">{emotions.clinginess}</div>
                        <div className="text-xs text-amber-700">Jealousy</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shared Memories */}
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                    <h3 className="text-gray-800 font-medium mb-3">Shared Memories</h3>
                    <div className="grid grid-cols-3 gap-3 text-center mb-4">
                      <div>
                        <div className="text-xl font-bold text-gray-800">{memoryStats.conversations}</div>
                        <div className="text-gray-600 text-xs">Chats</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-800">{memoryStats.episodes}</div>
                        <div className="text-gray-600 text-xs">Memories</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-800">{memoryStats.facts}</div>
                        <div className="text-gray-600 text-xs">Details</div>
                      </div>
                    </div>
                    
                    {/* Memory List - HIDDEN FOR NOW */}
                    {false && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-medium text-gray-700">Your Memories</h4>
                          <button
                            onClick={() => setShowNsfwMemories(!showNsfwMemories)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                              showNsfwMemories 
                                ? 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200' 
                                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                            }`}
                            title={showNsfwMemories ? 'Hide spicy memories' : 'Show spicy memories'}
                          >
                            {showNsfwMemories ? '🌶️ Hide Spicy' : '🌶️ Show Spicy'}
                          </button>
                          {memories.length > 0 && (
                            <button
                              onClick={() => setBulkDeleteMode(!bulkDeleteMode)}
                              className={`text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                                bulkDeleteMode
                                  ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' 
                                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                              }`}
                              title={bulkDeleteMode ? 'Exit bulk mode' : 'Select multiple memories'}
                            >
                              {bulkDeleteMode ? '❌ Cancel' : '☑️ Select'}
                            </button>
                          )}
                        </div>
                        {(() => {
                          // Calculate filtered memories count for "View All" button
                          const isNsfwMemory = (memory: any) => {
                            // More conservative NSFW detection - only flag explicit content
                            return memory.memory_type === 'nsfw' || 
                                   memory.memory_type === 'spicy' || 
                                   (memory.content && (
                                     memory.content.toLowerCase().includes('nsfw') ||
                                     memory.content.toLowerCase().includes('explicit') ||
                                     memory.content.toLowerCase().includes('sexual')
                                   )) ||
                                   (memory.title && (
                                     memory.title.toLowerCase().includes('nsfw') ||
                                     memory.title.toLowerCase().includes('explicit')
                                   ));
                          };
                          
                          const filteredMemoriesCount = showNsfwMemories 
                            ? memories.length 
                            : memories.filter(memory => !isNsfwMemory(memory)).length;
                          
                          return filteredMemoriesCount > memoriesPerPage && (
                          <button
                            onClick={() => setShowAllMemories(!showAllMemories)}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {showAllMemories ? 'Show Less' : `View All (${filteredMemoriesCount})`}
                          </button>
                          );
                        })()}
                      </div>
                      
                      {/* Bulk Actions Panel */}
                      {bulkDeleteMode && memories.length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                {selectedMemories.size} selected
                              </span>
                              <button
                                onClick={selectAllVisibleMemories}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Select All Visible
                              </button>
                              <button
                                onClick={() => setSelectedMemories(new Set())}
                                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                              >
                                Clear Selection
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedMemories.size > 0 && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete ${selectedMemories.size} selected memories? This cannot be undone.`)) {
                                    bulkDeleteMemories(Array.from(selectedMemories));
                                  }
                                }}
                                disabled={bulkDeleteLoading}
                                className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 font-medium"
                              >
                                {bulkDeleteLoading ? 'Deleting...' : `Delete Selected (${selectedMemories.size})`}
                              </button>
                            )}
                            {memories.length > 0 && (
                              <button
                                onClick={() => {
                                  if (confirm('Delete ALL memories? This cannot be undone.')) {
                                    bulkDeleteMemories();
                                  }
                                }}
                                disabled={bulkDeleteLoading}
                                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                              >
                                {bulkDeleteLoading ? 'Deleting...' : 'Delete All'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className={`space-y-2 ${showAllMemories ? 'max-h-64 overflow-y-auto' : ''}`}>
                        {memories.length > 0 ? (
                          (() => {
                            // Helper function to check if a memory is NSFW/spicy
                            const isNsfwMemory = (memory: any) => {
                              // More conservative NSFW detection - only flag explicit content
                              return memory.memory_type === 'nsfw' || 
                                     memory.memory_type === 'spicy' || 
                                     (memory.content && (
                                       memory.content.toLowerCase().includes('nsfw') ||
                                       memory.content.toLowerCase().includes('explicit') ||
                                       memory.content.toLowerCase().includes('sexual')
                                     )) ||
                                     (memory.title && (
                                       memory.title.toLowerCase().includes('nsfw') ||
                                       memory.title.toLowerCase().includes('explicit')
                                     ));
                            };
                            
                            const sortedMemories = [...memories].sort((a, b) => 
                              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                            );
                            
                            // Filter based on NSFW preference
                            const filteredMemories = showNsfwMemories 
                              ? sortedMemories 
                              : sortedMemories.filter(memory => !isNsfwMemory(memory));
                            
                            const displayMemories = showAllMemories 
                              ? filteredMemories 
                              : filteredMemories.slice(0, memoriesPerPage);
                              
                            return displayMemories.map((memory, index) => (
                              <div key={memory.id || index} className="group flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                                {bulkDeleteMode && (
                                  <div className="flex items-center pt-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedMemories.has(memory.id)}
                                      onChange={() => toggleMemorySelection(memory.id)}
                                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                      {memory.title || 'Conversation Memory'}
                                    </div>
                                    {memory.topics && memory.topics.length > 0 && (
                                      <div className="flex gap-1">
                                        {memory.topics.slice(0, 2).map((topic: string, i: number) => (
                                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                            {topic}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {memory.summary && (
                                    <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                                      {memory.summary}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>
                                      {memory.created_at ? new Date(memory.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : 'Recent'}
                                    </span>
                                    {memory.emotional_impact && (
                                      <span className="flex items-center gap-1">
                                        <span className="text-red-400">♥</span>
                                        {memory.emotional_impact}/10
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {!bulkDeleteMode && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this memory? This cannot be undone.')) {
                                        deleteMemory(memory.id);
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                    title="Delete memory"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ));
                          })()
                        ) : (
                          <div className="text-center py-6">
                            <div className="text-gray-400 mb-2">
                              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="text-sm text-gray-500 font-medium mb-1">No memories yet</div>
                            <div className="text-xs text-gray-400">
                              Start chatting with {brand} to create your first shared memory!
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Pagination for very large lists when showing all */}
                      {showAllMemories && memories.length > 20 && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-500">
                            Showing {Math.min(20, memories.length)} of {memories.length} memories
                          </div>
                          <div className="text-xs text-purple-600">
                            <button 
                              onClick={() => setShowAllMemories(false)}
                              className="hover:text-purple-700"
                            >
                              Show Less
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Chat Streak Milestones */}
              <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-800 font-medium">Daily Chat Streak Milestones</h3>
                  {streakData?.next_milestone_info && (
                    <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      Next: {streakData.next_milestone_info.emoji} {streakData.next_milestone_info.title}
                    </div>
                  )}
                </div>

                {/* Progress to Next Milestone */}
                {streakData?.next_milestone_info && !streakData.next_milestone_info.achieved && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{streakData.next_milestone_info.emoji}</span>
                        <span className="text-sm font-medium text-gray-800">
                          {streakData.current_streak}/{streakData.next_milestone_info.level} days to {streakData.next_milestone_info.title}
                        </span>
                      </div>
                      <span className="text-xs text-purple-600 font-medium">
                        {Math.round(streakData.progress_to_next_milestone)}%
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(streakData.progress_to_next_milestone, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{streakData.next_milestone_info.description}</p>
                  </div>
                )}

                {/* Milestones Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {streakData?.milestones.map((milestone, index) => (
                    <div key={milestone.level} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                        milestone.achieved
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {milestone.achieved ? '✓' : milestone.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${
                          milestone.achieved ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {milestone.emoji} {milestone.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {milestone.level} days
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="col-span-full text-center text-gray-500 py-4">
                      <div className="text-4xl mb-2">📅</div>
                      <div className="text-sm">Start chatting daily to unlock streak milestones!</div>
                    </div>
                  )}
                </div>

                {/* Streak Stats */}
                {streakData && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-purple-600">{streakData.current_streak}</div>
                        <div className="text-xs text-gray-600">Current Streak</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">{streakData.longest_streak}</div>
                        <div className="text-xs text-gray-600">Longest Streak</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">{streakData.total_active_days}</div>
                        <div className="text-xs text-gray-600">Total Active Days</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Relationship Milestones */}
              <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-gray-800 font-medium mb-4">Relationship Milestones</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      (memoryStats.achievements as any)?.first_connection ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      (memoryStats.achievements as any)?.first_connection ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      First Connection {(memoryStats.achievements as any)?.first_connection ? '✅' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      (memoryStats.achievements as any)?.getting_comfortable ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      (memoryStats.achievements as any)?.getting_comfortable ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      Getting Comfortable {(memoryStats.achievements as any)?.getting_comfortable ? '✅' : `(${Math.min(memoryStats.achievementConversations || 0, 5)}/5)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      (memoryStats.achievements as any)?.regular_buddy ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      (memoryStats.achievements as any)?.regular_buddy ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      Regular Chat Buddy {(memoryStats.achievements as any)?.regular_buddy ? '✅' : `(${Math.min(memoryStats.achievementConversations || 0, 10)}/10)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      (memoryStats.achievements as any)?.close_friend ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      (memoryStats.achievements as any)?.close_friend ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      Close Friend {(memoryStats.achievements as any)?.close_friend ? '✅' : `(${Math.min(memoryStats.achievementConversations || 0, 25)}/25)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      (memoryStats.achievements as any)?.best_friends ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      (memoryStats.achievements as any)?.best_friends ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      Best Friends Forever {(memoryStats.achievements as any)?.best_friends ? '✅' : `(${Math.min(memoryStats.achievementConversations || 0, 50)}/50)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      emotions.affection >= 75 && emotions.trust >= 75 ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      emotions.affection >= 75 && emotions.trust >= 75 ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      Deep Connection {emotions.affection >= 75 && emotions.trust >= 75 ? '✅' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      memoryStats.facts >= 10 ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      memoryStats.facts >= 10 ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {getCharacterPronounCapitalized(characterKey, 'subject')} Knows You Well {memoryStats.facts >= 10 ? '✅' : `(${memoryStats.facts}/10 details)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      memoryStats.episodes >= 5 ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span className={`text-sm ${
                      memoryStats.episodes >= 5 ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      Shared Adventures {memoryStats.episodes >= 5 ? '✅' : `(${memoryStats.episodes}/5 memories)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Messages */}
              {emotions.clinginess > 60 && (
                <div className="mt-6 bg-pink-50 border border-pink-300 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💕</span>
                    <p className="text-pink-800">
                      {brand} has been missing you! {getCharacterPronounCapitalized(characterKey, 'subject')} gets a little clingy when you're away too long.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Character Switcher - HIDDEN FOR NOW */}
        {false && (
        <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
          <CharacterSwitcher
            currentCharacter={characterKey}
            className="w-full"
          />
        </section>
        )}

        {/* VerseCoins Store */}
        <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
          <header className="mb-4 text-center">
            <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <span className="text-blue-500">⭐</span>
              {getCharacterCurrency(0, characterKey).icon} {getCharacterCurrency(0, characterKey).name} Store
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Purchase VerseCoins with character-themed currency for voice messages, tips, and gifts!
            </p>

            {/* Current Balance Display */}
            {userBalance && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{userBalance.character_display.icon}</span>
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {userBalance.credits.toLocaleString()} {userBalance.character_display.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        Earned: {userBalance.total_earned.toLocaleString()} • Spent: {userBalance.total_spent.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setVerseCoinsModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all transform hover:scale-105"
                  >
                    🛒 Open {getCharacterCurrency(0, characterKey).name} Store
                  </button>
                </div>
              </div>
            )}

            {!userBalance && user && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">{getCharacterCurrency(0, characterKey).icon}</div>
                <div className="text-gray-700 font-medium mb-3">
                  Get started with {getCharacterCurrency(0, characterKey).name}!
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Unlock voice messages, tips, gifts, and premium features
                </p>
                <button
                  onClick={() => setVerseCoinsModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all transform hover:scale-105"
                >
                  🛒 Open {getCharacterCurrency(0, characterKey).name} Store
                </button>
              </div>
            )}
          </header>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">What You Can Do with {getCharacterCurrency(0, characterKey).name}:</h4>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span>🎤</span>
                <span>Voice Messages (100 each)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span>Tips (50-1000+)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💝</span>
                <span>Send Gifts (200-1500)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>Premium Features (2000+)</span>
              </div>
            </div>
          </div>

          {/* Admin/Debug section for tier fixing */}
          {(ent?.tier === 'unknown' || plan === 'UNKNOWN') && !loading && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleFixTier}
                disabled={fixTierLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg"
              >
                {fixTierLoading ? 'Fixing Account...' : 'Fix My Account Tier'}
              </button>
              {fixTierMessage && (
                <div className="mt-2 text-sm text-center">
                  {fixTierMessage}
                </div>
              )}
            </div>
          )}

          {claimMessage && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-center">
              {claimMessage}
            </div>
          )}
        </section>


        {/* Preferences & Features - Only show for users with active subscriptions */}
        {hasActiveSubscription && (
          <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
          <header className="mb-2">
            <h2 className="font-medium">Preferences</h2>
          </header>



          {/* Display Name for Leaderboard */}
          <div className="py-3 border-b">
            <div className="font-medium mb-2">Leaderboard Display Name</div>
            <div className="text-xs opacity-70 mb-3">
              How you appear on the tip leaderboards (leave blank for "Anonymous")
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                maxLength={50}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
              />
              <button
                onClick={updateDisplayName}
                disabled={displayNameLoading || displayName.trim() === currentDisplayName}
                className="px-3 py-2 text-sm bg-fuchsia-500 text-white rounded-lg hover:bg-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {displayNameLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {displayName.length}/50 characters
              {currentDisplayName && (
                <span className="ml-2">
                  Current: "{currentDisplayName}" 
                </span>
              )}
              {!currentDisplayName && !displayName.trim() && (
                <span className="ml-2 text-gray-400">
                  Will show as "Anonymous"
                </span>
              )}
            </div>
          </div>

          {/* Delete chat history */}
          <div className="pt-3">
            <button
              onClick={deleteHistory}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 text-red-700 px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete Chat History'}
            </button>
            <p className="text-xs opacity-70 mt-2">
              Permanently removes all your chat messages. This cannot be undone.
            </p>
          </div>
        </section>
        )}

        {/* Export Messages Section */}
        {hasActiveSubscription && (
          <section className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
            <header className="mb-3">
              <h2 className="font-medium">Export Messages</h2>
              <p className="text-sm text-gray-600">
                Download your conversation history with {brand}
              </p>
            </header>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleExportMessages('json')}
                disabled={messageExporting === 'json'}
                className="flex flex-col items-center justify-center p-4 border border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {messageExporting === 'json' ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
                ) : (
                  <span className="text-2xl mb-2">📄</span>
                )}
                <span className="text-sm font-medium">JSON</span>
                <span className="text-xs text-gray-500 mt-1">Clean format</span>
              </button>
              
              <button
                onClick={() => handleExportMessages('txt')}
                disabled={messageExporting === 'txt'}
                className="flex flex-col items-center justify-center p-4 border border-green-300 text-green-700 rounded-xl hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {messageExporting === 'txt' ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
                ) : (
                  <span className="text-2xl mb-2">📝</span>
                )}
                <span className="text-sm font-medium">TXT</span>
                <span className="text-xs text-gray-500 mt-1">Readable</span>
              </button>
              
              <button
                onClick={() => handleExportMessages('csv')}
                disabled={messageExporting === 'csv'}
                className="flex flex-col items-center justify-center p-4 border border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {messageExporting === 'csv' ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
                ) : (
                  <span className="text-2xl mb-2">📊</span>
                )}
                <span className="text-sm font-medium">CSV</span>
                <span className="text-xs text-gray-500 mt-1">Spreadsheet</span>
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3 text-center">
              All exports contain only conversation content - no personal data
            </p>
          </section>
        )}

        {/* Founders' Circle */}
        <FoundersCircle />

        {/* Admin Testing Tools */}
        <AdminCleanupButton />

        {/* Community Tips Leaderboard - Only show for users with active subscriptions */}
        {hasActiveSubscription && (
          <div className="mt-6">
            <section>
              <TipLeaderboard />
            </section>
          </div>
        )}

        {/* VerseCoins Modal */}
        <VerseCoinsModal
          isOpen={verseCoinsModal}
          onClose={() => setVerseCoinsModal(false)}
          userId={user?.id || ''}
          characterKey={characterKey}
          characterDisplayName={brand}
          defaultTab="spend"
        />

        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      </div>
  );
}
