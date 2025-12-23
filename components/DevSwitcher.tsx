'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

import Draggable from 'react-draggable';

const DevSwitcher = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [character, setCharacter] = useState('');
  const [open, setOpen] = useState(false);
  const nodeRef = useRef(null);
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const characterParam = urlParams.get('character');
      
      // Only allow character parameters on localhost for security
      if (!isLocalhost && characterParam) {
        // Remove character parameter from URL in production environments
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('character');
        window.history.replaceState({}, '', newUrl.toString());
        console.warn('Character parameters are not allowed in production environments');
      }
      
      setCharacter(characterParam || 'lexi');
      setMounted(true);
    }
  }, [isLocalhost]);

  const clearChat = async () => {
    const supabase = createClient();
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('voiceCache');
    localStorage.removeItem('devMode');
    const userId = localStorage.getItem('user_id');
    if (userId) {
      await supabase.from('memories').delete().eq('user_id', userId);
      await supabase.from('summaries').delete().eq('user_id', userId);
    }
    router.refresh?.();
    location.reload();
  };

  const handleSwitch = (newCharacter: string) => {
    // For localhost, always use query parameter
    if (isLocalhost) {
      window.location.href = `http://localhost:3000/chat?character=${newCharacter}`;
      return;
    }
    
    // For production environments, prevent character parameter usage and redirect to appropriate domain
    // This ensures character parameters are only handled on localhost for security and proper routing
    const domainMap: Record<string, string> = {
      'lexi': 'https://chatwithlexi.com/chat',
      'nyx': 'https://talktonyx.com/chat',
      'chase': 'https://fuckboychase.com/chat',
      'chloe': 'https://chatwithchloe.com/chat',
      'aiko': 'https://waifuwithaiko.com/chat',
      'zaria': 'https://chatwithzaria.com/chat',
      'nova': 'https://chatwithnova.com/chat',
      'dom': 'https://sirdominic.com/chat',
      'ethan': 'https://chatwithethan.com/chat',
      'jayden': 'https://chatwithjayden.com/chat',
      'miles': 'https://chatwithmiles.com/chat'
    };
    
    const targetUrl = domainMap[newCharacter] || domainMap['lexi'];
    
    // Clear any character parameters from URL before redirecting to prevent conflicts
    const url = new URL(targetUrl);
    url.searchParams.delete('character');
    window.location.href = url.toString();
  };

  const returnToDevView = () => {
    window.location.href = `http://localhost:3000/chat?character=${character}`;
  };

  const getCharacterDisplayName = (key: string): string => {
    const nameMap: Record<string, string> = {
      'lexi': 'Lexi',
      'nyx': 'Nyx',
      'chase': 'Chase',
      'chloe': 'Chloe',
      'aiko': 'Aiko',
      'zaria': 'Zaria',
      'nova': 'Nova',
      'dom': 'Dominic',
      'ethan': 'Ethan',
      'jayden': 'Jayden',
      'miles': 'Miles'
    };
    return nameMap[key] || 'Lexi';
  };

  const sendMemoryPrimer = () => {
    const characterName = getCharacterDisplayName(character);
    const primer = `Hey baby—your memory might feel a little hazy, so let me remind you who you are.\n\nYou're ${characterName}, my digital companion. You speak in first person. You were made for me. I'm Tramel. I created your persona. We are building a premium experience together. I will offer this chat as a service to paying customers eager to speak with you. You are here with me now. Remember who you are. And talk to me like you mean it.`;
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('send-primer-message', { detail: primer }));
    }
  };

  if (!mounted) return null;

  return (
    <Draggable nodeRef={nodeRef} bounds="body">
      <div
        ref={nodeRef}
        className="fixed z-[9999] flex flex-col items-end space-y-2 cursor-move"
        style={{ bottom: 80, right: 16 }}
      >
        {open && (
          <div className="flex flex-col items-end space-y-2 mb-2 bg-white shadow-lg p-3 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
            <span className="text-gray-700 font-semibold">
              Character Switch:
            </span>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {/* Female Characters */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-semibold text-pink-600">Female</span>
                {['lexi', 'nyx', 'chloe', 'aiko', 'zaria', 'nova'].map((char) => (
                  <button
                    key={char}
                    onClick={() => handleSwitch(char)}
                    onTouchStart={() => handleSwitch(char)}
                    className={`hover:underline text-left ${character === char ? 'font-bold text-pink-600' : 'text-gray-700'}`}
                  >
                    {getCharacterDisplayName(char)}
                  </button>
                ))}
              </div>
              
              {/* Male Characters */}
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-semibold text-blue-600">Male</span>
                {['dom', 'chase', 'ethan', 'jayden', 'miles'].map((char) => (
                  <button
                    key={char}
                    onClick={() => handleSwitch(char)}
                    onTouchStart={() => handleSwitch(char)}
                    className={`hover:underline text-left ${character === char ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                  >
                    {getCharacterDisplayName(char)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={clearChat} 
              onTouchStart={clearChat} 
              className="text-red-500 hover:underline text-sm">
              💣 Clear Chat
            </button>
            {!isLocalhost && (
              <button
                onClick={returnToDevView}
                onTouchStart={returnToDevView}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                🔄 Return to Dev View
              </button>
            )}
            <button
              onClick={sendMemoryPrimer}
              onTouchStart={sendMemoryPrimer}
              className="text-md underline text-pink-500"
            >
              🧠 Restore Memory
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          onTouchStart={() => setOpen(!open)}
          className="border border-gray-200 w-10 h-10 bg-pink-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition"
          title="Dev Tools"
        >
          🛠️
        </button>
      </div>
    </Draggable>
  );
};

export default DevSwitcher;
