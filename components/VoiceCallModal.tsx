'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCharacter } from '@/lib/useCharacter';
import { logger } from '@/lib/logger';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasVoiceAccess: boolean;
  voiceCredits: number;
  onTriggerUpgrade: () => void;
}

type CallState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'processing' | 'ended';

export default function VoiceCallModal({ 
  isOpen, 
  onClose, 
  hasVoiceAccess, 
  voiceCredits,
  onTriggerUpgrade 
}: VoiceCallModalProps) {
  const character = useCharacter();
  const [callState, setCallState] = useState<CallState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningUpRef = useRef(false);
  const lastActionRef = useRef<number>(0);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected' || callState === 'speaking' || callState === 'listening') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          // Consume credits every 15 seconds (roughly)
          if (newDuration % 15 === 0 && newDuration > 0) {
            setCreditsUsed(prevCredits => prevCredits + 1);
          }
          return newDuration;
        });
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  // Initialize call
  const startCall = async () => {
    if (!hasVoiceAccess || voiceCredits < 1) {
      onTriggerUpgrade();
      return;
    }

    try {
      setCallState('connecting');
      setError(null);
      setCallDuration(0);
      setCreditsUsed(0);

      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;

      setCallState('connected');
      
      // Start with a greeting
      await sendGreeting();
      
    } catch (err: any) {
      setError(err.message || 'Failed to start call');
      setCallState('idle');
    }
  };

  // Send initial greeting
  const sendGreeting = async () => {
    try {
      setCallState('processing');
      
      // Get authentication headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Try to get session token
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        logger.debug('VOICE CALL: Sending greeting with auth', {
          hasAuth: !!headers['Authorization'],
          character: character.key
        });
      } catch (authError) {
        logger.warn('VOICE CALL: Could not get auth for greeting', authError);
      }
      
      const response = await fetch('/api/voice/call', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          message: `Hey ${character.displayName}, I'm calling you!`,
          isCallGreeting: true,
          character: character.key
        })
      });

      const data = await response.json();
      
      logger.debug('VOICE CALL: Greeting API response', {
        hasAudioUrl: !!data.audioUrl,
        audioUrlStart: data.audioUrl ? data.audioUrl.substring(0, 50) + '...' : null,
        fullResponse: data
      });
      
      if (data.audioUrl) {
        await playAudio(data.audioUrl);
        // Refresh entitlements after successful voice call (credit consumed)
        window.dispatchEvent(new Event('refresh-entitlements'));
      } else {
        logger.warn('VOICE CALL: No audioUrl in greeting response');
      }
      
      setCallState('listening');
      
    } catch (err) {
      logger.error('VOICE CALL: Greeting failed', err);
      setCallState('listening');
    }
  };

  // Enhanced debounced recording with cleanup
  const startRecording = async () => {
    const now = Date.now();
    if (now - lastActionRef.current < 500) return; // 500ms debounce
    lastActionRef.current = now;

    if (!mediaRecorderRef.current || callState !== 'listening' || isCleaningUpRef.current) return;

    try {
      audioChunksRef.current = [];
      setIsRecording(true);
      setCallState('speaking');
      mediaRecorderRef.current.start();
      
      // Auto-stop after 10 seconds max
      setTimeout(() => {
        if (isRecording && !isCleaningUpRef.current) {
          stopRecording();
        }
      }, 10000);
      
    } catch (err: any) {
      logger.error('VOICE CALL: Recording start failed', err);
      setError(err.message || 'Failed to start recording');
      setCallState('listening');
      setIsRecording(false);
    }
  };

  // Enhanced stop recording with cleanup checks
  const stopRecording = () => {
    const now = Date.now();
    if (now - lastActionRef.current < 300) return; // 300ms debounce
    lastActionRef.current = now;

    if (!mediaRecorderRef.current || !isRecording || isCleaningUpRef.current) return;
    
    try {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    } catch (err: any) {
      logger.error('VOICE CALL: Recording stop failed', err);
      setIsRecording(false);
      setCallState('listening');
    }
  };

  // Enhanced recording handler with cleanup checks
  const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0 || isCleaningUpRef.current) return;
    
    setCallState('processing');
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64 for API
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Get authentication headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // Try to get session token
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          
          logger.debug('VOICE CALL: Sending audio with auth', {
            hasAuth: !!headers['Authorization'],
            character: character.key,
            callDuration
          });
        } catch (authError) {
          logger.warn('VOICE CALL: Could not get auth for audio', authError);
        }
        
        // Send to voice call API
        const response = await fetch('/api/voice/call', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            audioData: base64Audio,
            character: character.key,
            callDuration: callDuration
          })
        });

        const data = await response.json();
        
        logger.debug('VOICE CALL: Recording API response', {
          hasAudioUrl: !!data.audioUrl,
          audioUrlStart: data.audioUrl ? data.audioUrl.substring(0, 50) + '...' : null,
          hasError: !!data.error,
          creditsRemaining: data.creditsRemaining,
          fullResponse: data
        });
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.audioUrl) {
          await playAudio(data.audioUrl);
          // Refresh entitlements after successful voice call (credit consumed)
          window.dispatchEvent(new Event('refresh-entitlements'));
        } else {
          logger.warn('VOICE CALL: No audioUrl in recording response');
        }
        
        // Check if credits exhausted
        if (data.creditsRemaining <= 0) {
          endCall();
          return;
        }
        
        setCallState('listening');
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (err: any) {
      setError(err.message || 'Failed to process speech');
      setCallState('listening');
    }
  };

  // Play AI response audio
  const playAudio = (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      logger.debug('VOICE CALL: Starting audio playback', {
        audioUrl: audioUrl.substring(0, 50) + '...',
        isDataUrl: audioUrl.startsWith('data:'),
        audioUrlLength: audioUrl.length
      });
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        logger.debug('VOICE CALL: Paused previous audio');
      }
      
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set volume first, before loading
      audio.volume = 1.0;
      logger.debug('VOICE CALL: Audio volume set to 1.0');
      
      let hasStartedPlaying = false;
      let timeoutId: NodeJS.Timeout;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
      
      audio.onloadstart = () => {
        logger.debug('VOICE CALL: Audio load started');
      };
      
      audio.oncanplaythrough = () => {
        logger.debug('VOICE CALL: Audio can play through, attempting to play');
        if (!hasStartedPlaying) {
          hasStartedPlaying = true;
          audio.play()
            .then(() => {
              logger.debug('VOICE CALL: Audio playback started successfully');
            })
            .catch((error) => {
              logger.error('VOICE CALL: Audio play() failed', error);
              if (error.name === 'NotAllowedError') {
                logger.error('VOICE CALL: Autoplay blocked - user interaction required');
                // For voice calls, user has already interacted by starting the call
                // Try immediate retry since we have user gesture context
                setTimeout(() => {
                  if (!hasStartedPlaying) {
                    audio.play()
                      .then(() => {
                        logger.debug('VOICE CALL: Retry play succeeded');
                      })
                      .catch(e => {
                        logger.error('VOICE CALL: Retry play failed', e);
                        reject(e);
                      });
                  }
                }, 100);
              } else {
                // Other audio errors should immediately reject
                reject(error);
              }
            });
        }
      };
      
      audio.onloadeddata = () => {
        logger.debug('VOICE CALL: Audio data loaded');
        // Set a fallback timeout in case canplaythrough doesn't fire
        if (!hasStartedPlaying) {
          timeoutId = setTimeout(() => {
            logger.debug('VOICE CALL: Fallback play attempt after 500ms');
            if (!hasStartedPlaying) {
              hasStartedPlaying = true;
              audio.play()
                .then(() => {
                  logger.debug('VOICE CALL: Fallback play succeeded');
                })
                .catch(e => {
                  logger.error('VOICE CALL: Fallback play failed', e);
                  reject(e);
                });
            }
          }, 500);
        }
      };
      
      audio.onended = () => {
        logger.debug('VOICE CALL: Audio playback completed');
        cleanup();
        resolve();
      };
      
      audio.onerror = (error) => {
        logger.error('VOICE CALL: Audio error occurred', {
          error,
          audioError: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src?.substring(0, 50) + '...'
        });
        cleanup();
        reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`));
      };
      
      audio.onplaying = () => {
        logger.debug('VOICE CALL: Audio is now playing');
      };
      
      audio.onpause = () => {
        logger.debug('VOICE CALL: Audio paused');
      };
      
      // Load the audio
      try {
        audio.src = audioUrl;
        audio.load();
        logger.debug('VOICE CALL: Audio source set and loading initiated');
      } catch (error) {
        logger.error('VOICE CALL: Failed to set audio source', error);
        cleanup();
        reject(error);
      }
      
      // Fallback timeout for the entire operation
      const globalTimeout = setTimeout(() => {
        logger.error('VOICE CALL: Audio playback timed out after 10 seconds');
        cleanup();
        reject(new Error('Audio playback timed out'));
      }, 10000);
      
      // Clear global timeout when audio ends
      const originalOnEnded = audio.onended;
      audio.onended = (event) => {
        clearTimeout(globalTimeout);
        if (originalOnEnded) originalOnEnded.call(audio, event);
      };
    });
  };

  // Enhanced call cleanup with proper state management
  const endCall = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    
    try {
      // Stop all recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      
      // Stop audio playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      
      // Clear timers
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      
      setCallState('ended');
      
      // Auto-close after showing stats
      setTimeout(() => {
        if (isCleaningUpRef.current) {
          onClose();
          // Reset all state
          setCallState('idle');
          setCallDuration(0);
          setCreditsUsed(0);
          setError(null);
          setIsRecording(false);
          isCleaningUpRef.current = false;
        }
      }, 3000);
      
    } catch (err: any) {
      logger.error('VOICE CALL: End call error', err);
      // Force cleanup even if there's an error
      setTimeout(() => {
        onClose();
        setCallState('idle');
        isCleaningUpRef.current = false;
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <span className="text-2xl">📞</span>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">
            {callState === 'idle' ? `Call ${character.displayName}` : 
             callState === 'connecting' ? 'Connecting...' :
             callState === 'connected' ? `Connected to ${character.displayName}` :
             callState === 'speaking' ? 'You are speaking...' :
             callState === 'listening' ? `${character.displayName} is listening` :
             callState === 'processing' ? `${character.displayName} is thinking...` :
             'Call ended'}
          </h2>

          {callState !== 'idle' && callState !== 'ended' && (
            <div className="flex justify-center space-x-6 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold">{formatTime(callDuration)}</div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{creditsUsed}</div>
                <div className="text-xs text-gray-500">Credits Used</div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}

          {!hasVoiceAccess && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔒</span>
                <h3 className="font-semibold text-orange-800">Premium Required</h3>
              </div>
              <p className="text-sm text-orange-700 mb-3">
                Voice calling is a premium feature. Subscribe to SFW ($9.99/mo) or NSFW ($34.99/mo) to unlock voice calls with {character.displayName}!
              </p>
              <div className="text-xs text-orange-600">
                ✨ Premium includes unlimited chats, memory, and voice features
              </div>
            </div>
          )}

          {hasVoiceAccess && voiceCredits < 1 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">
                You need voice credits to make calls. Each call uses approximately 1 credit per 15 seconds.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          {callState === 'idle' && (
            <>
              <button
                onClick={!hasVoiceAccess ? onTriggerUpgrade : voiceCredits >= 1 ? startCall : onTriggerUpgrade}
                disabled={false}
                className={`flex-1 font-semibold py-3 px-4 rounded-xl transition-colors ${
                  !hasVoiceAccess 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : hasVoiceAccess && voiceCredits >= 1
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {!hasVoiceAccess 
                  ? 'Get Premium' 
                  : voiceCredits < 1 
                    ? 'Buy Credits' 
                    : `▶️ Call ${character.displayName}`}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          )}

          {(callState === 'connected' || callState === 'listening') && (
            <>
              <button
                onClick={startRecording}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                🎤 Speak
              </button>
              <button
                onClick={endCall}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                End Call
              </button>
            </>
          )}

          {callState === 'speaking' && (
            <button
              onClick={stopRecording}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors animate-pulse"
            >
              🔴 Stop Speaking
            </button>
          )}

          {callState === 'processing' && (
            <div className="flex-1 bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl text-center">
              Processing...
            </div>
          )}

          {callState === 'ended' && (
            <div className="w-full text-center space-y-2">
              <p className="text-sm text-gray-600">
                Call completed! Duration: {formatTime(callDuration)}
              </p>
              <p className="text-sm text-gray-600">
                Credits used: {creditsUsed}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}