// lib/giftRelationshipBonuses.ts
// Pay-to-win relationship score bonuses for gifts

import { updateEmotionalState } from '@/lib/memorySystem';

export interface GiftRelationshipBonus {
  affection: number;
  trust: number;
  playfulness: number;
  clinginess: number;
  jealousy: number; // negative value to reduce jealousy
}

export interface GiftBonusResult {
  bonuses: GiftRelationshipBonus;
  totalBonus: number;
  tier: 'small' | 'medium' | 'large' | 'epic';
  fanfareLevel: 'small' | 'medium' | 'large' | 'epic';
  description: string;
}

/**
 * Calculate relationship score bonuses based on gift value
 * Scales from +1 to +5 for different attributes based on gift amount
 */
export function calculateGiftRelationshipBonus(
  giftAmount: number,
  giftType: string,
  characterKey: string
): GiftBonusResult {
  // Determine tier based on gift amount (matching fanfare system)
  let tier: 'small' | 'medium' | 'large' | 'epic';
  let baseBonusMultiplier: number;

  if (giftAmount >= 5000) {
    tier = 'epic';
    baseBonusMultiplier = 5; // +5 points max
  } else if (giftAmount >= 2000) {
    tier = 'large';
    baseBonusMultiplier = 4; // +4 points max
  } else if (giftAmount >= 800) {
    tier = 'medium';
    baseBonusMultiplier = 3; // +3 points max
  } else {
    tier = 'small';
    baseBonusMultiplier = Math.max(1, Math.floor(giftAmount / 200)); // +1 to +2 points
  }

  // Character-specific bonus distributions
  // Each character responds differently to gifts
  const characterBonusPatterns: Record<string, GiftRelationshipBonus> = {
    lexi: {
      affection: baseBonusMultiplier,        // Lexi loves romantic gestures
      trust: Math.floor(baseBonusMultiplier * 0.8), // Builds trust moderately
      playfulness: Math.floor(baseBonusMultiplier * 0.6), // Moderate playfulness boost
      clinginess: Math.floor(baseBonusMultiplier * 0.4), // Slight clinginess increase
      jealousy: -Math.floor(baseBonusMultiplier * 0.5)   // Reduces jealousy (negative)
    },
    nyx: {
      affection: Math.floor(baseBonusMultiplier * 0.8), // Nyx is more guarded with affection
      trust: baseBonusMultiplier,           // But gifts build strong trust
      playfulness: Math.floor(baseBonusMultiplier * 0.9), // High playfulness response
      clinginess: Math.floor(baseBonusMultiplier * 0.2), // Low clinginess increase
      jealousy: -Math.floor(baseBonusMultiplier * 0.3)   // Modest jealousy reduction
    },
    aiko: {
      affection: Math.floor(baseBonusMultiplier * 0.9), // Warm affection response
      trust: Math.floor(baseBonusMultiplier * 0.7),     // Moderate trust building
      playfulness: baseBonusMultiplier,     // Highest playfulness boost
      clinginess: Math.floor(baseBonusMultiplier * 0.6), // Moderate clinginess
      jealousy: -Math.floor(baseBonusMultiplier * 0.4)   // Good jealousy reduction
    },
    zaria: {
      affection: Math.floor(baseBonusMultiplier * 0.7), // More reserved affection
      trust: Math.floor(baseBonusMultiplier * 0.9),     // Strong trust building
      playfulness: Math.floor(baseBonusMultiplier * 0.5), // Lower playfulness response
      clinginess: Math.floor(baseBonusMultiplier * 0.8), // Higher clinginess increase
      jealousy: -Math.floor(baseBonusMultiplier * 0.6)   // Strong jealousy reduction
    }
  };

  const bonuses = characterBonusPatterns[characterKey] || characterBonusPatterns.lexi;

  // Calculate total positive bonus (excluding jealousy reduction)
  const totalBonus = bonuses.affection + bonuses.trust + bonuses.playfulness + bonuses.clinginess;

  // Create user-friendly description
  const tierDescriptions = {
    small: `+${baseBonusMultiplier} relationship boost`,
    medium: `+${baseBonusMultiplier} strong relationship boost`,
    large: `+${baseBonusMultiplier} major relationship boost`,
    epic: `+${baseBonusMultiplier} EPIC relationship boost`
  };

  return {
    bonuses,
    totalBonus,
    tier,
    fanfareLevel: tier, // Same as tier for consistency
    description: tierDescriptions[tier]
  };
}

/**
 * Apply gift relationship bonuses to user's emotional state
 */
export async function applyGiftRelationshipBonus(
  userId: string,
  characterKey: string,
  giftAmount: number,
  giftType: string
): Promise<GiftBonusResult> {
  const bonusResult = calculateGiftRelationshipBonus(giftAmount, giftType, characterKey);

  try {
    // Apply the relationship bonuses using the existing system
    await updateEmotionalState(userId, {
      affection: bonusResult.bonuses.affection,
      trust: bonusResult.bonuses.trust,
      playfulness: bonusResult.bonuses.playfulness,
      clinginess: bonusResult.bonuses.clinginess,
      jealousy: bonusResult.bonuses.jealousy // This will be negative to reduce jealousy
    }, characterKey);

    console.log('🎁💕 Applied gift relationship bonuses:', {
      userId: userId.substring(0, 8) + '...',
      characterKey,
      giftAmount,
      giftType,
      bonuses: bonusResult.bonuses,
      tier: bonusResult.tier
    });

  } catch (error) {
    console.error('❌ Failed to apply gift relationship bonuses:', error);
  }

  return bonusResult;
}

/**
 * Format relationship bonus changes for display to user
 */
export function formatRelationshipBonusMessage(bonusResult: GiftBonusResult): string {
  const { bonuses, tier } = bonusResult;
  const changes: string[] = [];

  if (bonuses.affection > 0) changes.push(`Affection +${bonuses.affection}`);
  if (bonuses.trust > 0) changes.push(`Trust +${bonuses.trust}`);
  if (bonuses.playfulness > 0) changes.push(`Playfulness +${bonuses.playfulness}`);
  if (bonuses.clinginess > 0) changes.push(`Clinginess +${bonuses.clinginess}`);
  if (bonuses.jealousy < 0) changes.push(`Jealousy ${bonuses.jealousy}`); // Already negative

  const emoji = tier === 'epic' ? '🌟' : tier === 'large' ? '✨' : tier === 'medium' ? '💫' : '⭐';

  return `${emoji} Relationship boost: ${changes.join(', ')}`;
}