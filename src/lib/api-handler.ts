/**
 * Production-ready API handler with error handling and logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger, getRequestContext, createTimer } from './logger'

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiError {
  message: string
  code: string
  statusCode: number
  details?: any
}

export interface ApiSuccess<T = any> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code: string
    details?: any
  }
  requestId: string
  timestamp: string
}

// Standard error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// Custom API Error class
export class ApiException extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiException'
  }
}

// Error factory functions
export const createError = {
  validation: (message: string, details?: any) => 
    new ApiException(message, ERROR_CODES.VALIDATION_ERROR, 400, details),
  
  notFound: (resource: string) => 
    new ApiException(`${resource} not found`, ERROR_CODES.NOT_FOUND, 404),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new ApiException(message, ERROR_CODES.UNAUTHORIZED, 401),
  
  forbidden: (message: string = 'Forbidden') => 
    new ApiException(message, ERROR_CODES.FORBIDDEN, 403),
  
  rateLimited: (message: string = 'Rate limit exceeded') => 
    new ApiException(message, ERROR_CODES.RATE_LIMITED, 429),
  
  internal: (message: string = 'Internal server error', details?: any) => 
    new ApiException(message, ERROR_CODES.INTERNAL_ERROR, 500, details),
  
  database: (message: string, details?: any) => 
    new ApiException(message, ERROR_CODES.DATABASE_ERROR, 500, details),
  
  externalApi: (service: string, details?: any) => 
    new ApiException(`External API error: ${service}`, ERROR_CODES.EXTERNAL_API_ERROR, 502, details),
  
  fileTooLarge: (maxSize: string) => 
    new ApiException(`File too large. Maximum size: ${maxSize}`, ERROR_CODES.FILE_TOO_LARGE, 413),
  
  invalidFileType: (allowedTypes: string[]) => 
    new ApiException(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, ERROR_CODES.INVALID_FILE_TYPE, 415)
}

// Success response factory
export function createSuccess<T>(data: T, message?: string): ApiSuccess<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  }
}

// Error response factory
export function createErrorResponse(
  error: ApiException | Error | unknown,
  requestId: string
): ApiErrorResponse {
  if (error instanceof ApiException) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details
      },
      requestId,
      timestamp: new Date().toISOString()
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        code: ERROR_CODES.INTERNAL_ERROR,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      requestId,
      timestamp: new Date().toISOString()
    }
  }

  return {
    success: false,
    error: {
      message: 'Unknown error occurred',
      code: ERROR_CODES.INTERNAL_ERROR,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    },
    requestId,
    timestamp: new Date().toISOString()
  }
}

// API handler wrapper with logging and error handling
export function withApiHandler(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  return async function(req: NextRequest, context: any = {}): Promise<NextResponse> {
    const timer = createTimer()
    const requestContext = getRequestContext(req)
    
    // Log request start
    logger.apiStart(req.method, requestContext.endpoint!, requestContext)
    
    try {
      // Add request context to the handler context
      const enhancedContext = {
        ...context,
        requestContext,
        requestId: requestContext.requestId!
      }
      
      const response = await handler(req, enhancedContext)
      const duration = timer.end()
      
      // Log success
      logger.apiSuccess(
        req.method, 
        requestContext.endpoint!, 
        response.status, 
        duration, 
        requestContext
      )
      
      return response
      
    } catch (error) {
      const duration = timer.end()
      
      if (error instanceof ApiException) {
        const errorResponse = createErrorResponse(error, requestContext.requestId!)
        
        logger.apiError(
          req.method,
          requestContext.endpoint!,
          error.statusCode,
          duration,
          error,
          requestContext
        )
        
        return NextResponse.json(errorResponse, { 
          status: error.statusCode 
        })
      }
      
      // Unexpected error
      const errorResponse = createErrorResponse(error, requestContext.requestId!)
      
      logger.apiError(
        req.method,
        requestContext.endpoint!,
        500,
        duration,
        error,
        requestContext
      )
      
      return NextResponse.json(errorResponse, { 
        status: 500 
      })
    }
  }
}

// Validation helper
export function validateRequired(data: Record<string, any>, fields: string[]): void {
  const missing = fields.filter(field => 
    data[field] === undefined || 
    data[field] === null || 
    data[field] === ''
  )
  
  if (missing.length > 0) {
    throw createError.validation(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    )
  }
}

// File validation helper
export function validateFile(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    maxFiles?: number
  } = {}
): void {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/*', 'application/pdf', 'text/*']
  } = options

  if (file.size > maxSize) {
    throw createError.fileTooLarge(`${(maxSize / 1024 / 1024).toFixed(1)}MB`)
  }

  const isValidType = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0]
      return file.type.startsWith(category + '/')
    }
    return file.type === type
  })

  if (!isValidType) {
    throw createError.invalidFileType(allowedTypes)
  }
}

// Enhanced rate limiting with database backing and Redis fallback
import { connectToDatabase } from './database'

// In-memory fallback for when database is unavailable
const requestCounts = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  identifier: string
  limit?: number
  windowMs?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export async function checkRateLimit({
  identifier,
  limit = 100,
  windowMs = 60 * 1000, // 1 minute
  skipSuccessfulRequests = false,
  skipFailedRequests = false
}: RateLimitOptions): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - windowMs
  
  try {
    // Try database-backed rate limiting first
    const db = await connectToDatabase()
    
    if (db) {
      // Create rate_limits table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id VARCHAR(255) PRIMARY KEY,
          count INTEGER DEFAULT 1,
          window_start BIGINT NOT NULL,
          reset_time BIGINT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Clean up expired entries (older than 24 hours)
      await db.query(
        'DELETE FROM rate_limits WHERE reset_time < $1',
        [now - (24 * 60 * 60 * 1000)]
      )
      
      // Check current rate limit
      const result = await db.query(
        'SELECT count, reset_time FROM rate_limits WHERE id = $1',
        [identifier]
      )
      
      if (result.rows.length === 0 || now > result.rows[0].reset_time) {
        // Create new rate limit entry
        await db.query(`
          INSERT INTO rate_limits (id, count, window_start, reset_time) 
          VALUES ($1, 1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET
            count = 1,
            window_start = $2,
            reset_time = $3,
            updated_at = NOW()
        `, [identifier, now, now + windowMs])
        
        return true
      }
      
      const currentCount = result.rows[0].count
      
      if (currentCount >= limit) {
        return false
      }
      
      // Increment counter
      await db.query(
        'UPDATE rate_limits SET count = count + 1, updated_at = NOW() WHERE id = $1',
        [identifier]
      )
      
      return true
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Database rate limiting failed, falling back to in-memory:', error)
    }
  }
  
  // Fallback to in-memory rate limiting
  return checkRateLimitInMemory(identifier, limit, windowMs)
}

function checkRateLimitInMemory(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const userLimit = requestCounts.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

// Get rate limit info for headers
export async function getRateLimitInfo(identifier: string, windowMs: number = 60 * 1000): Promise<{
  limit: number
  remaining: number
  reset: number
}> {
  const now = Date.now()
  
  try {
    const db = await connectToDatabase()
    
    if (db) {
      const result = await db.query(
        'SELECT count, reset_time FROM rate_limits WHERE id = $1',
        [identifier]
      )
      
      if (result.rows.length === 0 || now > result.rows[0].reset_time) {
        return { limit: 100, remaining: 99, reset: Math.floor((now + windowMs) / 1000) }
      }
      
      const count = result.rows[0].count
      const resetTime = result.rows[0].reset_time
      
      return {
        limit: 100,
        remaining: Math.max(0, 100 - count),
        reset: Math.floor(resetTime / 1000)
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get rate limit info:', error)
    }
  }
  
  // Fallback to in-memory
  const userLimit = requestCounts.get(identifier)
  if (!userLimit || now > userLimit.resetTime) {
    return { limit: 100, remaining: 99, reset: Math.floor((now + windowMs) / 1000) }
  }
  
  return {
    limit: 100,
    remaining: Math.max(0, 100 - userLimit.count),
    reset: Math.floor(userLimit.resetTime / 1000)
  }
}

// Different rate limits for different endpoints
export const RATE_LIMITS = {
  STRICT: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  STANDARD: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
  LENIENT: { limit: 1000, windowMs: 60 * 1000 }, // 1000 per minute
  UPLOAD: { limit: 5, windowMs: 60 * 1000 }, // 5 uploads per minute
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 auth attempts per 15 minutes
} as const

// Cleanup old rate limit entries (in-memory fallback)
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute