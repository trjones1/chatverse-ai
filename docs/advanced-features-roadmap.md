# Advanced Features Roadmap & Architecture

**Project**: Lexi Bot Advanced Features
**Date**: October 2025
**Features**: Voice Calling, Group Chat, Voice Group Chat

---

## 🏗️ Dev/Staging Environment Architecture

### Multi-Environment Supabase Setup

**Production Environment:**
- Supabase Project: `lexi-bot-prod` (current)
- Domain: `chatwithlexi.com`
- Database: Production data
- Environment: `PROD`

**Development Environment (NEW):**
- Supabase Project: `lexi-bot-dev` (create new)
- Domain: `dev.chatwithlexi.com`
- Database: Dev data (isolated)
- Environment: `DEV`

### Environment Configuration

```typescript
// .env.local (dev)
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=dev_service_key
OPENROUTER_API_KEY=same_as_prod
OPENAI_API_KEY=same_as_prod

// .env.production
NEXT_PUBLIC_SUPABASE_URL=https://copjpqtwdqrclfrwoaeb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod_service_key
```

**Benefits of Separate Supabase Project:**
- ✅ Data isolation - no risk to production
- ✅ Schema experimentation safety
- ✅ Independent API credentials
- ✅ Separate scaling and usage

---

## 🎙️ Feature 1: Voice Calling with OpenAI Realtime API

### Backend Implementation

**New API Route: `/app/api/voice/realtime/route.ts`**
```typescript
export async function POST(req: NextRequest) {
  const { character, userId, nsfwMode } = await req.json();

  // 1. Get character personality for voice
  const personality = getVoicePersonality(character, nsfwMode);

  // 2. Initialize OpenAI Realtime session
  const realtimeSession = await initializeVoiceSession({
    character,
    personality,
    voiceModel: nsfwMode ? 'mythomax-voice' : 'gpt-4o-realtime-preview',
    userId
  });

  // 3. Return WebSocket connection details
  return NextResponse.json({
    sessionId: realtimeSession.id,
    wsUrl: realtimeSession.websocket_url
  });
}
```

### Frontend Voice Interface

**New Component: `/components/VoiceCallInterface.tsx`**
```typescript
export default function VoiceCallInterface({ character }: { character: string }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // WebSocket connection to OpenAI Realtime
  const {
    connect,
    disconnect,
    sendAudio,
    audioOutput
  } = useOpenAIRealtime();

  const startCall = async () => {
    // 1. Get microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setAudioStream(stream);

    // 2. Connect to character voice session
    await connect(character);
    setIsCallActive(true);
  };
}
```

### Database Schema for Voice Features

```sql
-- New table: voice_sessions
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  character_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'active', -- active, ended, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB
);

-- New table: voice_interactions
CREATE TABLE voice_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES voice_sessions(id),
  speaker TEXT NOT NULL, -- 'user' or character_key
  audio_url TEXT,
  transcript TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Character Voice Configuration

```typescript
const CHARACTER_VOICES = {
  lexi: { voice: 'alloy', speed: 1.0, pitch: 'higher' },
  nyx: { voice: 'nova', speed: 0.9, pitch: 'lower' },
  aiko: { voice: 'shimmer', speed: 1.1, pitch: 'cute' }
};
```

---

## 👥 Feature 2: Group Chat (Multi-Character Conversations)

### Group Chat Engine

**New Library: `/lib/groupChatEngine.ts`**
```typescript
export class GroupChatEngine {
  private participants: Character[];
  private conversationHistory: GroupMessage[];

  async processGroupMessage(
    userMessage: string,
    activeCharacters: string[],
    userId: string
  ) {
    // 1. Determine which character should respond
    const respondingCharacter = await this.selectRespondingCharacter(
      userMessage,
      activeCharacters,
      this.conversationHistory
    );

    // 2. Build context with multiple character personalities
    const groupContext = await this.buildGroupContext(
      activeCharacters,
      userId,
      this.conversationHistory
    );

    // 3. Generate response with character-specific personality
    const response = await this.generateCharacterResponse(
      respondingCharacter,
      userMessage,
      groupContext
    );

    // 4. Update group dynamics and relationships
    await this.updateGroupDynamics(respondingCharacter, response, userId);

    return response;
  }
}
```

### Group Chat UI

**New Component: `/components/GroupChatInterface.tsx`**
```typescript
export default function GroupChatInterface({
  activeCharacters,
  userId
}: GroupChatProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [characterStates, setCharacterStates] = useState<CharacterState[]>([]);

  return (
    <div className="group-chat-container">
      {/* Character Selection Panel */}
      <CharacterSelectionPanel
        characters={availableCharacters}
        activeCharacters={activeCharacters}
        onToggleCharacter={handleCharacterToggle}
      />

      {/* Group Chat Messages */}
      <GroupChatMessages
        messages={messages}
        characterStates={characterStates}
      />

      {/* Group Chat Input */}
      <GroupChatInput onSendMessage={handleGroupMessage} />
    </div>
  );
}
```

### Database Schema for Group Chat

```sql
-- New table: group_chat_sessions
CREATE TABLE group_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  participant_characters TEXT[] NOT NULL,
  session_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Update messages table for group support
