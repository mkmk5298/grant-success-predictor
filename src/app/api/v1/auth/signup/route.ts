import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, checkRateLimit, RATE_LIMITS } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { validateRequest, authSignupSchema } from '@/lib/validation/schemas'
import bcrypt from 'bcryptjs'

interface SignupRequest {
  email: string
  password: string
  name: string
  organizationName?: string
  organizationType?: string
  savedResults?: any
}

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const timer = createTimer()
  
  logger.info('Signup request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting for signup
  const clientIp = requestContext.ip || 'unknown'
  const rateLimitAllowed = await checkRateLimit({
    identifier: `signup:${clientIp}`,
    limit: 5, // 5 signups per hour
    windowMs: 60 * 60 * 1000 // 1 hour
  })
  
  if (!rateLimitAllowed) {
    logger.warn('Rate limit exceeded for signup', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many signup attempts. Please try again later.')
  }
  
  let body: SignupRequest
  try {
    const rawBody = await request.json()
    
    // Validate request body
    body = validateRequest(authSignupSchema, rawBody) as SignupRequest
    
    logger.debug('Signup request validated', {
      requestId,
      email: body.email.substring(0, 3) + '***',
      hasOrganization: !!body.organizationName
    })
    
  } catch (error) {
    logger.warn('Signup validation failed', { requestId, error: error instanceof Error ? error.message : String(error) })
    
    if (error instanceof Error && error.message.includes('Validation failed:')) {
      throw createError.validation(error.message)
    }
    
    throw createError.validation('Invalid signup data')
  }
  
  try {
    // Check if user already exists (in production, check database)
    // For demo, we'll simulate this
    const emailLower = body.email.toLowerCase()
    
    // Simulate checking existing user
    if (emailLower === 'existing@example.com') {
      logger.warn('Signup attempted with existing email', { 
        requestId, 
        email: emailLower.substring(0, 3) + '***'
      })
      throw createError.validation('An account with this email already exists')
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10)
    
    // Create user (in production, save to database)
    const newUser = {
      id: 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
      email: emailLower,
      name: body.name,
      passwordHash: hashedPassword,
      organizationName: body.organizationName,
      organizationType: body.organizationType,
      createdAt: new Date().toISOString(),
      emailVerified: false,
      subscription: 'free',
      analysisCount: 0,
      analysisLimit: 2
    }
    
    logger.info('User account created', {
      requestId,
      userId: newUser.id,
      email: newUser.email.substring(0, 3) + '***',
      processingTime: timer.end()
    })
    
    // Generate session token (in production, use proper JWT)
    const sessionToken = 'session_' + Math.random().toString(36).substr(2, 20)
    
    // If there were saved results, associate them with the new account
    if (body.savedResults) {
      logger.info('Associating saved results with new account', {
        requestId,
        userId: newUser.id,
        hasResults: true
      })
    }
    
    return NextResponse.json(createSuccess({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        organizationName: newUser.organizationName,
        subscription: newUser.subscription,
        remainingAnalyses: newUser.analysisLimit - newUser.analysisCount
      },
      sessionToken,
      message: 'Account created successfully'
    }, 'Signup successful'))
    
  } catch (error) {
    const processingTime = timer.end()
    logger.error('Signup failed', { 
      requestId, 
      processingTime,
      email: body.email.substring(0, 3) + '***'
    }, error)
    
    // Re-throw if it's already a formatted error
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    
    throw createError.internal('Failed to create account. Please try again.')
  }
})

export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('Signup info request', { requestId, method: 'GET' })
  
  return NextResponse.json(createSuccess({
    message: 'Grant Predictor Signup API',
    version: '1.0.0',
    requirements: {
      email: 'Valid email address',
      password: 'Minimum 8 characters',
      name: 'Full name',
      organizationName: 'Optional organization name',
      organizationType: 'Optional: nonprofit, university, startup, corporation, individual'
    },
    benefits: {
      free: {
        analyses: '2 per month',
        recommendations: 'Basic AI recommendations',
        grants: 'Access to basic grant database'
      },
      pro: {
        analyses: 'Unlimited',
        recommendations: 'Advanced AI recommendations',
        grants: 'Full grant database with matching',
        price: '$19/month'
      }
    }
  }))
})