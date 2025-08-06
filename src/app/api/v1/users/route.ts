import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, validateRequired, checkRateLimit } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { UserService } from '@/lib/services/user-service'

interface UserProfileRequest {
  email: string
  name?: string
  organizationName?: string
  organizationType?: string
  profileData?: {
    mission?: string
    focusAreas?: string[]
    annualBudget?: number
    staffSize?: number
    yearsOperating?: number
    previousGrants?: string[]
    geographicScope?: string[]
  }
}

interface UserUpdateRequest {
  organizationName?: string
  organizationType?: string
  profileData?: {
    mission?: string
    focusAreas?: string[]
    annualBudget?: number
    staffSize?: number
    yearsOperating?: number
    previousGrants?: string[]
    geographicScope?: string[]
  }
}

const userService = new UserService()

// Get user profile or search users
export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const search = searchParams.get('search')
  const organizationType = searchParams.get('organization_type')
  
  logger.info('User profile/search request received', { 
    requestId,
    hasEmail: !!email,
    hasSearch: !!search,
    organizationType
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp, 20, 60 * 1000)) { // 20 requests per minute
    logger.warn('Rate limit exceeded for user operations', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many user requests. Please try again later.')
  }
  
  try {
    if (email) {
      // Get specific user profile
      const user = await userService.getUserProfile(email)
      
      if (!user) {
        logger.info('User not found', { requestId, email: email.substring(0, 3) + '***' })
        return NextResponse.json(createSuccess({ user: null }, 'User not found'))
      }
      
      logger.info('User profile retrieved', { 
        requestId, 
        userId: user.id.substring(0, 8) + '...',
        email: email.substring(0, 3) + '***'
      })
      
      return NextResponse.json(createSuccess({ user }))
      
    } else if (search) {
      // Search users
      const users = await userService.searchUsers(search, 10)
      
      logger.info('User search completed', {
        requestId,
        query: search.substring(0, 20) + '...',
        resultsCount: users.length
      })
      
      return NextResponse.json(createSuccess({ 
        users,
        total: users.length,
        query: search
      }))
      
    } else if (organizationType) {
      // Get users by organization type
      const users = await userService.getUsersByOrganization(organizationType)
      
      logger.info('Users by organization retrieved', {
        requestId,
        organizationType,
        resultsCount: users.length
      })
      
      return NextResponse.json(createSuccess({ 
        users,
        total: users.length,
        organizationType
      }))
      
    } else {
      throw createError.validation('Either email, search query, or organization_type must be provided')
    }
    
  } catch (error) {
    logger.error('User profile/search failed', { 
      requestId, 
      email: email?.substring(0, 3) + '***',
      search: search?.substring(0, 20) + '...'
    }, error)
    throw error
  }
})

// Create or update user profile
export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('User profile creation/update request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp, 10, 60 * 1000)) { // 10 requests per minute
    logger.warn('Rate limit exceeded for user creation', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many user creation requests. Please try again later.')
  }
  
  let body: UserProfileRequest
  try {
    body = await request.json()
  } catch (error) {
    logger.warn('Invalid JSON in request body', { requestId, error })
    throw createError.validation('Invalid request format')
  }
  
  // Validate required fields
  validateRequired(body, ['email'])
  
  const { email, name, organizationName, organizationType, profileData } = body
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError.validation('Invalid email format')
  }
  
  logger.debug('Processing user profile creation/update', {
    requestId,
    email: email.substring(0, 3) + '***',
    hasName: !!name,
    organizationName,
    organizationType,
    hasProfileData: !!profileData
  })
  
  try {
    // Create or update user
    const user = await userService.createOrUpdateUser({
      email,
      name: name || 'Unknown User',
      organizationName,
      organizationType
    })
    
    if (!user) {
      throw createError.internal('Failed to create or update user profile')
    }
    
    // Update profile data if provided
    if (profileData) {
      const updatedUser = await userService.updateUserProfile(email, {
        organizationName,
        organizationType,
        profileData
      })
      
      if (updatedUser) {
        const processingTime = overallTimer.end()
        
        logger.info('User profile updated successfully', {
          requestId,
          userId: updatedUser.id.substring(0, 8) + '...',
          email: email.substring(0, 3) + '***',
          processingTime
        })
        
        return NextResponse.json(createSuccess({
          user: updatedUser,
          processingTime
        }, 'User profile updated successfully'))
      }
    }
    
    const processingTime = overallTimer.end()
    
    logger.info('User profile created successfully', {
      requestId,
      userId: user.id.substring(0, 8) + '...',
      email: email.substring(0, 3) + '***',
      processingTime
    })
    
    return NextResponse.json(createSuccess({
      user,
      processingTime
    }, 'User profile created successfully'))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('User profile creation/update failed', { 
      requestId, 
      processingTime,
      email: email.substring(0, 3) + '***'
    }, error)
    throw error
  }
})

