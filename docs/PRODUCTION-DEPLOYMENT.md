# Production Deployment Guide

This guide ensures your production deployment works correctly regardless of NODE_ENV settings.

## Environment Variables for Production

### ✅ Safe to Set NODE_ENV=production
The app now uses specific environment variables instead of relying on NODE_ENV for critical functionality.

### Required Production Variables
```bash
# Core Application
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Database & APIs  
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENROUTER_API_KEY=your_openrouter_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Production Logging (Clean Logs)
DEBUG_MEMORY=false          # Disable memory debug logs
DEBUG_CHAT=false            # Disable chat debug logs  
DEBUG_AUTH=false            # Disable auth debug logs

# Admin Tools (Security)
# Omit these entirely or set to false
NEXT_PUBLIC_ENABLE_ADMIN_TOOLS=false
ENABLE_ADMIN_TOOLS=false
```

## What Changed (NODE_ENV Independence)

### 🔧 Cookie Security
**Before**: Cookies were only secure if NODE_ENV=production
```typescript
secure: process.env.NODE_ENV === 'production'  // ❌ Fragile
```

**After**: Uses multiple detection methods
```typescript
secure: process.env.VERCEL_ENV === 'production' ||     // Vercel detection
        process.env.NEXT_PUBLIC_SITE_URL?.includes('https://') || // HTTPS detection
        process.env.NODE_ENV === 'production'          // Fallback
```

### 🛠️ Admin Tools
**Before**: Hidden/blocked if NODE_ENV=production
```typescript
if (process.env.NODE_ENV !== 'development') return null;  // ❌ Inflexible
```

**After**: Uses dedicated flags
```typescript
if (!process.env.NEXT_PUBLIC_ENABLE_ADMIN_TOOLS) return null;  // ✅ Explicit control
```

### 📊 Logging System
**Before**: All logging disabled if NODE_ENV=production
```typescript
debug: process.env.NODE_ENV === 'development'  // ❌ All or nothing
```

**After**: Granular debug control + always log errors/warnings
```typescript
debugMemory: process.env.DEBUG_MEMORY === 'true'  // ✅ Granular control
debugChat: process.env.DEBUG_CHAT === 'true'      // ✅ Category-specific
// Errors and warnings always logged regardless of NODE_ENV
```

## Deployment Checklist

### ☑️ Environment Variables Set
- [ ] All required production variables configured
- [ ] Debug flags set to false (or omitted)
- [ ] Admin tool flags omitted or set to false
- [ ] HTTPS URL configured in NEXT_PUBLIC_SITE_URL

### ☑️ Security Verified
- [ ] Admin cleanup tools not accessible in production
- [ ] Cookies use secure flag over HTTPS
- [ ] Debug logging disabled (no sensitive data in logs)
- [ ] Service role key properly secured

### ☑️ Functionality Tested
- [ ] Authentication works (secure cookies)
- [ ] Payments process correctly (Stripe integration)
- [ ] Memory system functions (no debug noise)
- [ ] Chat API responds properly

## Vercel Deployment

Vercel automatically sets:
- `VERCEL_ENV=production` (for production deployments)
- `NODE_ENV=production` (can be overridden if needed)

You can safely set `NODE_ENV=development` on Vercel if needed for debugging, since the app now uses:
- `VERCEL_ENV` for production detection
- `NEXT_PUBLIC_SITE_URL` for HTTPS detection  
- Specific debug flags for logging control

## Benefits of This Approach

1. **Flexible NODE_ENV**: Can set to development for debugging without breaking security
2. **Granular Control**: Enable/disable specific debug categories
3. **Secure by Default**: Cookies secure over HTTPS regardless of NODE_ENV
4. **Admin Safety**: Admin tools explicitly controlled, not accidentally exposed
5. **Clean Production**: No debug noise in production logs unless explicitly enabled

## Migration Summary

| Functionality | Before (NODE_ENV dependent) | After (Independent) |
|---------------|---------------------------|-------------------|
| Cookie Security | `NODE_ENV === 'production'` | `VERCEL_ENV` + HTTPS detection |
| Debug Logging | `NODE_ENV === 'development'` | `DEBUG_MEMORY`, `DEBUG_CHAT`, etc. |  
| Admin Tools | `NODE_ENV !== 'development'` | `ENABLE_ADMIN_TOOLS` flag |
| Error Logging | Affected by NODE_ENV | Always enabled (production safe) |

Your app is now production-ready with flexible environment configuration! 🚀