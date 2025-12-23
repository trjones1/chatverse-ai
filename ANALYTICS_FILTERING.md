# Analytics Test User Filtering

This feature allows filtering out test users from analytics dashboards to get clean production metrics.

## Environment Variable

Set `FILTER_TEST_USERS_IN_ANALYTICS=true` in your environment variables to enable test user filtering.

## Test Users Excluded

The following test user accounts are excluded when filtering is enabled:

- `hello@chatverse.ai` (Tramel Jones - ID: 9196d16b-4ae3-484b-8d50-60cfff303edc)
- `token.blakk@gmail.com` (Tramel Jones - ID: 1bf178a0-8371-4988-a6a5-7c3e0da7120b)
- `tramel.jones@gmail.com` (Tramel Jones - ID: a551995b-48a8-4a56-8fa1-1c61775b8d7)
- `lexilexicon22@gmail.com` (Lexi Lexicon - ID: 75bf3083-546f-48de-b3b4-95e57dd8afeb)
- `nyxnoire6@gmail.com` (Character test account)

## Affected Endpoints

When filtering is enabled, the following admin analytics endpoints exclude test user data:

- `/api/admin/versecoins-economy` - VerseCoins economy dashboard
- `/api/admin/unified-revenue` - Unified revenue analytics dashboard

## What Gets Filtered

### VerseCoins Transactions
- Minting (credit) transactions from test users
- Spending (debit) transactions from test users
- User balance calculations exclude test users
- Recent activity excludes test user transactions

### Orders & Purchases
- VerseCoins purchase orders from test users (filtered by email in stripe_metadata)
- Subscription purchase orders from test users
- Voice pack purchases from test users
- Tip transactions from test users

### Analytics Metrics
- Active user counts exclude test users
- Revenue calculations exclude test user purchases
- Product popularity excludes test user purchases
- Subscription metrics exclude test user subscriptions

## Implementation Details

The filtering is implemented through:

1. **`lib/analytics-filters.ts`** - Central configuration for test user IDs and filtering functions
2. **Database-level filtering** - Uses SQL NOT IN clauses for user_id columns
3. **Order filtering** - Filters orders by user email in stripe_metadata
4. **Environment toggle** - Easy to enable/disable for different environments

This ensures analytics reflect genuine user behavior while preserving test data for development purposes.