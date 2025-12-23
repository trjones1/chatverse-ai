'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import themeColors from '@/utils/theme';

interface ChatSession {
  userId: string | null;
  anonymousId: string | null;
  characterKey: string;
  messageCount: number;
  lastActivity: string;
  isAuthenticated: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  nsfw: boolean;
  topics: string[];
  emotionalTone?: string;
  metadata?: any;
  selfie?: string | null;
  voiceUrl?: string | null;
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/chat-history');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (session: ChatSession) => {
    setSelectedSession(session);
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams({
        character: session.characterKey,
        ...(session.userId ? { userId: session.userId } : {}),
        ...(session.anonymousId ? { anonymousId: session.anonymousId } : {}),
      });

      const res = await fetch(`/api/admin/chat-history?${params}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const exportConversation = () => {
    if (!selectedSession || messages.length === 0) return;

    const exportData = {
      exported_at: new Date().toISOString(),
      session: {
        user_id: selectedSession.userId,
        anonymous_id: selectedSession.anonymousId,
        character: selectedSession.characterKey,
        is_authenticated: selectedSession.isAuthenticated,
        message_count: selectedSession.messageCount,
        last_activity: selectedSession.lastActivity,
      },
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
        nsfw: msg.nsfw,
        topics: msg.topics,
        emotional_tone: msg.emotionalTone,
        has_selfie: !!msg.selfie,
        has_voice: !!msg.voiceUrl,
        selfie_url: msg.selfie,
        voice_url: msg.voiceUrl,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sessionId = selectedSession.userId?.slice(0, 8) || selectedSession.anonymousId?.slice(0, 20) || 'conversation';
    a.download = `${selectedSession.characterKey}_${sessionId}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const theme = selectedSession
    ? themeColors[selectedSession.characterKey.toLowerCase()] || themeColors.default
    : themeColors.default;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sessions List */}
      <div style={{
        width: '350px',
        borderRight: '1px solid #e0e0e0',
        overflowY: 'auto',
        backgroundColor: '#f8f9fa',
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Chat History</h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading sessions...</div>
        ) : (
          <div>
            {sessions.map((session, idx) => {
              const displayId = session.isAuthenticated
                ? session.userId?.slice(0, 8) + '...'
                : session.anonymousId?.slice(0, 20) + '...';

              return (
                <div
                  key={idx}
                  onClick={() => fetchMessages(session)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e8e8e8',
                    cursor: 'pointer',
                    backgroundColor: selectedSession === session ? '#e3f2fd' : '#fff',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSession !== session) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSession !== session) {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: session.isAuthenticated ? '#4caf50' : '#ff9800',
                      color: '#fff',
                      fontWeight: 600,
                    }}>
                      {session.isAuthenticated ? 'AUTH' : 'ANON'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: themeColors[session.characterKey.toLowerCase()]?.accent || '#999',
                      color: '#fff',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {session.characterKey}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#333', marginBottom: '6px' }}>
                    {displayId}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                    <span>{session.messageCount} messages</span>
                    <span>{new Date(session.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
        {!selectedSession ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '16px',
          }}>
            Select a conversation to view messages
          </div>
        ) : (
          <>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: theme.accent,
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                  {selectedSession.characterKey.charAt(0).toUpperCase() + selectedSession.characterKey.slice(1)} Chat
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.9 }}>
                  {selectedSession.isAuthenticated ? 'Authenticated' : 'Anonymous'} User
                </p>
              </div>
              <button
                onClick={exportConversation}
                disabled={messages.length === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '6px',
                  cursor: messages.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: messages.length > 0 ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (messages.length > 0) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                📥 Export JSON
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#f8f9fa',
            }}>
              {messagesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Loading messages...
                </div>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        backgroundColor: msg.role === 'user' ? '#e3e3e3' : theme.accent,
                        color: msg.role === 'user' ? '#000' : '#fff',
                        boxShadow: msg.nsfw ? `0 0 8px ${theme.nsfw || theme.accent}88` : 'none',
                      }}>
                        <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          marginTop: '6px',
                          opacity: 0.7,
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                          {msg.selfie && <span title="AI sent a selfie">📸</span>}
                          {msg.voiceUrl && <span title="AI sent voice message">🎵</span>}
                          {msg.nsfw && <span style={{
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            fontSize: '10px',
                          }}>NSFW</span>}
                          {msg.topics && msg.topics.length > 0 && (
                            <span style={{ fontSize: '10px' }}>
                              {msg.topics.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
