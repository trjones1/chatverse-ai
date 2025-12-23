import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'
import { domainMap } from '@/lib/characterConfig'

// Image metadata
export const size = {
  width: 180,
  height: 180,
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
  chatverse: '🌌',
}

// Character color gradients
const characterGradients: Record<string, { from: string; to: string }> = {
  lexi: { from: '#ec4899', to: '#8b5cf6' }, // Pink to purple
  nyx: { from: '#6366f1', to: '#1e1b4b' }, // Indigo to dark purple
  chloe: { from: '#f9a8d4', to: '#fda4af' }, // Soft pink
  aiko: { from: '#fbbf24', to: '#f472b6' }, // Yellow to pink
  zaria: { from: '#fbbf24', to: '#f59e0b' }, // Golden
  nova: { from: '#8b5cf6', to: '#6366f1' }, // Purple to indigo
  dom: { from: '#ef4444', to: '#dc2626' }, // Red
  chase: { from: '#f97316', to: '#ea580c' }, // Orange/fire
  ethan: { from: '#3b82f6', to: '#1e40af' }, // Blue
  jayden: { from: '#10b981', to: '#059669' }, // Green
  miles: { from: '#06b6d4', to: '#0891b2' }, // Cyan
  chatverse: { from: '#667eea', to: '#764ba2' }, // Purple gradient
}

// Apple icon generator
export default async function AppleIcon() {
  const headersList = await headers()
  const hostname = headersList.get('host') || 'chatverse.ai'

  // Get character key from hostname
  const characterKey = (domainMap as Record<string, string>)[hostname] || 'chatverse'
  const emoji = characterEmojis[characterKey] || '🌌'
  const gradient = characterGradients[characterKey] || characterGradients.chatverse

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
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