// Update user profile
export const PUT = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('User profile update request received', { 
    requestId,
    ip: requestContext.ip
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp, 15, 60 * 1000)) { // 15 requests per minute
    logger.warn('Rate limit exceeded for user updates', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many user update requests. Please try again later.')
  }
  
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  
  if (!email) {
    throw createError.validation('Email parameter is required')
  }
  
  let body: UserUpdateRequest
  try {
    body = await request.json()
  } catch (error) {
    logger.warn('Invalid JSON in request body', { requestId, error })
    throw createError.validation('Invalid request format')
  }
  
  logger.debug('Processing user profile update', {
    requestId,
    email: email.substring(0, 3) + '***',
    hasOrganizationUpdates: !!(body.organizationName || body.organizationType),
    hasProfileDataUpdates: !!body.profileData
  })
  
  try {
    // Check if user exists
    const existingUser = await userService.getUserProfile(email)
    if (!existingUser) {
      throw createError.notFound('User not found')
    }
    
    // Update user profile
    const updatedUser = await userService.updateUserProfile(email, body)
    
    if (!updatedUser) {
      throw createError.internal('Failed to update user profile')
    }
    
    const processingTime = overallTimer.end()
    
    logger.info('User profile updated successfully', {
      requestId,
      userId: updatedUser.id.substring(0, 8) + '...',
      email: email.substring(0, 3) + '***',
      processingTime
    })
    
    return NextResponse.json(createSuccess({
      user: updatedUser,
      processingTime
    }, 'User profile updated successfully'))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('User profile update failed', { 
      requestId, 
      processingTime,
      email: email.substring(0, 3) + '***'
    }, error)
    throw error
  }
})

// Get user analytics
export const PATCH = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const action = searchParams.get('action')
  
  if (!email) {
    throw createError.validation('Email parameter is required')
  }
  
  logger.info('User analytics/permissions request', { 
    requestId,
    email: email.substring(0, 3) + '***',
    action
  })
  
  try {
    if (action === 'analytics') {
      // Get user analytics data
      const analytics = await userService.getUserAnalyticsData(email)
      
      logger.info('User analytics retrieved', {
        requestId,
        email: email.substring(0, 3) + '***',
        hasData: !!analytics
      })
      
      return NextResponse.json(createSuccess({ analytics }))
      
    } else if (action === 'permissions') {
      // Check user analysis permissions
      const permissions = await userService.canUserMakeAnalysis(email)
      
      logger.info('User permissions checked', {
        requestId,
        email: email.substring(0, 3) + '***',
        canAnalyze: permissions.canAnalyze
      })
      
      return NextResponse.json(createSuccess({ permissions }))
      
    } else if (action === 'record_usage') {
      // Record analysis usage
      await userService.recordAnalysisUsage(email)
      
      logger.info('User analysis usage recorded', {
        requestId,
        email: email.substring(0, 3) + '***'
      })
      
      return NextResponse.json(createSuccess({}, 'Usage recorded successfully'))
      
    } else {
      throw createError.validation('Invalid action. Must be one of: analytics, permissions, record_usage')
    }
    
  } catch (error) {
    logger.error('User analytics/permissions request failed', { 
      requestId,
      email: email.substring(0, 3) + '***',
      action
    }, error)
    throw error
  }
})