import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, validateRequired, checkRateLimit, RATE_LIMITS } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { EnhancedPredictionService } from '@/lib/services/enhanced-prediction-service'
import { DocumentProcessor } from '@/lib/services/document-processor'
import { validateRequest, predictionRequestSchema } from '@/lib/validation/schemas'

interface PredictionRequest {
  organizationName: string
  organizationType: string
  fundingAmount: number
  experienceLevel: string
  hasPartnership: boolean
  hasPreviousGrants: boolean
  userId?: string
  sessionToken?: string
  // Enhanced fields from file upload
  fileData?: {
    name: string
    content: string
    type: string
    size: number
  }
  application?: {
    projectTitle?: string
    projectSummary?: string
    proposalText?: string
  }
  userEmail?: string
  userName?: string
}

interface PredictionResponse {
  successProbability: number
  confidence: 'high' | 'medium' | 'low'
  aiEnhanced: boolean
  factors: {
    organizationType: string
    experienceLevel: string
    fundingAmount: number
    hasPartnership: boolean
    hasPreviousGrants: boolean
  }
  recommendations: string[]
  matchingGrants?: Array<{
    id: string
    title: string
    amount: number
    deadline: string
    agency: string
    matchScore: number
  }>
  processingTime: number
  timestamp: string
}

const ORGANIZATION_TYPES = ['nonprofit', 'university', 'startup', 'corporation', 'individual'] as const
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'expert'] as const

async function getOpenAIPrediction(data: PredictionRequest, requestId: string): Promise<any | null> {
  const timer = createTimer()
  const openaiKey = process.env.OPENAI_API_KEY
  
  logger.debug('Starting OpenAI prediction request', { 
    requestId, 
    hasApiKey: !!openaiKey,
    organization: data.organizationName,
    fundingAmount: data.fundingAmount
  })
  
  if (!openaiKey) {
    logger.warn('OpenAI API key not configured', { requestId })
    return null
  }

  try {
    const prompt = `As a grant expert, analyze this organization profile and predict their grant success probability:

Organization: ${data.organizationName}
Type: ${data.organizationType}
Funding Amount: $${data.fundingAmount.toLocaleString()}
Experience: ${data.experienceLevel}
Has Partnerships: ${data.hasPartnership ? 'Yes' : 'No'}
Previous Grants: ${data.hasPreviousGrants ? 'Yes' : 'No'}

Provide a realistic success probability (25-95%) and 4 specific, actionable recommendations in JSON format:
{
  "successProbability": number,
  "confidence": "high|medium|low",
  "recommendations": [string, string, string, string],
  "reasoning": "brief explanation of the score"
}`

    logger.externalApiCall('OpenAI', '/v1/chat/completions', 'POST', { 
      requestId, 
      model: 'gpt-4o-mini',
      promptLength: prompt.length 
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert grant consultant with 20+ years of experience helping organizations secure funding. Provide realistic, data-driven predictions.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" }
      })
    })

    const duration = timer.end()

    if (!response.ok) {
      logger.externalApiError('OpenAI', '/v1/chat/completions', new Error(`HTTP ${response.status}: ${response.statusText}`), {
        requestId,
        status: response.status,
        duration
      })
      return null
    }

    const result = await response.json()
    
    logger.info('OpenAI API call successful', {
      requestId,
      duration,
      tokensUsed: result.usage?.total_tokens,
      model: result.model
    })
    
    if (result.choices?.[0]?.message?.content) {
      try {
        const prediction = JSON.parse(result.choices[0].message.content)
        
        // Validate prediction structure
        if (typeof prediction.successProbability !== 'number' || 
            !Array.isArray(prediction.recommendations) ||
            prediction.recommendations.length !== 4) {
          throw new Error('Invalid prediction structure from OpenAI')
        }
        
        logger.debug('OpenAI prediction parsed successfully', {
          requestId,
          successProbability: prediction.successProbability,
          confidence: prediction.confidence
        })
        
        return prediction
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response', { 
          requestId, 
          content: result.choices[0].message.content 
        }, parseError)
        return null
      }
    }
    
    logger.warn('OpenAI response missing expected content', { 
      requestId, 
      response: result 
    })
    return null
    
  } catch (error) {
    const duration = timer.end()
    logger.externalApiError('OpenAI', '/v1/chat/completions', error, {
      requestId,
      duration
    })
    return null
  }
}

