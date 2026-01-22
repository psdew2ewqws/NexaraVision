/**
 * Logger Utility
 * Wraps console methods to only log in development mode
 * Reduces noise in production while keeping useful debugging during development
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDev;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    return this.prefix
      ? `[${timestamp}] [${this.prefix}] ${message}`
      : `[${timestamp}] ${message}`;
  }

  debug(...args: unknown[]): void {
    if (this.enabled && isDev) {
      console.log(...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.enabled && isDev) {
      console.info(...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]): void {
    // Errors always log
    console.error(...args);
  }
}

// Pre-configured loggers for different modules
export const logger = new Logger();
export const authLogger = new Logger({ prefix: 'Auth' });
export const wsLogger = new Logger({ prefix: 'WS' });
export const storageLogger = new Logger({ prefix: 'Storage' });
export const incidentLogger = new Logger({ prefix: 'Incident' });
export const cameraLogger = new Logger({ prefix: 'Camera' });
export const alertLogger = new Logger({ prefix: 'Alert' });

// Factory function for custom loggers
export function createLogger(prefix: string, enabled = isDev): Logger {
  return new Logger({ prefix, enabled });
}

export default logger;
