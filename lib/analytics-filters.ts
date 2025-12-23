// lib/analytics-filters.ts
// Centralized filtering for analytics to exclude test users and get clean production metrics

export const TEST_USER_IDS = [
  '9196d16b-4ae3-484b-8d50-60cfff303edc', // Tramel Jones - hello@chatverse.ai
  '1bf178a0-8371-4988-a6a5-7c3e0da7120b', // Tramel Jones - token.blakk@gmail.com
  'a551995b-48a8-4a56-8fa1-1c617775b8d7', // Tramel Jones - tramel.jones@gmail.com
  '75bf3083-546f-48de-b3b4-95e57dd8afeb', // Lexi Lexicon - lexilexicon22@gmail.com
];

export const TEST_USER_EMAILS = [
  'hello@chatverse.ai',
  'token.blakk@gmail.com',
  'tramel.jones@gmail.com',
  'lexilexicon22@gmail.com',
  'nyxnoire6@gmail.com'
];

/**
 * Get SQL condition to exclude test users from analytics queries
 */
export function getTestUserExclusionCondition(userIdColumn: string = 'user_id'): string {
  const testUsersList = TEST_USER_IDS.map(id => `'${id}'`).join(',');
  return `${userIdColumn} NOT IN (${testUsersList})`;
}

/**
 * Filter test users from a dataset based on user_id field
 */
export function filterTestUsers<T extends { user_id?: string }>(data: T[]): T[] {
  return data.filter(item => item.user_id && !TEST_USER_IDS.includes(item.user_id));
}

/**
 * Filter test users from orders based on user_email in stripe_metadata
 */
export function filterTestUserOrders<T extends { stripe_metadata?: any }>(orders: T[]): T[] {
  return orders.filter(order => {
    if (!order.stripe_metadata) return true;

    const metadata = typeof order.stripe_metadata === 'string'
      ? JSON.parse(order.stripe_metadata)
      : order.stripe_metadata;

    const userEmail = metadata?.user_email;
    return !userEmail || !TEST_USER_EMAILS.includes(userEmail.toLowerCase());
  });
}

/**
 * Check if analytics filtering is enabled (environment variable)
 */
export function isAnalyticsFilteringEnabled(): boolean {
  return process.env.FILTER_TEST_USERS_IN_ANALYTICS === 'true';
}