function calculateFallbackProbability(data: PredictionRequest): { probability: number, confidence: 'medium' | 'low' } {
  let probability = 65 // Base probability
  
  logger.debug('Calculating fallback probability', {
    organization: data.organizationName,
    type: data.organizationType,
    amount: data.fundingAmount
  })
  
  // Adjust based on organization type
  switch (data.organizationType) {
    case 'university':
      probability += 10
      break
    case 'nonprofit':
      probability += 8
      break
    case 'startup':
      probability += 5
      break
    case 'corporation':
      probability += 3
      break
    case 'individual':
      probability -= 5
      break
  }
  
  // Adjust based on experience
  switch (data.experienceLevel) {
    case 'expert':
      probability += 15
      break
    case 'intermediate':
      probability += 8
      break
    case 'beginner':
      probability -= 5
      break
  }
  
  // Adjust based on other factors
  if (data.hasPartnership) probability += 7
  if (data.hasPreviousGrants) probability += 12
  
  // Adjust based on funding amount (smaller amounts = higher success rate)
  if (data.fundingAmount < 50000) probability += 10
  else if (data.fundingAmount < 200000) probability += 5
  else if (data.fundingAmount > 500000) probability -= 8
  else if (data.fundingAmount > 1000000) probability -= 15
  
  // Cap at realistic ranges
  const finalProbability = Math.min(Math.max(probability, 25), 95)
  const confidence = finalProbability > 70 ? 'medium' : 'low'
  
  logger.debug('Fallback probability calculated', {
    finalProbability,
    confidence,
    adjustments: {
      organizationType: data.organizationType,
      experienceLevel: data.experienceLevel,
      hasPartnership: data.hasPartnership,
      hasPreviousGrants: data.hasPreviousGrants
    }
  })
  
  return { probability: finalProbability, confidence }
}

async function storePrediction(data: PredictionRequest, prediction: PredictionResponse, requestId: string): Promise<void> {
  logger.debug('Storing prediction in database', { 
    requestId,
    organization: data.organizationName,
    successProbability: prediction.successProbability
  })
  
  try {
    // In production, implement database storage
    /*
    const db = await getDatabase()
    await db.query(`
      INSERT INTO predictions (
        organization_name, organization_type, funding_amount, 
        experience_level, has_partnership, has_previous_grants,
        success_probability, confidence, ai_enhanced, recommendations,
        request_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [
      data.organizationName, data.organizationType, data.fundingAmount,
      data.experienceLevel, data.hasPartnership, data.hasPreviousGrants,
      prediction.successProbability, prediction.confidence, prediction.aiEnhanced,
      JSON.stringify(prediction.recommendations), requestId
    ])
    */
    
    // Mock database storage
    logger.info('Prediction stored successfully (mock)', {
      requestId,
      organization: data.organizationName,
      successProbability: prediction.successProbability,
      type: 'mock_db_storage'
    })
    
  } catch (error) {
    logger.dbError('INSERT prediction', error, { 
      requestId,
      organization: data.organizationName 
    })
    // Don't throw - storage failure shouldn't break the prediction
  }
}

