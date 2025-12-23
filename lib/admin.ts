import type { User } from '@supabase/supabase-js';

const ADMIN_EMAILS = [
  'tramel.jones@icloud.com',
  'tramel.jones@gmail.com',
  'token.blakk@gmail.com'
];

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) {
    return false;
  }
  
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export function requireAdmin(user: User | null): void {
  if (!isAdminUser(user)) {
    throw new Error('Admin access required');
  }
}

export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}