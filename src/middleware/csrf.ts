/**
 * CSRF Protection Middleware
 * Implements Cross-Site Request Forgery protection for all API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, timingSafeEqual } from 'crypto'

// CSRF token storage (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expires: number; used: boolean }>()

// CSRF configuration
const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  COOKIE_NAME: 'csrf-token',
  HEADER_NAME: 'x-csrf-token',
  SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS']
}

/**
 * Generates a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex')
}

/**
 * Creates a session identifier from request
 */
function getSessionId(request: NextRequest): string {
  // In production, use actual session ID from authentication
  // For now, use IP + User-Agent as a simple identifier
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return Buffer.from(`${ip}:${userAgent}`).toString('base64')
}

/**
 * Stores CSRF token for a session
 */
export function storeCSRFToken(sessionId: string, token: string): void {
  // Clean up expired tokens
  cleanupExpiredTokens()
  
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + CSRF_CONFIG.TOKEN_EXPIRY_MS,
    used: false
  })
}

/**
 * Validates CSRF token for a session
 */
export function validateCSRFToken(sessionId: string, providedToken: string): boolean {
  const storedData = csrfTokens.get(sessionId)
  
  if (!storedData) {
    return false
  }
  
  // Check if token has expired
  if (Date.now() > storedData.expires) {
    csrfTokens.delete(sessionId)
    return false
  }
  
  // Check if token was already used (one-time use)
  if (storedData.used) {
    return false
  }
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const storedTokenBuffer = Buffer.from(storedData.token, 'hex')
    const providedTokenBuffer = Buffer.from(providedToken, 'hex')
    
    if (storedTokenBuffer.length !== providedTokenBuffer.length) {
      return false
    }
    
    const isValid = timingSafeEqual(storedTokenBuffer, providedTokenBuffer)
    
    if (isValid) {
      // Mark token as used
      storedData.used = true
    }
    
    return isValid
  } catch (error) {
    return false
  }
}

/**
 * Cleanup expired CSRF tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now()
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now > data.expires) {
      csrfTokens.delete(sessionId)
    }
  }
}

/**
 * CSRF Protection Middleware
 */
export function withCSRFProtection(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  return async function(req: NextRequest, context: any = {}): Promise<NextResponse> {
    const method = req.method
    const sessionId = getSessionId(req)
    
    // Skip CSRF protection for safe methods
    if (CSRF_CONFIG.SAFE_METHODS.includes(method)) {
      // For GET requests, provide a CSRF token
      if (method === 'GET') {
        const token = generateCSRFToken()
        storeCSRFToken(sessionId, token)
        
        const response = await handler(req, context)
        
        // Add CSRF token to response headers and cookie
        response.headers.set('x-csrf-token', token)
        response.cookies.set(CSRF_CONFIG.COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: CSRF_CONFIG.TOKEN_EXPIRY_MS / 1000
        })
        
        return response
      }
      
      return handler(req, context)
    }
    
    // For state-changing methods, validate CSRF token
    const tokenFromHeader = req.headers.get(CSRF_CONFIG.HEADER_NAME)
    const tokenFromCookie = req.cookies.get(CSRF_CONFIG.COOKIE_NAME)?.value
    
    // Token must be provided in header
    if (!tokenFromHeader) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'CSRF token required in header',
            code: 'CSRF_TOKEN_MISSING'
          }
        },
        { status: 403 }
      )
    }
    
    // Validate CSRF token
    if (!validateCSRFToken(sessionId, tokenFromHeader)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or expired CSRF token',
            code: 'CSRF_TOKEN_INVALID'
          }
        },
        { status: 403 }
      )
    }
    
    // CSRF validation passed, proceed with request
    return handler(req, context)
  }
}

/**
 * Generate CSRF token for client use
 */
export function getCSRFTokenForClient(request: NextRequest): string {
  const sessionId = getSessionId(request)
  const token = generateCSRFToken()
  storeCSRFToken(sessionId, token)
  return token
}

/**
 * Middleware to add CSRF token to response headers
 */
export function addCSRFTokenToResponse(response: NextResponse, token: string): NextResponse {
  response.headers.set('x-csrf-token', token)
  response.cookies.set(CSRF_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_CONFIG.TOKEN_EXPIRY_MS / 1000
  })
  return response
}

// Cleanup expired tokens every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(() => {
    cleanupExpiredTokens()
  }, 5 * 60 * 1000)
}