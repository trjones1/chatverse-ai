import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'
import { domainMap } from '@/lib/characterConfig'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Character emoji mapping
const characterEmojis: Record<string, string> = {
  lexi: '💋',
  nyx: '🌙',
  chloe: '🎀',
  aiko: '🌸',
  zaria: '✨',
  nova: '🔮',
  dom: '⚡',
  chase: '🔥',
  ethan: '💼',
  jayden: '🌿',
  miles: '🤓',
  chatverse: '🌌', // Galaxy emoji for main site
}

// Icon generator
export default async function Icon() {
  const headersList = await headers()
  const hostname = headersList.get('host') || 'chatverse.ai'

  // Get character key from hostname
  const characterKey = (domainMap as Record<string, string>)[hostname] || 'chatverse'
  const emoji = characterEmojis[characterKey] || '🌌'

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        }}
      >
        {emoji}
      </div>
    ),
    {
      ...size,
    }
  )
}