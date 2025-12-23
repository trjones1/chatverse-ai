// Production-safe logging system
// Controlled by environment variables to prevent debug noise in production

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private debugMemory = process.env.DEBUG_MEMORY === 'true';
  private debugChat = process.env.DEBUG_CHAT === 'true';
  private debugAuth = process.env.DEBUG_AUTH === 'true';

  private shouldLog(level: LogLevel, category?: string): boolean {
    // Always log errors and warnings
    if (level === 'error' || level === 'warn') {
      return true;
    }

    // Only log debug/info in development or with specific debug flags
    if (level === 'debug') {
      if (!this.isDevelopment) return false;
      
      // Check category-specific debug flags
      if (category === 'memory' && !this.debugMemory) return false;
      if (category === 'chat' && !this.debugChat) return false;
      if (category === 'auth' && !this.debugAuth) return false;
      
      return true;
    }

    // Info level logs in development only
    if (level === 'info') {
      return this.isDevelopment;
    }

    return false;
  }

  debug(message: string, data?: any, category?: string): void {
    if (this.shouldLog('debug', category)) {
      if (data) {
        console.log(`🔧 ${message}`, data);
      } else {
        console.log(`🔧 ${message}`);
      }
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      if (data) {
        console.log(`ℹ️ ${message}`, data);
      } else {
        console.log(`ℹ️ ${message}`);
      }
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      if (data) {
        console.warn(`⚠️ ${message}`, data);
      } else {
        console.warn(`⚠️ ${message}`);
      }
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      if (error) {
        console.error(`❌ ${message}`, error);
      } else {
        console.error(`❌ ${message}`);
      }
    }
  }

  // Specialized logging methods for different categories
  memory = {
    debug: (message: string, data?: any) => this.debug(message, data, 'memory'),
    info: (message: string, data?: any) => this.info(`💭 ${message}`, data),
    error: (message: string, error?: any) => this.error(`💭 Memory Error: ${message}`, error)
  };

  chat = {
    debug: (message: string, data?: any) => this.debug(message, data, 'chat'),
    info: (message: string, data?: any) => this.info(`💬 ${message}`, data),
    error: (message: string, error?: any) => this.error(`💬 Chat Error: ${message}`, error)
  };

  auth = {
    debug: (message: string, data?: any) => this.debug(message, data, 'auth'),
    info: (message: string, data?: any) => this.info(`🔐 ${message}`, data),
    error: (message: string, error?: any) => this.error(`🔐 Auth Error: ${message}`, error)
  };

  db = {
    debug: (message: string, data?: any) => this.debug(`💾 ${message}`, data),
    info: (message: string, data?: any) => this.info(`💾 ${message}`, data),
    error: (message: string, error?: any) => this.error(`💾 Database Error: ${message}`, error)
  };
}

// Export a singleton instance
export const logger = new Logger();

// Convenience exports
export const { memory: memoryLog, chat: chatLog, auth: authLog, db: dbLog } = logger;