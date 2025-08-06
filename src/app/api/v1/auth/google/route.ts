import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, validateRequired, checkRateLimit } from '@/lib/api-handler'
import { logger } from '@/lib/logger'

interface GoogleAuthRequest {
  token: string
  provider?: 'google'
}

interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
  created_at?: string
}

async function verifyGoogleToken(token: string): Promise<GoogleUser> {
  logger.debug('Starting Google token verification', { tokenLength: token.length })
  
  try {
    // REAL Google OAuth verification - NO DEMO MODE
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
    
    logger.externalApiCall('Google OAuth', '/oauth2/v1/tokeninfo', 'GET', { token: token.substring(0, 10) + '...' })
    
    if (!response.ok) {
      throw createError.unauthorized('Invalid Google token')
    }
    
    const userInfo = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
    if (!userInfo.ok) {
      throw createError.unauthorized('Failed to get user info from Google')
    }
    
    const userData = await userInfo.json()
    
    logger.info('Google authentication successful', { 
      userId: userData.id, 
      email: userData.email 
    })
    
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      verified_email: userData.verified_email,
      created_at: new Date().toISOString()
    }
    
  } catch (error) {
    logger.externalApiError('Google OAuth', '/oauth2/v1/tokeninfo', error)
    throw error instanceof Error ? error : createError.internal('Google token verification failed')
  }
}

async function createOrUpdateUser(googleUser: GoogleUser): Promise<GoogleUser> {
  logger.debug('Creating or updating user', { userId: googleUser.id, email: googleUser.email })
  
  try {
    // In production, implement database operations
    /*
    const db = await getDatabase()
    const existingUser = await db.query('SELECT * FROM users WHERE google_id = $1', [googleUser.id])
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      await db.query(
        'UPDATE users SET name = $1, picture = $2, updated_at = NOW() WHERE google_id = $3',
        [googleUser.name, googleUser.picture, googleUser.id]
      )
      logger.info('User updated successfully', { userId: googleUser.id })
    } else {
      // Create new user
      await db.query(
        'INSERT INTO users (google_id, email, name, picture) VALUES ($1, $2, $3, $4)',
        [googleUser.id, googleUser.email, googleUser.name, googleUser.picture]
      )
      logger.info('New user created successfully', { userId: googleUser.id, email: googleUser.email })
    }
    */
    
    // Mock database operation
    logger.info('User processed successfully (mock)', { 
      userId: googleUser.id, 
      email: googleUser.email,
      type: 'mock_user_operation'
    })
    
    return googleUser
    
  } catch (error) {
    logger.dbError('CREATE/UPDATE user', error, { userId: googleUser.id })
    throw createError.database('Failed to create or update user account')
  }
}

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('Google authentication request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp, 10, 60 * 1000)) { // 10 requests per minute
    logger.warn('Rate limit exceeded for Google auth', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many authentication attempts. Please try again later.')
  }
  
  let body: GoogleAuthRequest
  try {
    body = await request.json()
  } catch (error) {
    logger.warn('Invalid JSON in request body', { requestId, error })
    throw createError.validation('Invalid request format')
  }
  
  // Validate required fields
  validateRequired(body, ['token'])
  
  const { token, provider = 'google' } = body
  
  logger.debug('Processing authentication', { 
    requestId, 
    provider, 
    tokenLength: token.length,
    hasToken: !!token
  })
  
  if (provider !== 'google') {
    throw createError.validation('Only Google authentication is supported')
  }
  
  try {
    // Verify Google token
    const googleUser = await verifyGoogleToken(token)
    
    // Create or update user in database
    const user = await createOrUpdateUser(googleUser)
    
    // In production, generate JWT or session token here
    const sessionToken = crypto.randomUUID() // Mock session token
    
    logger.info('Authentication completed successfully', {
      requestId,
      userId: user.id,
      email: user.email,
      provider,
      sessionToken: sessionToken.substring(0, 8) + '...'
    })
    
    return NextResponse.json(createSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        verified_email: user.verified_email
      },
      sessionToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }, 'Authentication successful'))
    
  } catch (error) {
    logger.error('Google authentication failed', { 
      requestId, 
      provider,
      tokenPreview: token.substring(0, 10) + '...'
    }, error)
    throw error
  }
})

export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.warn('GET method not allowed for auth endpoint', { 
    requestId,
    method: 'GET',
    endpoint: '/api/v1/auth/google' 
  })
  
  throw createError.validation('Method not allowed. Use POST for authentication.')
})