function getMockMatchingGrants(data: PredictionRequest): Array<{ id: string, title: string, amount: number, deadline: string, agency: string, matchScore: number }> {
  const grants = [
    {
      id: 'grant-001',
      title: 'Innovation in Sustainability Grant',
      amount: 250000,
      deadline: '2025-03-15',
      agency: 'EPA',
      matchScore: 94
    },
    {
      id: 'grant-002',
      title: 'Community Development Fund',
      amount: 150000,
      deadline: '2025-02-28',
      agency: 'HUD',
      matchScore: 88
    },
    {
      id: 'grant-003',
      title: 'Technology Advancement Initiative',
      amount: 500000,
      deadline: '2025-04-30',
      agency: 'NSF',
      matchScore: 82
    }
  ]
  
  // Adjust match scores based on organization type and funding amount
  return grants.map(grant => ({
    ...grant,
    matchScore: Math.min(95, grant.matchScore + 
      (data.organizationType === 'university' ? 5 : 0) +
      (Math.abs(grant.amount - data.fundingAmount) < 100000 ? 8 : -3)
    )
  })).sort((a, b) => b.matchScore - a.matchScore)
}

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('Enhanced grant prediction request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting - stricter limits for prediction endpoint
  const clientIp = requestContext.ip || 'unknown'
  const rateLimitAllowed = await checkRateLimit({
    identifier: `predictions:${clientIp}`,
    limit: RATE_LIMITS.UPLOAD.limit, // 5 requests per minute
    windowMs: RATE_LIMITS.UPLOAD.windowMs
  })
  
  if (!rateLimitAllowed) {
    logger.warn('Rate limit exceeded for predictions', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many prediction requests. Please try again later.')
  }
  
  let body: PredictionRequest
  try {
    const rawBody = await request.json()
    
    // Comprehensive validation using Zod schema
    const validatedBody = validateRequest(predictionRequestSchema, rawBody)
    
    // Ensure fundingAmount has a value (schema provides default if missing)
    body = {
      ...validatedBody,
      fundingAmount: validatedBody.fundingAmount || 100000
    } as PredictionRequest
    
    logger.debug('Request validation passed', {
      requestId,
      organizationName: body.organizationName,
      organizationType: body.organizationType,
      hasFileData: !!body.fileData
    })
    
  } catch (error) {
    logger.warn('Request validation failed', { requestId, error: error instanceof Error ? error.message : String(error) })
    
    if (error instanceof Error && error.message.includes('Validation failed:')) {
      throw createError.validation(error.message)
    }
    
    throw createError.validation('Invalid request format')
  }
  
  const {
    organizationName,
    organizationType,
    fundingAmount,
    experienceLevel,
    hasPartnership,
    hasPreviousGrants,
    userId,
    sessionToken,
    fileData,
    application,
    userEmail,
    userName
  } = body
  
  logger.debug('Processing enhanced prediction request', {
    requestId,
    organizationName,
    organizationType,
    fundingAmount,
    experienceLevel,
    hasPartnership,
    hasPreviousGrants,
    hasFile: !!fileData,
    hasApplication: !!application,
    userId: userId?.substring(0, 8) + '...' || 'anonymous',
    userEmail: userEmail?.substring(0, 3) + '***' || 'anonymous'
  })
  
  try {
    // Process uploaded document if present
    let processedDocument = null
    if (fileData) {
      logger.info('Processing uploaded document', { 
        requestId,
        fileName: fileData.name,
        fileSize: fileData.size
      })
      
      const documentProcessor = new DocumentProcessor()
      processedDocument = await documentProcessor.processDocument(fileData)
      
      logger.info('Document processing completed', {
        requestId,
        fileName: processedDocument.fileName,
        wordCount: processedDocument.metadata.wordCount,
        hasExecutiveSummary: processedDocument.metadata.hasExecutiveSummary,
        processingTime: processedDocument.processingTime
      })
    }

    // Use enhanced prediction service
    const enhancedService = new EnhancedPredictionService()
    
    const enhancedPrediction = await enhancedService.generatePrediction({
      organizationName,
      organizationType,
      fundingAmount,
      experienceLevel,
      hasPartnership,
      hasPreviousGrants,
      fileData,
      application: application || (processedDocument ? {
        projectTitle: organizationName + ' Grant Application',
        projectSummary: processedDocument.extractedText.substring(0, 1000),
        proposalText: processedDocument.extractedText
      } : undefined),
      userEmail,
      userName
    })
    
    const processingTime = overallTimer.end()
    
    // Convert to legacy format for backwards compatibility while providing enhanced data
    const legacyCompatibleResponse: PredictionResponse & any = {
      successProbability: enhancedPrediction.successProbability,
      confidence: enhancedPrediction.confidence,
      aiEnhanced: enhancedPrediction.aiEnhanced,
      factors: {
        organizationType,
        experienceLevel,
        fundingAmount,
        hasPartnership,
        hasPreviousGrants
      },
      recommendations: enhancedPrediction.recommendedActions,
      matchingGrants: enhancedPrediction.matchingGrants,
      processingTime,
      timestamp: enhancedPrediction.timestamp,
      
      // Enhanced data
      enhanced: {
        predictionId: enhancedPrediction.predictionId,
        matchScore: enhancedPrediction.matchScore,
        scoringBreakdown: enhancedPrediction.scoringBreakdown,
        positiveFactors: enhancedPrediction.positiveFactors,
        negativeFactors: enhancedPrediction.negativeFactors,
        improvementSuggestions: enhancedPrediction.improvementSuggestions,
        similarWinners: enhancedPrediction.similarWinners,
        aiReasoning: enhancedPrediction.aiReasoning,
        keyInsights: enhancedPrediction.keyInsights,
        modelVersion: enhancedPrediction.modelVersion
      },
      
      // Document analysis results if file was uploaded
      documentAnalysis: processedDocument ? {
        fileName: processedDocument.fileName,
        fileSize: processedDocument.fileSize,
        wordCount: processedDocument.metadata.wordCount,
        hasExecutiveSummary: processedDocument.metadata.hasExecutiveSummary,
        hasBudget: processedDocument.metadata.hasBudget,
        hasTimeline: processedDocument.metadata.hasTimeline,
        keywordsExtracted: processedDocument.metadata.keywordsExtracted,
        proposalStructure: processedDocument.metadata.proposalStructure,
        completenessScore: new DocumentProcessor().generateAnalysisSummary(processedDocument).completenessScore,
        processingTime: processedDocument.processingTime
      } : undefined
    }
    
    logger.info('Enhanced prediction completed successfully', {
      requestId,
      predictionId: enhancedPrediction.predictionId,
      successProbability: enhancedPrediction.successProbability,
      confidence: enhancedPrediction.confidence,
      matchScore: enhancedPrediction.matchScore,
      aiEnhanced: enhancedPrediction.aiEnhanced,
      processingTime: enhancedPrediction.processingTime,
      modelVersion: enhancedPrediction.modelVersion
    })
    
    return NextResponse.json(createSuccess(legacyCompatibleResponse, 'Enhanced prediction generated successfully'))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('Enhanced prediction processing failed', { 
      requestId, 
      processingTime,
      organizationName,
      hasFile: !!fileData
    }, error)
    
    // Fallback to original prediction logic if enhanced service fails
    try {
      const fallback = calculateFallbackProbability(body)
      
      const fallbackResponse: PredictionResponse = {
        successProbability: fallback.probability,
        confidence: fallback.confidence,
        aiEnhanced: false,
        factors: {
          organizationType,
          experienceLevel,
          fundingAmount,
          hasPartnership,
          hasPreviousGrants
        },
        recommendations: [
          'Strengthen project narrative with specific impact metrics',
          'Build strategic partnerships in your field',
          'Prepare detailed budget justification documents',
          'Gather letters of support from key stakeholders'
        ],
        matchingGrants: getMockMatchingGrants(body),
        processingTime,
        timestamp: new Date().toISOString()
      }
      
      logger.info('Fallback prediction completed after enhanced service failure', {
        requestId,
        successProbability: fallbackResponse.successProbability,
        confidence: fallbackResponse.confidence,
        processingTime
      })
      
      return NextResponse.json(createSuccess(fallbackResponse, 'Prediction generated using fallback method'))
      
    } catch (fallbackError) {
      logger.error('Fallback prediction also failed', { requestId }, fallbackError)
      throw error // Throw original error
    }
  }
})

export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('API info request', { requestId, method: 'GET' })
  
  return NextResponse.json(createSuccess({
    message: 'Grant Predictor AI Prediction API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    features: {
      aiEnhanced: !!process.env.OPENAI_API_KEY,
      rateLimit: '20 requests/minute',
      supportedOrganizationTypes: ORGANIZATION_TYPES,
      supportedExperienceLevels: EXPERIENCE_LEVELS
    },
    endpoints: {
      'POST /api/v1/predictions': 'Generate grant success predictions',
      'POST /api/v1/auth/google': 'Google OAuth authentication',
      'POST /api/v1/payments/create-subscription': 'Create Stripe subscription',
      'GET /api/v1/grants': 'Search grant database'
    }
  }))
})