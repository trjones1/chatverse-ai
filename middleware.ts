// middleware.ts - Enhanced with comprehensive rate limiting
import { enhancedMiddleware } from '@/lib/middleware-rate-limiting';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  return enhancedMiddleware(req);
}

export const config = {
  // Run on everything except static assets; includes /api/*
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
