/**
 * Enhanced Prediction API with Database Integration
 * Stores and retrieves analysis results from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AnalysisService } from '@/lib/database/services/AnalysisService';
import { UserService } from '@/lib/database/services/UserService';
import { calculateSuccessProbability } from '@/lib/utils';
import { withApiHandler, createSuccess, createError, validateRequired } from '@/lib/api-handler';
import { logger } from '@/lib/logger';

interface PredictionRequest {
  organizationName: string;
  organizationType: 'nonprofit' | 'university' | 'startup' | 'corporation' | 'individual';
  fundingAmount: number;
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  hasPartnership: boolean;
  hasPreviousGrants: boolean;
  fileData?: {
    name: string;
    size: number;
    type: string;
    content?: string;
  };
  sessionId?: string;
}

// Mock grant database for matching
const mockGrantDatabase = [
  {
    id: 'grant-001',
    title: 'Innovation in Sustainability Grant',
    fundingOrganization: 'Green Future Foundation',
    amount: 250000,
    deadline: new Date('2025-03-15'),
    matchPercentage: 94,
    eligibilityCriteria: ['Nonprofit status', 'Environmental focus', 'US-based'],
    requiredDocuments: ['501(c)(3) letter', 'Project proposal', 'Budget'],
    applicationUrl: 'https://greenfuture.org/grants',
    guidelinesUrl: 'https://greenfuture.org/guidelines',
    category: 'Environment',
    tags: ['sustainability', 'innovation', 'green'],
  },
  {
    id: 'grant-002',
    title: 'Community Development Fund',
    fundingOrganization: 'Local Impact Initiative',
    amount: 150000,
    deadline: new Date('2025-02-28'),
    matchPercentage: 88,
    eligibilityCriteria: ['Community organization', 'Local focus', 'Track record'],
    requiredDocuments: ['Organization profile', 'Community impact statement', 'References'],
    applicationUrl: 'https://localimpact.org/apply',
    guidelinesUrl: 'https://localimpact.org/guide',
    category: 'Community',
    tags: ['community', 'development', 'local'],
  },
  {
    id: 'grant-003',
    title: 'Technology Advancement Initiative',
    fundingOrganization: 'Tech for Good',
    amount: 500000,
    deadline: new Date('2025-04-30'),
    matchPercentage: 82,
    eligibilityCriteria: ['Tech focus', 'Innovation', 'Scalability'],
    requiredDocuments: ['Technical proposal', 'Team bios', 'Prototype demo'],
    applicationUrl: 'https://techforgood.org/grants',
    guidelinesUrl: 'https://techforgood.org/resources',
    category: 'Technology',
    tags: ['technology', 'innovation', 'digital'],
  },
];

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('Enhanced prediction request received', { requestId });
  
  try {
    // Get session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    
    // Parse request body
    const body: PredictionRequest = await request.json();
    
    // Validate required fields
    validateRequired(body, [
      'organizationName',
      'organizationType',
      'fundingAmount',
      'experienceLevel'
    ]);
    
    // Check upload limits for users
    if (userId) {
      const uploadCheck = await UserService.trackUpload(userId);
      
      if (!uploadCheck.allowed) {
        logger.warn('Upload limit exceeded', { userId, requestId });
        throw createError.rateLimited('Monthly upload limit reached. Please upgrade to continue.');
      }
    }
    
    // Calculate success probability
    const startTime = Date.now();
    const successProbability = calculateSuccessProbability({
      organizationType: body.organizationType,
      fundingAmount: body.fundingAmount,
      experienceLevel: body.experienceLevel,
      hasPartnership: body.hasPartnership,
      hasPreviousGrants: body.hasPreviousGrants,
    });
    
    // Generate recommendations based on analysis
    const recommendations = generateRecommendations(body, successProbability);
    
    // Match with grants
    const matchingGrants = findMatchingGrants(body);
    
    const processingTime = Date.now() - startTime;
    
    // Store analysis in database
    const analysis = await AnalysisService.createAnalysis({
      userId,
      sessionId: body.sessionId || requestContext.ip || 'anonymous',
      organizationName: body.organizationName,
      organizationType: body.organizationType,
      fundingAmount: body.fundingAmount,
      experienceLevel: body.experienceLevel,
      hasPartnership: body.hasPartnership,
      hasPreviousGrants: body.hasPreviousGrants,
      fileName: body.fileData?.name || null,
      fileSize: body.fileData?.size || null,
      fileType: body.fileData?.type || null,
      successProbability,
      recommendations,
      matchingGrants: matchingGrants.map(grant => ({
        id: crypto.randomUUID(),
        ...grant,
        analysisId: '', // Will be set by service
        createdAt: new Date(),
      })),
      aiModel: 'gpt-4-analysis',
      processingTime,
      tokenUsage: Math.floor(Math.random() * 1000) + 500, // Mock token usage
    });
    
    logger.info('Analysis completed and stored', {
      requestId,
      analysisId: analysis.id,
      userId: userId || undefined,
      successProbability,
      processingTime,
    });
    
    return NextResponse.json(createSuccess({
      analysisId: analysis.id,
      prediction: {
        successProbability,
        recommendations,
        matchingGrants,
        confidence: calculateConfidence(body),
        factors: {
          positive: getPositiveFactors(body),
          negative: getNegativeFactors(body),
          neutral: getNeutralFactors(body),
        },
      },
      metadata: {
        processingTime,
        aiModel: 'gpt-4-analysis',
        timestamp: new Date().toISOString(),
      },
      limits: userId ? {
        remaining: (await UserService.findById(userId))?.uploadsLimit! - 
                  (await UserService.findById(userId))?.uploadsUsed! || 0,
        resetDate: getMonthlyResetDate(),
      } : null,
    }, 'Prediction completed successfully'));
    
  } catch (error) {
    logger.error('Enhanced prediction failed', { requestId }, error);
    
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    throw createError.internal('Failed to generate prediction');
  }
});

// Helper functions
function generateRecommendations(data: PredictionRequest, successRate: number): string[] {
  const recommendations: string[] = [];
  
  if (successRate < 50) {
    recommendations.push('Consider partnering with established organizations to strengthen your application');
    recommendations.push('Focus on building a track record with smaller grants before applying for larger amounts');
  }
  
  if (!data.hasPartnership) {
    recommendations.push('Form strategic partnerships to demonstrate collaboration and broader impact');
  }
  
  if (!data.hasPreviousGrants && data.experienceLevel === 'beginner') {
    recommendations.push('Start with foundation grants that specifically support first-time applicants');
    recommendations.push('Consider hiring a grant writing consultant for your first applications');
  }
  
  if (data.fundingAmount > 500000) {
    recommendations.push('Break down your project into phases to request smaller, manageable amounts');
    recommendations.push('Prepare detailed financial projections and audit reports');
  }
  
  recommendations.push('Develop clear, measurable outcomes and impact metrics for your project');
  recommendations.push('Gather strong letters of support from community leaders and beneficiaries');
  
  return recommendations.slice(0, 5); // Return top 5 recommendations
}

function findMatchingGrants(data: PredictionRequest) {
  return mockGrantDatabase
    .filter(grant => {
      // Filter by amount range
      const amountMatch = grant.amount >= data.fundingAmount * 0.8 && 
                          grant.amount <= data.fundingAmount * 1.5;
      
      // Filter by organization type compatibility
      const typeMatch = true; // Simplified - all grants available to all types
      
      return amountMatch && typeMatch;
    })
    .map(grant => ({
      grantId: grant.id,
      title: grant.title,
      fundingOrganization: grant.fundingOrganization,
      amount: grant.amount,
      deadline: grant.deadline,
      matchPercentage: calculateMatchPercentage(data, grant),
      eligibilityCriteria: grant.eligibilityCriteria,
      requiredDocuments: grant.requiredDocuments,
      applicationUrl: grant.applicationUrl,
      guidelinesUrl: grant.guidelinesUrl,
      category: grant.category,
      tags: grant.tags,
    }))
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 3); // Return top 3 matches
}

function calculateMatchPercentage(data: PredictionRequest, grant: any): number {
  let score = 70; // Base score
  
  // Adjust based on funding amount alignment
  const amountDiff = Math.abs(grant.amount - data.fundingAmount) / grant.amount;
  score += (1 - amountDiff) * 10;
  
  // Bonus for experience
  if (data.experienceLevel === 'expert') score += 10;
  else if (data.experienceLevel === 'intermediate') score += 5;
  
  // Bonus for partnerships and previous grants
  if (data.hasPartnership) score += 5;
  if (data.hasPreviousGrants) score += 5;
  
  return Math.min(Math.round(score), 100);
}

function calculateConfidence(data: PredictionRequest): number {
  let confidence = 70; // Base confidence
  
  // Increase confidence with more data points
  if (data.hasPartnership !== undefined) confidence += 5;
  if (data.hasPreviousGrants !== undefined) confidence += 5;
  if (data.fileData) confidence += 10;
  if (data.experienceLevel === 'expert') confidence += 10;
  
  return Math.min(confidence, 95);
}

function getPositiveFactors(data: PredictionRequest): string[] {
  const factors: string[] = [];
  
  if (data.hasPartnership) {
    factors.push('Strategic partnerships strengthen application');
  }
  
  if (data.hasPreviousGrants) {
    factors.push('Previous grant success demonstrates capability');
  }
  
  if (data.experienceLevel === 'expert') {
    factors.push('Extensive grant experience increases success rate');
  }
  
  if (data.organizationType === 'nonprofit') {
    factors.push('Nonprofit status opens more funding opportunities');
  }
  
  if (data.fundingAmount <= 100000) {
    factors.push('Moderate funding request improves approval chances');
  }
  
  return factors;
}

function getNegativeFactors(data: PredictionRequest): string[] {
  const factors: string[] = [];
  
  if (!data.hasPartnership) {
    factors.push('Lack of partnerships may weaken application');
  }
  
  if (!data.hasPreviousGrants && data.experienceLevel === 'beginner') {
    factors.push('Limited grant history poses challenges');
  }
  
  if (data.fundingAmount > 500000) {
    factors.push('Large funding request requires exceptional justification');
  }
  
  if (data.organizationType === 'individual') {
    factors.push('Individual applicants have fewer funding options');
  }
  
  return factors;
}

function getNeutralFactors(data: PredictionRequest): string[] {
  return [
    `Organization type: ${data.organizationType}`,
    `Funding amount: $${data.fundingAmount.toLocaleString()}`,
    `Experience level: ${data.experienceLevel}`,
  ];
}

function getMonthlyResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

// GET endpoint for retrieving analysis history
export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  logger.info('Fetching analysis history', { requestId });
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw createError.unauthorized('Authentication required to view analysis history');
    }
    
    const userId = session.user.id;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Fetch user's analyses
    const analyses = await AnalysisService.findByUserId(userId, limit, offset);
    
    // Get user stats
    const user = await UserService.findById(userId);
    
    logger.info('Analysis history retrieved', {
      requestId,
      userId,
      count: analyses.length,
    });
    
    return NextResponse.json(createSuccess({
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        organizationName: analysis.organizationName,
        successProbability: analysis.successProbability,
        fundingAmount: analysis.fundingAmount,
        createdAt: analysis.createdAt,
        matchingGrants: analysis.matchingGrants.length,
      })),
      pagination: {
        limit,
        offset,
        hasMore: analyses.length === limit,
      },
      usage: {
        used: user?.uploadsUsed || 0,
        limit: user?.uploadsLimit || 2,
        remaining: Math.max(0, (user?.uploadsLimit || 2) - (user?.uploadsUsed || 0)),
      },
    }, 'Analysis history retrieved successfully'));
    
  } catch (error) {
    logger.error('Failed to retrieve analysis history', { requestId }, error);
    
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    throw createError.internal('Failed to retrieve analysis history');
  }
});