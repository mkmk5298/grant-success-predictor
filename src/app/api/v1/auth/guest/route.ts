import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess } from '@/lib/api-handler'
import { logger } from '@/lib/logger'

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('Guest mode access requested', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  try {
    // Generate a guest session ID
    const guestId = 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    
    // Store guest session data (in production, use database)
    const guestSession = {
      id: guestId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      ip: requestContext.ip,
      userAgent: requestContext.userAgent,
      analysisLimit: 2,
      analysisCount: 0
    }
    
    logger.info('Guest session created', {
      requestId,
      guestId,
      expiresAt: guestSession.expiresAt
    })
    
    // Return guest session data
    return NextResponse.json(createSuccess({
      sessionId: guestId,
      expiresAt: guestSession.expiresAt,
      remainingAnalyses: guestSession.analysisLimit - guestSession.analysisCount,
      message: 'Guest session created successfully'
    }, 'Guest access granted'))
    
  } catch (error) {
    logger.error('Failed to create guest session', { requestId }, error)
    throw error
  }
})

export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  
  logger.info('Guest session check', { 
    requestId,
    sessionId: sessionId?.substring(0, 10) + '...' || 'none'
  })
  
  if (!sessionId || !sessionId.startsWith('guest_')) {
    return NextResponse.json(createSuccess({
      valid: false,
      message: 'Invalid or missing guest session'
    }))
  }
  
  // In production, check database for session validity
  // For now, check if session is not too old (24 hours)
  const sessionParts = sessionId.split('_')
  const sessionTimestamp = parseInt(sessionParts[sessionParts.length - 1])
  const isExpired = Date.now() - sessionTimestamp > 24 * 60 * 60 * 1000
  
  return NextResponse.json(createSuccess({
    valid: !isExpired,
    sessionId,
    remainingAnalyses: isExpired ? 0 : 2,
    message: isExpired ? 'Guest session expired' : 'Guest session valid'
  }))
})