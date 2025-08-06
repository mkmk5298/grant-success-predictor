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

// Rate limiting helper (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
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

// Cleanup old rate limit entries
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute