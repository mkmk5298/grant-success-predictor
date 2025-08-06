/**
 * Production-ready logging utility for Vercel Functions
 * Structured logging with different levels and contexts
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  requestId?: string
  endpoint?: string
  method?: string
  userAgent?: string
  ip?: string
  timestamp?: string
  duration?: number
  statusCode?: number
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error | unknown
  stack?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date().toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    
    if (this.isDevelopment) {
      // Development: Human-readable format with emojis
      const emoji = this.getLevelEmoji(entry.level)
      return `${emoji} [${timestamp}] ${level} - ${entry.message}${entry.context ? '\n' + JSON.stringify(entry.context, null, 2) : ''}`
    } else {
      // Production: Structured JSON for log aggregation
      const logData: any = {
        timestamp,
        level: entry.level,
        message: entry.message,
        context: entry.context || {}
      }
      
      if (entry.error) {
        logData.error = this.serializeError(entry.error)
      }
      
      return JSON.stringify(logData)
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🐛'
      case 'info': return 'ℹ️'
      case 'warn': return '⚠️'
      case 'error': return '❌'
      default: return '📝'
    }
  }

  private serializeError(error: unknown): object {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      }
    }
    return { error: String(error) }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      },
      error
    }

    const formatted = this.formatMessage(entry)

    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext, error?: unknown): void {
    this.log('warn', message, context, error)
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    this.log('error', message, context, error)
  }

  // API-specific logging methods
  apiStart(method: string, endpoint: string, context?: LogContext): void {
    this.info(`API ${method} ${endpoint} - Request started`, {
      ...context,
      method,
      endpoint,
      type: 'api_start'
    })
  }

  apiSuccess(method: string, endpoint: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`API ${method} ${endpoint} - Success`, {
      ...context,
      method,
      endpoint,
      statusCode,
      duration,
      type: 'api_success'
    })
  }

  apiError(method: string, endpoint: string, statusCode: number, duration: number, error: unknown, context?: LogContext): void {
    this.error(`API ${method} ${endpoint} - Error`, {
      ...context,
      method,
      endpoint,
      statusCode,
      duration,
      type: 'api_error'
    }, error)
  }

  // Database logging
  dbQuery(query: string, duration?: number, context?: LogContext): void {
    this.debug('Database query executed', {
      ...context,
      query,
      duration,
      type: 'db_query'
    })
  }

  dbError(query: string, error: unknown, context?: LogContext): void {
    this.error('Database query failed', {
      ...context,
      query,
      type: 'db_error'
    }, error)
  }

  // External API calls
  externalApiCall(service: string, endpoint: string, method: string, context?: LogContext): void {
    this.info(`External API call to ${service}`, {
      ...context,
      service,
      endpoint,
      method,
      type: 'external_api'
    })
  }

  externalApiError(service: string, endpoint: string, error: unknown, context?: LogContext): void {
    this.error(`External API call failed - ${service}`, {
      ...context,
      service,
      endpoint,
      type: 'external_api_error'
    }, error)
  }
}

// Export singleton instance
export const logger = new Logger()

// Helper function to extract request context
export function getRequestContext(request: Request): LogContext {
  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor || realIp || 'unknown'

  return {
    method: request.method,
    endpoint: url.pathname,
    userAgent,
    ip,
    requestId: crypto.randomUUID()
  }
}

// Performance timing utility
export function createTimer(): { end: () => number } {
  const start = Date.now()
  return {
    end: () => Date.now() - start
  }
}

export default logger