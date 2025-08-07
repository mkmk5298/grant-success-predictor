/**
 * AI Advice API Route
 * Generates personalized grant improvement advice
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AIAdviceService } from '@/lib/ai/service';
import { withApiHandler, createSuccess, createError, validateRequired } from '@/lib/api-handler';
import { logger } from '@/lib/logger';

interface AdviceRequest {
  analysisId: string;
  organizationName: string;
  organizationType: 'nonprofit' | 'university' | 'startup' | 'corporation' | 'individual';
  fundingAmount: number;
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  hasPartnership: boolean;
  hasPreviousGrants: boolean;
  successProbability: number;
  adviceType?: 'comprehensive' | 'narrative' | 'budget' | 'strategic';
}

// Initialize AI service
const aiService = new AIAdviceService();

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('AI advice request received', { requestId });
  
  try {
    // Get session (optional - works for guests too)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Parse request body
    const body: AdviceRequest = await request.json();
    
    // Validate required fields
    validateRequired(body, [
      'analysisId',
      'organizationName',
      'organizationType',
      'fundingAmount',
      'experienceLevel',
      'successProbability'
    ]);
    
    // Check rate limits
    const rateLimitOk = await aiService.checkRateLimit(userId);
    if (!rateLimitOk) {
      throw createError.rateLimited('AI advice generation rate limit exceeded. Please try again later.');
    }
    
    // Prepare advice request
    const adviceRequest = {
      analysisId: body.analysisId,
      organizationName: body.organizationName,
      organizationType: body.organizationType,
      fundingAmount: body.fundingAmount,
      experienceLevel: body.experienceLevel,
      hasPartnership: body.hasPartnership || false,
      hasPreviousGrants: body.hasPreviousGrants || false,
      successProbability: body.successProbability,
      userId,
      adviceType: body.adviceType || 'comprehensive'
    };
    
    logger.info('Generating AI advice', {
      requestId,
      analysisId: body.analysisId,
      organizationType: body.organizationType,
      successProbability: body.successProbability,
      adviceType: adviceRequest.adviceType
    });
    
    // Generate advice
    const advice = await aiService.generateAdvice(adviceRequest);
    
    // If success rate is low, generate comprehensive advice
    let additionalAdvice = null;
    if (body.successProbability < 60) {
      try {
        const comprehensiveAdvice = await aiService.generateComprehensiveAdvice(adviceRequest);
        additionalAdvice = {
          narrative: comprehensiveAdvice.narrative?.content,
          budget: comprehensiveAdvice.budget?.content
        };
      } catch (error) {
        logger.warn('Failed to generate additional advice', { error });
        // Continue without additional advice
      }
    }
    
    logger.info('AI advice generated successfully', {
      requestId,
      provider: advice.provider,
      confidence: advice.confidence,
      processingTime: advice.processingTime,
      tokenUsage: advice.tokenUsage
    });
    
    return NextResponse.json(createSuccess({
      advice: {
        id: advice.id,
        provider: advice.provider,
        model: advice.model,
        confidence: advice.confidence,
        processingTime: advice.processingTime,
        ...advice.content
      },
      additionalAdvice,
      metadata: {
        analysisId: body.analysisId,
        generatedAt: advice.createdAt,
        provider: advice.provider,
        model: advice.model
      }
    }, 'AI advice generated successfully'));
    
  } catch (error) {
    logger.error('AI advice generation failed', { requestId }, error);
    
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    // Check if it's an AI provider error
    if (error instanceof Error && error.message.includes('AI provider')) {
      throw createError.internal('AI service is temporarily unavailable. Please try again later.');
    }
    
    throw createError.internal('Failed to generate AI advice');
  }
});

export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('AI service status check', { requestId });
  
  try {
    // Test provider connections
    const connectionStatus = await aiService.testConnections();
    const providersInfo = aiService.getProvidersInfo();
    
    return NextResponse.json(createSuccess({
      status: 'operational',
      providers: providersInfo,
      connections: connectionStatus,
      capabilities: {
        adviceTypes: ['comprehensive', 'narrative', 'budget', 'strategic'],
        supportedOrganizations: ['nonprofit', 'university', 'startup', 'corporation', 'individual'],
        maxTokens: 2000,
        averageResponseTime: '3-5 seconds'
      }
    }, 'AI service status retrieved'));
    
  } catch (error) {
    logger.error('AI service status check failed', { requestId }, error);
    
    return NextResponse.json(createError.internal('Failed to check AI service status'), {
      status: 500
    });
  }
});