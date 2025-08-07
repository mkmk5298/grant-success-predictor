import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, validateRequired, checkRateLimit } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { EnhancedPredictionService } from '@/lib/services/enhanced-prediction-service'
import { UserService } from '@/lib/services/user-service'
import { connectToDatabase } from '@/lib/database'

interface ApplicationCreateRequest {
  userEmail?: string
  organizationName: string
  grantId?: string
  proposalFileName?: string
  proposalText?: string
  fileData?: {
    name: string
    content: string // base64
    type: string
    size: number
  }
  requestedAmount: number
  projectTitle: string
  projectSummary?: string
}

interface ApplicationUpdateRequest {
  proposalText?: string
  requestedAmount?: number
  projectTitle?: string
  projectSummary?: string
}

// Create new application
export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('Application creation request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp)) { // Uses default rate limiting settings
    logger.warn('Rate limit exceeded for application creation', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many application requests. Please try again later.')
  }
  
  let body: ApplicationCreateRequest
  try {
    body = await request.json()
  } catch (error) {
    logger.warn('Invalid JSON in request body', { requestId, error })
    throw createError.validation('Invalid request format')
  }
  
  // Validate required fields
  validateRequired(body, ['organizationName', 'requestedAmount', 'projectTitle'])
  
  const {
    userEmail,
    organizationName,
    grantId,
    proposalFileName,
    proposalText,
    fileData,
    requestedAmount,
    projectTitle,
    projectSummary
  } = body
  
  // Validate funding amount
  if (requestedAmount < 1000 || requestedAmount > 10000000) {
    throw createError.validation('Requested amount must be between $1,000 and $10,000,000')
  }
  
  logger.debug('Processing application creation', {
    requestId,
    organizationName,
    projectTitle,
    requestedAmount,
    hasFile: !!fileData,
    userEmail: userEmail?.substring(0, 3) + '***' || 'anonymous'
  })
  
  try {
    // Create application record in database
    const database = await connectToDatabase()
    let applicationId = null
    
    if (database) {
      try {
        const result = await database.query(`
          INSERT INTO applications (
            user_email, organization_name, grant_id, 
            proposal_file_name, proposal_text, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [
          userEmail || null,
          organizationName,
          grantId || null,
          proposalFileName || fileData?.name,
          proposalText || projectSummary
        ])
        
        applicationId = result.rows[0]?.id
        
        logger.info('Application record created in database', {
          requestId,
          applicationId,
          organizationName
        })
      } catch (dbError) {
        logger.error('Database insert failed, continuing with in-memory processing', {
          requestId,
          organizationName
        }, dbError)
      }
    }
    
    // Generate enhanced prediction using the prediction service
    const predictionService = new EnhancedPredictionService()
    const prediction = await predictionService.generatePrediction({
      userEmail,
      organizationName,
      organizationType: 'nonprofit', // Default, should be provided in a full implementation
      fundingAmount: requestedAmount,
      experienceLevel: 'intermediate', // Default, should be provided
      hasPartnership: false, // Default, should be provided
      hasPreviousGrants: false, // Default, should be provided
      fileData,
      application: {
        projectTitle,
        projectSummary
      }
    })
    
    const processingTime = overallTimer.end()
    
    // Prepare response
    const response = {
      applicationId: applicationId || `temp_${Math.random().toString(36).substr(2, 9)}`,
      organizationName,
      projectTitle,
      projectSummary,
      requestedAmount,
      prediction: {
        successProbability: prediction.successProbability,
        confidence: prediction.confidence,
        matchScore: prediction.matchScore,
        aiEnhanced: prediction.aiEnhanced,
        recommendations: prediction.recommendedActions,
        keyInsights: prediction.keyInsights
      },
      processingTime,
      timestamp: new Date().toISOString()
    }
    
    logger.info('Application created successfully', {
      requestId,
      applicationId,
      organizationName,
      successProbability: prediction.successProbability,
      processingTime
    })
    
    return NextResponse.json(createSuccess(response, 'Application created and analyzed successfully'))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('Application creation failed', { 
      requestId, 
      processingTime,
      organizationName,
      projectTitle
    }, error)
    throw error
  }
})

// Get application by ID
export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const { searchParams } = new URL(request.url)
  const applicationId = searchParams.get('id')
  const userEmail = searchParams.get('user_email')
  
  logger.info('Application retrieval request', { 
    requestId,
    applicationId: applicationId?.substring(0, 8) + '...',
    userEmail: userEmail?.substring(0, 3) + '***'
  })
  
  if (!applicationId && !userEmail) {
    throw createError.validation('Either application ID or user email must be provided')
  }
  
  try {
    const database = await connectToDatabase()
    
    if (!database) {
      // Return mock data if no database
      return NextResponse.json(createSuccess({
        applications: [],
        message: 'Database not configured - no applications available'
      }))
    }
    
    let query: string
    let params: any[]
    
    if (applicationId) {
      query = 'SELECT * FROM applications WHERE id = $1'
      params = [applicationId]
    } else {
      query = 'SELECT * FROM applications WHERE user_email = $1 ORDER BY created_at DESC'
      params = [userEmail]
    }
    
    const result = await database.query(query, params)
    
    const applications = result.rows.map(row => ({
      id: row.id,
      userEmail: row.user_email,
      organizationName: row.organization_name,
      grantId: row.grant_id,
      proposalFileName: row.proposal_file_name,
      proposalText: row.proposal_text,
      successProbability: row.success_probability,
      matchScore: row.match_score,
      strengths: row.strengths ? row.strengths.split(',') : [],
      weaknesses: row.weaknesses ? row.weaknesses.split(',') : [],
      recommendations: row.recommendations ? row.recommendations.split(',') : [],
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at
    }))
    
    logger.info('Applications retrieved successfully', {
      requestId,
      count: applications.length,
      applicationId: applicationId?.substring(0, 8) + '...',
      userEmail: userEmail?.substring(0, 3) + '***'
    })
    
    if (applicationId) {
      return NextResponse.json(createSuccess({
        application: applications[0] || null
      }))
    } else {
      return NextResponse.json(createSuccess({
        applications,
        total: applications.length
      }))
    }
    
  } catch (error) {
    logger.error('Application retrieval failed', { 
      requestId, 
      applicationId,
      userEmail: userEmail?.substring(0, 3) + '***'
    }, error)
    throw error
  }
})