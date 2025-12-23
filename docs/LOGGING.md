# Production-Safe Logging System

This project uses a custom logging system that can be controlled via environment variables to prevent debug noise in production.

## How It Works

### Development vs Production
- **Development** (`NODE_ENV=development`): Shows info, debug, warning, and error logs
- **Production** (`NODE_ENV=production`): Only shows warnings and errors

### Debug Categories
You can enable/disable specific debug categories using environment variables:

```bash
DEBUG_MEMORY=true    # Memory system debugging (message loading, user IDs, etc.)
DEBUG_CHAT=true      # Chat API debugging (AI messages, conversation history)  
DEBUG_AUTH=true      # Authentication debugging (login, tokens, etc.)
```

### Usage in Code

```typescript
import { memoryLog, chatLog, authLog, dbLog } from '@/lib/logger';

// Memory-related logging
memoryLog.debug('Loading conversation history', { userId, character });
memoryLog.error('Failed to load messages', error);

// Chat-related logging  
chatLog.debug('Final messages sent to AI', messages);
chatLog.error('API error occurred', error);

// Database-related logging
dbLog.debug('Saving user message', { message, userId });
dbLog.error('Database connection failed', error);

// Authentication logging
authLog.debug('User logged in', { email });
authLog.error('Auth token invalid', error);
```

## Production Deployment

### Environment Variables for Production
```bash
NODE_ENV=production
DEBUG_MEMORY=false     # Or omit entirely
DEBUG_CHAT=false       # Or omit entirely  
DEBUG_AUTH=false       # Or omit entirely
```

### What Gets Logged in Production
- ❌ No debug messages
- ❌ No info messages  
- ✅ Warning messages (performance issues, deprecated features)
- ✅ Error messages (actual problems that need attention)

### Log Levels
1. **debug**: Detailed debugging info (development only)
2. **info**: General information (development only)
3. **warn**: Warnings that don't break functionality (always logged)
4. **error**: Actual errors that need attention (always logged)

## Migration from console.log

### Before (Debug Noise in Production)
```typescript
console.log('💭 Loading conversation history for user:', userId);
console.log('Raw messages from database:', data);
console.error('Failed to load messages:', error);
```

### After (Production-Safe)
```typescript  
memoryLog.debug('Loading conversation history for user', { userId });
memoryLog.debug('Raw messages from database', { count: data?.length });
memoryLog.error('Failed to load messages', error);
```

## Benefits

1. **Clean Production Logs**: No debug noise in production environments
2. **Granular Control**: Enable/disable specific debugging categories  
3. **Consistent Format**: Standardized log formatting with emojis and categories
4. **Performance**: Debug logging disabled entirely in production (zero overhead)
5. **Easy Migration**: Simple find/replace to convert existing console.log statements

## Development Tips

- Enable specific debug categories you're working on: `DEBUG_MEMORY=true DEBUG_CHAT=false`
- Use structured data in logs: `memoryLog.debug('Message', { userId, count })` 
- Always log errors with context: `memoryLog.error('Failed to save', { userId, error })`
- Use appropriate log levels: debug for development, warn/error for issues