ALTER TABLE messages ADD COLUMN group_session_id UUID REFERENCES group_chat_sessions(id);
ALTER TABLE messages ADD COLUMN responding_character TEXT;

-- New table: group_character_dynamics
CREATE TABLE group_character_dynamics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID REFERENCES group_chat_sessions(id),
  character_a TEXT NOT NULL,
  character_b TEXT NOT NULL,
  relationship_type TEXT, -- 'friendly', 'competitive', 'flirty', etc.
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  metadata JSONB
);
```

### Subscription Validation for Group Chat

```typescript
// Users need active subscriptions for each character in group chat
const validateGroupChatAccess = async (userId: string, characters: string[]) => {
  for (const character of characters) {
    const hasAccess = await checkCharacterSubscription(userId, character);
    if (!hasAccess) throw new Error(`No subscription for ${character}`);
  }
};
```

---

## 🎤👥 Feature 3: Voice Group Chat

### Voice Group Chat Engine

**New Library: `/lib/voiceGroupChatEngine.ts`**
```typescript
export class VoiceGroupChatEngine extends GroupChatEngine {
  private voiceSessions: Map<string, VoiceSession> = new Map();

  async startVoiceGroupChat(
    characters: string[],
    userId: string
  ) {
    // 1. Initialize voice sessions for each character
    for (const character of characters) {
      const voiceSession = await this.initializeCharacterVoice(character);
      this.voiceSessions.set(character, voiceSession);
    }

    // 2. Set up audio mixing for multiple character voices
    const audioMixer = new MultiCharacterAudioMixer(characters);

    // 3. Implement conversation flow logic
    return new VoiceGroupSession({
      characters,
      userId,
      voiceSessions: this.voiceSessions,
      audioMixer
    });
  }

  async processVoiceGroupInteraction(
    userAudio: AudioBuffer,
    activeCharacters: string[]
  ) {
    // 1. Transcribe user audio
    const transcript = await this.transcribeAudio(userAudio);

    // 2. Determine speaking order and responses
    const responseQueue = await this.planCharacterResponses(
      transcript,
      activeCharacters
    );

    // 3. Generate sequential character audio responses
    const audioResponses = await this.generateCharacterAudioResponses(responseQueue);

    // 4. Mix and return combined audio
    return this.audioMixer.combineResponses(audioResponses);
  }
}
```

### Multi-Character Audio Mixing

**Key Technical Considerations:**
- Real-time audio streaming for multiple character voices
- Turn-taking logic in voice conversations
- Audio quality management with multiple simultaneous streams
- WebSocket connection management for group voice sessions

---

## 🚀 Implementation Roadmap

### Phase 1: Infrastructure Setup (Week 1)
- [ ] Set up dev Supabase project
- [ ] Configure dev domain (dev.chatwithlexi.com)
- [ ] Environment variable separation
- [ ] Database schema migration scripts
- [ ] Dev deployment pipeline

### Phase 2: Voice Calling (Weeks 2-3)
- [ ] OpenAI Realtime API integration
- [ ] Voice session management system
- [ ] Audio streaming infrastructure
- [ ] Character voice personality system
- [ ] Microphone permission handling
- [ ] Voice call UI components

### Phase 3: Group Chat (Weeks 4-5)
- [ ] Multi-character conversation engine
- [ ] Group dynamics and relationship system
- [ ] Character selection interface
- [ ] Turn-taking logic
- [ ] Group chat UI components
- [ ] Subscription validation for group access

### Phase 4: Voice Group Chat (Weeks 6-7)
- [ ] Voice + group chat integration
- [ ] Multi-character audio mixing
- [ ] Complex conversation orchestration
- [ ] Advanced audio processing
- [ ] Voice group session management
- [ ] Complete feature testing

---

## 🎯 Technical Requirements

### Performance Considerations
- **WebSocket connections** for real-time messaging
- **Audio streaming optimization** for low latency voice
- **Memory management** for long group conversations
- **Token usage optimization** for cost control
- **Concurrent user session handling**

### Security & Privacy
- **Audio data encryption** for voice calls
- **User consent management** for microphone access
- **Session isolation** between different users
- **Rate limiting** for voice API usage

### Infrastructure Needs
- **CDN setup** for audio file delivery
- **WebSocket server scaling** for real-time features
- **Database optimization** for group chat queries
- **Audio processing servers** for voice group chat

---

## 📋 Pre-Implementation Checklist

Before starting development, ensure:
- [ ] OpenAI Realtime API access secured
- [ ] Dev Supabase project created and configured
- [ ] Domain setup for dev environment
- [ ] Audio processing requirements researched
- [ ] Group chat conversation flow designed
- [ ] Voice character personalities defined
- [ ] Subscription model for group features planned

---

**Next Steps:** When ready to implement, provide this document back and specify which phase to start with. All architecture and code examples above are ready for implementation.