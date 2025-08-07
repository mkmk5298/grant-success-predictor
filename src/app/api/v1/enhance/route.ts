import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, checkRateLimit, RATE_LIMITS } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { DocumentEnhancer, EnhancementOptions } from '@/lib/services/document-enhancer'
import { validateRequest } from '@/lib/validation/schemas'
import { z } from 'zod'

// Request validation schema
const enhanceRequestSchema = z.object({
  fileData: z.object({
    name: z.string(),
    content: z.string(),
    type: z.string()
  }),
  enhancementLevel: z.enum(['basic', 'advanced', 'comprehensive']).default('advanced'),
  targetSections: z.array(z.string()).optional(),
  aiProvider: z.enum(['openai', 'anthropic', 'both']).default('both'),
  options: z.object({
    preserveFormatting: z.boolean().default(true),
    generateExecutiveSummary: z.boolean().default(true),
    strengthenImpactStatements: z.boolean().default(true),
    improveBudgetJustification: z.boolean().default(true),
    addDataAndEvidence: z.boolean().default(true)
  }).optional()
})

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const timer = createTimer()
  
  logger.info('Document enhancement request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting - stricter for enhancement endpoint
  const clientIp = requestContext.ip || 'unknown'
  const rateLimitAllowed = await checkRateLimit({
    identifier: `enhance:${clientIp}`,
    limit: 10, // 10 enhancements per hour
    windowMs: 60 * 60 * 1000 // 1 hour
  })
  
  if (!rateLimitAllowed) {
    logger.warn('Rate limit exceeded for document enhancement', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many enhancement requests. Please try again later.')
  }
  
  let body: any
  try {
    const rawBody = await request.json()
    body = validateRequest(enhanceRequestSchema, rawBody)
    
    logger.debug('Enhancement request validated', {
      requestId,
      fileName: body.fileData.name,
      level: body.enhancementLevel,
      provider: body.aiProvider
    })
    
  } catch (error) {
    logger.warn('Enhancement request validation failed', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error) 
    })
    
    if (error instanceof Error && error.message.includes('Validation failed:')) {
      throw createError.validation(error.message)
    }
    
    throw createError.validation('Invalid enhancement request')
  }
  
  try {
    // Decode base64 content
    const documentContent = Buffer.from(body.fileData.content, 'base64').toString('utf-8')
    
    // Create enhancement options
    const enhancementOptions: EnhancementOptions = {
      level: body.enhancementLevel,
      targetSections: body.targetSections,
      aiProvider: body.aiProvider,
      preserveFormatting: body.options?.preserveFormatting ?? true,
      generateExecutiveSummary: body.options?.generateExecutiveSummary ?? true,
      strengthenImpactStatements: body.options?.strengthenImpactStatements ?? true,
      improveBudgetJustification: body.options?.improveBudgetJustification ?? true,
      addDataAndEvidence: body.options?.addDataAndEvidence ?? true
    }
    
    // Create enhancer instance
    const enhancer = new DocumentEnhancer()
    
    // Enhance the document
    const result = await enhancer.enhanceDocument(
      documentContent,
      body.fileData.type,
      enhancementOptions
    )
    
    // Convert enhanced document to base64 for download
    const enhancedBase64 = Buffer.from(result.enhancedDocument).toString('base64')
    
    // Generate download filename
    const originalName = body.fileData.name.replace(/\.[^/.]+$/, '')
    const extension = body.fileData.name.split('.').pop()
    const enhancedFileName = `${originalName}_enhanced.${extension}`
    
    const processingTime = timer.end()
    
    logger.info('Document enhancement completed', {
      requestId,
      fileName: body.fileData.name,
      improvementScore: result.metrics.overallImprovement,
      processingTime,
      sectionsEnhanced: result.sections.length,
      improvementsCount: result.improvements.length
    })
    
    return NextResponse.json(createSuccess({
      enhancedDocument: enhancedBase64,
      fileName: enhancedFileName,
      mimeType: body.fileData.type,
      sections: result.sections,
      improvements: result.improvements,
      metrics: result.metrics,
      processingTime,
      downloadUrl: `/api/v1/enhance/download?file=${enhancedFileName}&data=${enhancedBase64.substring(0, 100)}` // Temporary URL
    }, 'Document enhanced successfully'))
    
  } catch (error) {
    const processingTime = timer.end()
    logger.error('Document enhancement failed', { 
      requestId, 
      processingTime,
      fileName: body.fileData.name
    }, error)
    
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    
    throw createError.internal('Failed to enhance document. Please try again.')
  }
})

// GET endpoint for downloading enhanced documents
export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const url = new URL(request.url)
  const fileName = url.searchParams.get('file')
  const data = url.searchParams.get('data')
  
  if (!fileName || !data) {
    throw createError.validation('Missing file parameters')
  }
  
  logger.info('Enhanced document download request', { 
    requestId,
    fileName
  })
  
  // In production, you would retrieve the full data from storage
  // For now, return a simple response
  return NextResponse.json(createSuccess({
    message: 'Download endpoint - implement file storage for production',
    fileName
  }))
})