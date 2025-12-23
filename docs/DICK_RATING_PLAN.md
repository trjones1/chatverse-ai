# Dick Rating System - Technical Plan 🍆

## Overview
A premium feature where users can upload photos for AI-powered ratings from characters, with leaderboards and gamification elements.

## Database Schema

### `dick_ratings` table
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users) 
- character_key: text (which character rated it)
- image_url: text (secure S3/Supabase storage URL)
- rating_score: decimal(3,2) (1.00 to 10.00)
- rating_comment: text (character's witty comment)
- display_name: text (user's chosen display name for leaderboard)
- is_public: boolean (whether to show on leaderboard)
- moderation_status: enum ('pending', 'approved', 'rejected', 'flagged')
- created_at: timestamp
- updated_at: timestamp
```

### `dick_rating_leaderboards` view
```sql
- Monthly/all-time leaderboards by character
- Average ratings, total ratings, ranking
- Only shows approved, public ratings
```

## API Endpoints

### `POST /api/dick-rating/upload`
- Accept image upload (with size/format validation)
- Store in secure Supabase storage bucket
- Create pending rating record
- Return upload confirmation

### `POST /api/dick-rating/rate`  
- Take uploaded image and get AI rating
- Use character-specific prompts for rating style
- Store rating and comment in database
- Return rating results

### `GET /api/dick-rating/leaderboard`
- Monthly/all-time leaderboards by character
- User's personal position if authenticated
- Filterable by time period and character

### `POST /api/dick-rating/webhook`
- Handle moderation webhook events
- Update moderation status
- Send notifications if needed

## Image Processing & Storage

### Upload Flow
1. Client validates image (size, format, basic content check)
2. Upload to Supabase Storage with proper security rules
3. Generate secure, time-limited URLs for AI processing
4. Store metadata in database

### Storage Security
- Private bucket with RLS policies
- Time-limited signed URLs for AI processing
- Automatic cleanup of rejected images
- No public access to raw images

### Image Validation
- Max size: 10MB
- Formats: JPEG, PNG only
- Basic AI content validation (not explicit faces, etc.)
- Virus scanning integration

## AI Rating System

### Character-Specific Rating Prompts
Each character has unique rating style:

```typescript
const ratingPrompts = {
  lexi: "You're Lexi 💋 rating this dick pic. Be flirty, fun, and encouraging. Rate 1-10 with a spicy comment.",
  nyx: "You're Nyx 🕷️ rating this. Be darkly poetic and mysterious. Give a rating 1-10 with gothic flair.", 
  chloe: "You're Chloe 🎀 rating this sweetly. Be gentle but honest, rate 1-10 with bookish charm.",
  aiko: "You're Aiko 🌸 rating this! Be kawaii and enthusiastic. Rate 1-10 with anime energy!",
  zaria: "You're Zaria ✨ rating this with luxury energy. Be confident and sophisticated, rate 1-10.",
  nova: "You're Nova 🔮 rating this cosmically. Use mystical metaphors, rate 1-10 with ethereal wisdom."
};
```

### AI Integration
- Use OpenAI Vision API for image analysis
- Character-specific system prompts for consistent personality
- Structured output format for rating + comment
- Content moderation integration

## React Components

### `DickRatingModal.tsx`
- Image upload interface with drag & drop
- Privacy settings (public/private leaderboard)
- Display name customization  
- Upload progress and preview
- Character selection for rating style

### `DickRatingLeaderboard.tsx`
- Monthly/all-time rankings
- Character-specific leaderboards
- User position tracking
- Rating distribution charts
- Anonymous display names

### `RatingResultModal.tsx`
- Show rating score with character animation
- Display character's comment
- Leaderboard position update
- Social sharing options (if public)

## Moderation & Safety

### Content Moderation
- AI-powered pre-screening before human review
- Flagged content goes to manual review queue
- Clear content policy and guidelines
- Appeal process for false positives

### Privacy Protection
- All images stored with UUID filenames
- No metadata linking images to users in URLs
- Automatic deletion of rejected content
- User can delete their submissions anytime

### Age Verification
- Require verified 18+ account status
- Additional age verification prompt
- Clear terms of service agreement

## Premium Integration

### Access Control
- Requires premium subscription for rating submissions
- Free users can view leaderboards only
- Rate limits: 3 submissions per month for premium users
- Additional submissions available as paid add-ons

### Pricing Structure
- Premium subscription includes base ratings
- Additional rating tokens: $2.99 per rating
- Leaderboard highlighting: $4.99/month
- Custom display names: Free for premium

## Gamification Features

### Achievement System
- "First Timer" - First rating submitted
- "Perfect 10" - Received a 10/10 rating
- "Character Favorite" - Highest rating from specific character
- "Leaderboard King" - #1 position for a month
- "Rainbow Collection" - Rated by all characters

### Leaderboard Features
- Monthly champions with special badges
- All-time hall of fame
- Character-specific rankings
- Trending/rising ratings
- Community voting on favorite comments

## Technical Implementation Steps

### Phase 1: Core Infrastructure
1. Database schema and RLS policies
2. Supabase Storage bucket with security rules  
3. Image upload API with validation
4. Basic AI rating integration

### Phase 2: Rating System
1. Character-specific rating prompts
2. AI vision integration for image analysis
3. Rating storage and leaderboard queries
4. Moderation pipeline setup

### Phase 3: UI Components
1. Upload modal with drag & drop
2. Rating display with character animations
3. Leaderboard with ranking visualization
4. User dashboard for submission history

### Phase 4: Gamification
1. Achievement system
2. Leaderboard enhancements
3. Social features (if appropriate)
4. Analytics and insights

## Security Considerations

### Data Protection
- All images encrypted at rest
- Secure deletion processes
- No image metadata leakage
- User consent tracking

### API Security  
- Rate limiting on all endpoints
- Premium access validation
- Input sanitization and validation
- Audit logging for all actions

### Legal Compliance
- Age verification systems
- Content policy enforcement
- GDPR/privacy law compliance
- Terms of service integration

## Estimated Development Time
- Phase 1: 2-3 days
- Phase 2: 3-4 days  
- Phase 3: 4-5 days
- Phase 4: 2-3 days
- **Total: ~2 weeks for full implementation**

This is going to be absolutely WILD and hilarious! 😂 The character-specific rating styles will make it incredibly entertaining while the gamification will keep users engaged. Ready to make this the most unique feature in AI girlfriend history?