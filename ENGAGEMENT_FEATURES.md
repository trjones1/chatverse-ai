# Engagement Features Implementation

## Overview
Three subtle, brand-appropriate engagement features have been implemented to improve user retention without being intrusive.

## Features Implemented

### 1. Playful Tab Title Changes
**Location**: `hooks/useEngagementFeatures.ts`

**How it works**:
- When user switches to another browser tab, the page title changes to a playful message
- Examples:
  - "Lexi: Come back... I miss you 👀"
  - "Chase: Don't leave me hanging 🥺"
  - "Nyx: Still here... waiting 💋"
  - "Character: Where'd you go? 😏"

**Why this works**:
- Subtle, not annoying
- Works on mobile and desktop
- Brand-appropriate (playful/flirty)
- No popup needed
- Increases tab retention and returns

### 2. Return Visitor Welcome
**Component**: `components/ReturnVisitorWelcome.tsx`

**How it works**:
- Detects when a user returns within 24 hours
- Shows a welcoming banner: "You came back! 😊"
- Offers to continue their previous conversation
- Auto-dismisses after user interaction

**UI/UX**:
- Beautiful gradient banner (purple to pink)
- Appears at top of screen with smooth animation
- "Continue Chat" button focuses the chat input
- Can be dismissed easily
- Non-blocking with semi-transparent backdrop

**Why this works**:
- Positive reinforcement for returning
- Shows memory/personalization
- Not blocking anything
- Encourages continuation

### 3. Idle Detection Prompt
**Component**: `components/IdleDetectionPrompt.tsx`

**How it works**:
- Triggers after 60 seconds of inactivity
- Tracks mouse movement, keyboard, scroll, touch
- Shows "Still there?" prompt
- For anonymous users with messages: offers to save conversation (triggers signup)

**UI/UX**:
- Appears at bottom of screen
- "Continue Chat" button refocuses input
- "Save" button (anonymous users only) triggers login modal
- Smooth animation and backdrop
- Auto-resets timer when dismissed

**Why this works**:
- They're already engaged (not bouncing)
- Natural re-engagement point
- Offers value (save conversation)
- Not interruptive

## Configuration

All features can be configured via the `useEngagementFeatures` hook:

```typescript
const {
  isIdle,
  shouldShowReturnWelcome,
  dismissReturnWelcome,
  dismissIdlePrompt,
  resetActivity,
} = useEngagementFeatures({
  enableTabTitleChange: true,
  playfulTabTitle: "Custom title here", // Optional
  enableReturnVisitorWelcome: true,
  returnVisitorThresholdMs: 24 * 60 * 60 * 1000, // 24 hours
  enableIdleDetection: true,
  idleThresholdMs: 60 * 1000, // 60 seconds
});
```

## Technical Details

### Tab Title Change
- Uses `document.visibilitychange` event
- Stores original title in ref
- Restores original title on cleanup
- Character-specific playful messages

### Return Visitor Detection
- Uses localStorage to track last visit time
- Key: `last_visit_${character_key}`
- Compares current time with last visit
- Shows welcome if within threshold (24 hours)

### Idle Detection
- Tracks: mousedown, keydown, scroll, touchstart
- Uses setTimeout for idle threshold
- Resets timer on any activity
- Dismissing the prompt resets the timer

## Analytics Integration

These features integrate with existing analytics:

```typescript
// Track when idle prompt is shown
trackEngagement('idle_warning', character.key);

// Track when return visitor welcome is shown
trackEngagement('return_visitor', character.key);

// Track when user continues from idle
trackEngagement('return_from_idle', character.key);
```

## Testing

To test locally:

1. **Tab Title Change**:
   - Open chat page
   - Switch to another tab
   - Check browser tab title changes

2. **Return Visitor**:
   - Visit chat page
   - Close browser
   - Return within 24 hours
   - Should see welcome banner

3. **Idle Detection**:
   - Open chat page
   - Don't interact for 60 seconds
   - Should see "Still there?" prompt

## Why NOT Exit Intent Popup?

We chose NOT to implement traditional exit intent popups because:

1. **Annoying/Desperate** - Feels pushy for intimate/private product
2. **High bounce rate** - Already at 97.6%, adding friction would make it worse
3. **Mobile doesn't work well** - Exit intent is desktop-only
4. **Trust issues** - Aggressive tactics inconsistent with "no judgment" brand
5. **Better alternatives** - Focus on message limit conversion (engaged users)

## Impact Measurement

Track these metrics to measure impact:

- Return visitor rate (should increase)
- Session duration (should increase)
- Idle recovery rate (users who continue after idle prompt)
- Tab return rate (users who come back after switching tabs)
- Anonymous to authenticated conversion (via idle "save conversation" CTA)

## Future Enhancements

Potential improvements:

1. **A/B Testing**: Test different idle thresholds (30s vs 60s vs 90s)
2. **Message-based idle**: Only show idle prompt if user has sent messages
3. **Character-specific messages**: Different playful messages per character
4. **Time-based return messages**: Different welcome for 1 hour vs 24 hours
5. **Analytics tracking**: Add specific events for each engagement feature
