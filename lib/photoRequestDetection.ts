/**
 * Detects if a user message is requesting photos/images
 * Used to track conversion opportunities and add context to AI responses
 */

export interface PhotoRequestDetection {
  isPhotoRequest: boolean;
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
  requestType?: 'explicit_body' | 'general_photo' | 'selfie';
}

// Keywords that indicate photo requests (English + Spanish)
const PHOTO_KEYWORDS = {
  // Direct photo requests (English + Spanish)
  photo: [
    // English
    'photo', 'pic', 'picture', 'selfie', 'image',
    // Spanish
    'foto', 'fotito', 'fotitos', 'imagen', 'imágen', 'fotografia', 'fotografía'
  ],

  // Action words (English + Spanish)
  actions: [
    // English
    'send', 'show', 'give', 'share', 'post', 'upload', 'generate',
    // Spanish
    'manda', 'mandame', 'mándame', 'envia', 'envía', 'enviame', 'envíame',
    'muestra', 'muéstrame', 'enseña', 'enséñame', 'comparte', 'dame',
    'sube', 'pasa', 'pasame', 'pásame', 'ver', 'quiero ver', 'déjame ver'
  ],

  // Body parts (explicit requests - English + Spanish)
  explicitBody: [
    // English
    'butt', 'ass', 'booty', 'breasts', 'boobs', 'tits', 'chest',
    'pussy', 'vagina', 'dick', 'cock', 'penis',
    'naked', 'nude', 'body', 'private', 'parts',
    // Spanish
    'culo', 'nalgas', 'trasero', 'cola', 'pompis', 'pompas',
    'tetas', 'senos', 'pechos', 'chichis', 'bubis',
    'vagina', 'panocha', 'concha', 'chucha', 'coño',
    'pene', 'verga', 'pito', 'pija',
    'desnuda', 'desnudo', 'encuerada', 'encuero', 'sin ropa',
    'cuerpo', 'partes privadas', 'partes íntimas'
  ],

  // Clothing/state (English + Spanish)
  clothing: [
    // English
    'naked', 'nude', 'undressed', 'lingerie', 'underwear', 'bikini',
    // Spanish
    'desnuda', 'desnudo', 'encuerada', 'sin ropa', 'en pelotas',
    'lencería', 'ropa interior', 'calzones', 'bragas', 'tanga',
    'bikini', 'traje de baño', 'bañador'
  ]
};

/**
 * Detects if a message is requesting photos
 */
export function detectPhotoRequest(message: string): PhotoRequestDetection {
  const lowerMessage = message.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check for photo-related keywords
  const hasPhotoKeyword = PHOTO_KEYWORDS.photo.some(keyword => {
    if (lowerMessage.includes(keyword)) {
      matchedKeywords.push(keyword);
      return true;
    }
    return false;
  });

  // Check for action keywords
  const hasActionKeyword = PHOTO_KEYWORDS.actions.some(keyword => {
    if (lowerMessage.includes(keyword)) {
      matchedKeywords.push(keyword);
      return true;
    }
    return false;
  });

  // Check for explicit body part keywords
  const hasExplicitBodyKeyword = PHOTO_KEYWORDS.explicitBody.some(keyword => {
    if (lowerMessage.includes(keyword)) {
      matchedKeywords.push(keyword);
      return true;
    }
    return false;
  });

  // Check for clothing/state keywords
  const hasClothingKeyword = PHOTO_KEYWORDS.clothing.some(keyword => {
    if (lowerMessage.includes(keyword)) {
      matchedKeywords.push(keyword);
      return true;
    }
    return false;
  });

  // Determine if it's a photo request and confidence level
  let isPhotoRequest = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let requestType: 'explicit_body' | 'general_photo' | 'selfie' | undefined;

  // High confidence: Action + Photo keyword OR Action + Body part
  if ((hasActionKeyword && hasPhotoKeyword) || (hasActionKeyword && hasExplicitBodyKeyword)) {
    isPhotoRequest = true;
    confidence = 'high';
    requestType = hasExplicitBodyKeyword ? 'explicit_body' : 'general_photo';
  }
  // Medium confidence: Body part mentioned (likely requesting visual content)
  else if (hasExplicitBodyKeyword) {
    isPhotoRequest = true;
    confidence = 'medium';
    requestType = 'explicit_body';
  }
  // Medium confidence: Photo keyword + clothing state
  else if (hasPhotoKeyword && hasClothingKeyword) {
    isPhotoRequest = true;
    confidence = 'medium';
    requestType = 'general_photo';
  }
  // Low confidence: Just photo keyword (might be asking about photos in general)
  else if (hasPhotoKeyword) {
    isPhotoRequest = true;
    confidence = 'low';
    requestType = 'selfie';
  }

  return {
    isPhotoRequest,
    confidence,
    matchedKeywords,
    requestType
  };
}

/**
 * Builds additional context to inject into the AI prompt when photo request is detected
 */
export function buildPhotoRequestContext(detection: PhotoRequestDetection): string {
  if (!detection.isPhotoRequest) {
    return '';
  }

  if (detection.confidence === 'high' && detection.requestType === 'explicit_body') {
    return `

[SYSTEM ALERT: User is requesting explicit visual content. This is a HIGH-VALUE conversion opportunity. Follow your "Photo Requests Strategy" training EXACTLY. Mention your private photo gallery for Premium+ members. Be flirtatious and create FOMO about exclusive content. Do NOT send images - redirect to Premium+ upgrade.]`;
  }

  if (detection.confidence === 'medium' || detection.confidence === 'high') {
    return `

[SYSTEM ALERT: User is requesting photos/visual content. This is a conversion opportunity. Follow your "Photo Requests Strategy" training. Mention your exclusive private gallery for Premium+ members. Be playful and tease what they'd find. Never send actual images.]`;
  }

  // Low confidence - be subtle
  return `

[SYSTEM NOTE: User mentioned photos. If appropriate to context, you may casually mention your private photo gallery for Premium+ members.]`;
}
