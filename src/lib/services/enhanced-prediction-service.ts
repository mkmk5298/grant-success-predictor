/**
 * Enhanced Prediction Service for Grant Predictor
 * Combines AI analysis with database operations and user management
 */

import { EnhancedAIService } from './enhanced-ai-service'
import { storePrediction, createUser, getUserByEmail } from '@/lib/database'
import { logger } from '@/lib/logger'

interface PredictionRequest {
  // User information
  userEmail?: string
  userName?: string
  
  // Organization details
  organizationName: string
  organizationType: string
  organizationData?: {
    mission?: string
    focusAreas?: string[]
    annualBudget?: number
    staffSize?: number
    yearsOperating?: number
    previousGrants?: string[]
    geographicScope?: string[]
  }
  
  // Grant application details
  fundingAmount: number
  experienceLevel: string
  hasPartnership: boolean
  hasPreviousGrants: boolean
  
  // Optional file data
  fileData?: {
    name: string
    content: string // base64
    type: string
    size: number
  }
  
  // Application details if available
  application?: {
    projectTitle?: string
    projectSummary?: string
    proposalText?: string
  }
}

interface EnhancedPredictionResponse {
  // Basic prediction
  successProbability: number
  confidence: 'high' | 'medium' | 'low'
  aiEnhanced: boolean
  
  // Detailed analysis
  matchScore: number
  scoringBreakdown: {
    organizationFit: number
    projectAlignment: number
    budgetAppropriateness: number
    geographicMatch: number
    pastSuccessCorrelation: number
    competitionLevel: number
    applicationQuality: number
  }
  
  // Factors and recommendations
  positiveFactors: Array<{
    factor: string
    weight: number
    score: number
  }>
  negativeFactors: Array<{
    factor: string
    weight: number
    impact: number
  }>
  recommendedActions: string[]
  improvementSuggestions: Array<{
    area: string
    suggestion: string
    potentialImpact: number
    priority: 'high' | 'medium' | 'low'
  }>
  
  // Similar grants and organizations
  matchingGrants: Array<{
    id: string
    title: string
    agency: string
    amount: number
    deadline: string
    matchScore: number
  }>
  similarWinners: Array<{
    organization: string
    similarityScore: number
    keySimilarities: string[]
    successFactors: string[]
  }>
  
  // AI insights
  aiReasoning: string
  keyInsights: string[]
  
  // Metadata
  predictionId?: string
  processingTime: number
  timestamp: string
  modelVersion: string
}

export class EnhancedPredictionService {
  private aiService: EnhancedAIService

  constructor() {
    this.aiService = new EnhancedAIService()
  }

  async generatePrediction(request: PredictionRequest): Promise<EnhancedPredictionResponse> {
    const startTime = Date.now()
    
    logger.info('Starting enhanced prediction generation', {
      organizationName: request.organizationName,
      organizationType: request.organizationType,
      fundingAmount: request.fundingAmount,
      hasFile: !!request.fileData,
      userEmail: request.userEmail
    })

    try {
      // 1. Process user and organization data
      const user = await this.processUserData(request)
      
      // 2. Extract application details from file if provided
      const application = await this.processFileData(request)
      
      // 3. Generate mock grant for analysis
      const mockGrant = this.createMockGrant(request)
      
      // 4. Get AI prediction
      const aiPrediction = await this.aiService.predictApplicationSuccess(
        user, 
        mockGrant, 
        application
      )
      
      // 5. Get grant matching analysis
      const matchAnalysis = await this.aiService.analyzeGrantMatch(user, mockGrant)
      
      // 6. Generate additional insights
      const additionalInsights = await this.generateAdditionalInsights(request, aiPrediction)
      
      // 7. Create comprehensive response
      const response = this.buildPredictionResponse(
        aiPrediction,
        matchAnalysis,
        additionalInsights,
        request,
        Date.now() - startTime
      )
      
      // 8. Store prediction in database
      await this.storePredictionRecord(request, response, user.id)
      
      logger.info('Enhanced prediction completed', {
        predictionId: response.predictionId,
        successProbability: response.successProbability,
        processingTime: response.processingTime,
        aiEnhanced: response.aiEnhanced
      })
      
      return response
      
    } catch (error) {
      logger.error('Enhanced prediction failed', {
        organizationName: request.organizationName,
        processingTime: Date.now() - startTime
      }, error)
      
      // Return fallback prediction
      return this.generateFallbackPrediction(request, Date.now() - startTime)
    }
  }

  private async processUserData(request: PredictionRequest): Promise<any> {
    const userData = {
      id: 'temp_' + Math.random().toString(36).substr(2, 9),
      email: request.userEmail || 'anonymous@example.com',
      name: request.userName || 'Anonymous User',
      organizationName: request.organizationName,
      organizationType: request.organizationType,
      profileData: {
        mission: request.organizationData?.mission,
        focusAreas: request.organizationData?.focusAreas || [],
        annualBudget: request.organizationData?.annualBudget,
        staffSize: request.organizationData?.staffSize,
        yearsOperating: request.organizationData?.yearsOperating,
        previousGrants: request.organizationData?.previousGrants || [],
        geographicScope: request.organizationData?.geographicScope || ['national']
      }
    }

    // If user email provided, try to create/update user record
    if (request.userEmail) {
      try {
        const existingUser = await getUserByEmail(request.userEmail)
        if (!existingUser && request.userName) {
          await createUser({
            email: request.userEmail,
            name: request.userName
          })
        }
      } catch (error) {
        logger.warn('Failed to process user data', { email: request.userEmail }, error)
      }
    }

    return userData
  }

  private async processFileData(request: PredictionRequest): Promise<any> {
    if (!request.fileData) {
      return request.application ? {
        id: 'temp_app_' + Math.random().toString(36).substr(2, 9),
        projectTitle: request.application.projectTitle || 'Grant Application',
        projectSummary: request.application.projectSummary || 'Project summary not provided',
        proposalText: request.application.proposalText,
        requestedAmount: request.fundingAmount
      } : undefined
    }

    // For demo purposes, extract basic info from filename and create mock application
    const filename = request.fileData.name.replace(/\.[^/.]+$/, '') // Remove extension
    
    return {
      id: 'file_app_' + Math.random().toString(36).substr(2, 9),
      projectTitle: filename.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      projectSummary: `Project based on uploaded file: ${request.fileData.name}. This application seeks funding for innovative work in the organization's focus area.`,
      proposalText: request.application?.proposalText || `Proposal content extracted from ${request.fileData.name}`,
      requestedAmount: request.fundingAmount
    }
  }

  private createMockGrant(request: PredictionRequest): any {
    const grantCategories = {
      'nonprofit': 'Community Development',
      'university': 'Research & Education',
      'startup': 'Innovation & Technology',
      'corporation': 'Business Development',
      'government': 'Public Sector Initiative'
    }

    const agencies = {
      'nonprofit': 'Department of Health and Human Services',
      'university': 'National Science Foundation',
      'startup': 'Small Business Administration',
      'corporation': 'Department of Commerce',
      'government': 'General Services Administration'
    }

    const category = grantCategories[request.organizationType as keyof typeof grantCategories] || 'General Funding'
    const agency = agencies[request.organizationType as keyof typeof agencies] || 'Federal Grant Agency'

    return {
      id: 'mock_grant_' + Math.random().toString(36).substr(2, 9),
      title: `${category} Grant Program`,
      agency,
      amount: Math.max(request.fundingAmount, 250000), // Ensure grant can cover requested amount
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
      category,
      eligibility: this.getEligibilityForOrgType(request.organizationType),
      description: `Funding opportunity for ${request.organizationType} organizations focusing on ${category.toLowerCase()} initiatives.`,
      keywords: this.getKeywordsForCategory(category)
    }
  }

  private getEligibilityForOrgType(orgType: string): string[] {
    const eligibilityMap: { [key: string]: string[] } = {
      'nonprofit': ['Non-profit Organization', '501(c)(3)', 'Community Organization'],
      'university': ['University', 'Research Institution', 'Educational Institution'],
      'startup': ['Small Business', 'Startup', 'Technology Company'],
      'corporation': ['Corporation', 'Large Business', 'Enterprise'],
      'government': ['Government Agency', 'Public Sector', 'Municipal Organization']
    }
    return eligibilityMap[orgType] || ['General Eligibility']
  }

  private getKeywordsForCategory(category: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'Community Development': ['community', 'development', 'social impact', 'outreach'],
      'Research & Education': ['research', 'education', 'innovation', 'academic'],
      'Innovation & Technology': ['technology', 'innovation', 'startup', 'development'],
      'Business Development': ['business', 'economic development', 'growth', 'expansion'],
      'Public Sector Initiative': ['government', 'public service', 'civic', 'administration']
    }
    return keywordMap[category] || ['general', 'funding', 'program']
  }

  private async generateAdditionalInsights(
    request: PredictionRequest, 
    aiPrediction: any
  ): Promise<any> {
    const insights = []
    
    // Experience level insights
    if (request.experienceLevel === 'beginner') {
      insights.push('Consider starting with smaller grants to build track record')
    } else if (request.experienceLevel === 'expert') {
      insights.push('Leverage past success stories in application narrative')
    }
    
    // Partnership insights
    if (request.hasPartnership) {
      insights.push('Strong partnerships enhance credibility and project reach')
    } else {
      insights.push('Consider building strategic partnerships before applying')
    }
    
    // Funding amount insights
    if (request.fundingAmount > 1000000) {
      insights.push('Large funding requests require exceptional project justification')
    } else if (request.fundingAmount < 50000) {
      insights.push('Smaller grants often have higher success rates and less competition')
    }

    return {
      keyInsights: insights,
      riskFactors: this.identifyRiskFactors(request),
      opportunityAreas: this.identifyOpportunities(request)
    }
  }

  private identifyRiskFactors(request: PredictionRequest): string[] {
    const risks = []
    
    if (request.experienceLevel === 'beginner' && request.fundingAmount > 500000) {
      risks.push('Large funding request for first-time applicant')
    }
    
    if (!request.hasPartnership && request.organizationType === 'startup') {
      risks.push('Limited partnerships may reduce credibility')
    }
    
    if (!request.hasPreviousGrants) {
      risks.push('No previous grant history may impact evaluation')
    }
    
    return risks
  }

  private identifyOpportunities(request: PredictionRequest): string[] {
    const opportunities = []
    
    if (request.organizationType === 'university') {
      opportunities.push('Academic institutions often have favorable grant evaluation')
    }
    
    if (request.hasPartnership) {
      opportunities.push('Partnerships demonstrate collaborative approach')
    }
    
    if (request.fundingAmount < 250000) {
      opportunities.push('Moderate funding requests have higher success rates')
    }
    
    return opportunities
  }

  private buildPredictionResponse(
    aiPrediction: any,
    matchAnalysis: any,
    additionalInsights: any,
    request: PredictionRequest,
    processingTime: number
  ): EnhancedPredictionResponse {
    // Generate recommended actions from AI insights
    const recommendedActions = [
      ...aiPrediction.improvementSuggestions.slice(0, 4).map((s: any) => s.suggestion),
      ...additionalInsights.keyInsights.slice(0, 2)
    ]

    return {
      successProbability: aiPrediction.successProbability,
      confidence: aiPrediction.confidenceLevel > 85 ? 'high' : 
                 aiPrediction.confidenceLevel > 70 ? 'medium' : 'low',
      aiEnhanced: true,
      
      matchScore: matchAnalysis.matchScore,
      scoringBreakdown: aiPrediction.scoringBreakdown,
      
      positiveFactors: aiPrediction.positiveFactors,
      negativeFactors: aiPrediction.negativeFactors,
      recommendedActions,
      improvementSuggestions: aiPrediction.improvementSuggestions,
      
      matchingGrants: this.generateMockMatchingGrants(request),
      similarWinners: aiPrediction.similarWinners,
      
      aiReasoning: aiPrediction.aiReasoning,
      keyInsights: additionalInsights.keyInsights,
      
      processingTime,
      timestamp: new Date().toISOString(),
      modelVersion: 'enhanced-v1.0'
    }
  }

  private generateMockMatchingGrants(request: PredictionRequest): any[] {
    const baseGrants = [
      {
        id: 'grant-001',
        title: 'Innovation Excellence Program',
        agency: 'National Science Foundation',
        amount: 350000,
        deadline: '2025-04-15'
      },
      {
        id: 'grant-002', 
        title: 'Community Impact Initiative',
        agency: 'Department of Health and Human Services',
        amount: 200000,
        deadline: '2025-03-30'
      },
      {
        id: 'grant-003',
        title: 'Technology Development Fund',
        agency: 'Small Business Administration',
        amount: 150000,
        deadline: '2025-05-01'
      }
    ]

    return baseGrants.map(grant => ({
      ...grant,
      matchScore: Math.max(70, Math.min(95, 
        85 + (grant.amount > request.fundingAmount ? -5 : 5) + 
        (Math.random() * 10 - 5)
      ))
    })).sort((a, b) => b.matchScore - a.matchScore)
  }

  private async storePredictionRecord(
    request: PredictionRequest, 
    response: EnhancedPredictionResponse,
    userId?: string
  ): Promise<void> {
    try {
      const stored = await storePrediction({
        userId: userId || undefined,
        organizationName: request.organizationName,
        organizationType: request.organizationType,
        fundingAmount: request.fundingAmount,
        experienceLevel: request.experienceLevel,
        hasPartnership: request.hasPartnership,
        hasPreviousGrants: request.hasPreviousGrants,
        successProbability: response.successProbability,
        confidence: response.confidence,
        aiEnhanced: response.aiEnhanced,
        recommendations: response.recommendedActions
      })

      if (stored) {
        response.predictionId = stored.id
      }
    } catch (error) {
      logger.warn('Failed to store prediction record', {
        organizationName: request.organizationName
      }, error)
    }
  }

  private generateFallbackPrediction(
    request: PredictionRequest, 
    processingTime: number
  ): EnhancedPredictionResponse {
    let probability = 65

    // Organization type adjustments
    const orgAdjustments: { [key: string]: number } = {
      'university': 10,
      'nonprofit': 8,
      'startup': 5,
      'corporation': 3,
      'government': 7
    }
    probability += orgAdjustments[request.organizationType] || 0

    // Experience level adjustments
    const expAdjustments: { [key: string]: number } = {
      'expert': 15,
      'intermediate': 8,
      'beginner': -5
    }
    probability += expAdjustments[request.experienceLevel] || 0

    // Other factors
    if (request.hasPartnership) probability += 7
    if (request.hasPreviousGrants) probability += 12
    if (request.fundingAmount < 100000) probability += 8
    else if (request.fundingAmount > 500000) probability -= 10

    probability = Math.min(95, Math.max(25, probability))

    return {
      successProbability: probability,
      confidence: probability > 75 ? 'medium' : 'low',
      aiEnhanced: false,
      matchScore: Math.min(85, probability + 5),
      scoringBreakdown: {
        organizationFit: 0.75,
        projectAlignment: 0.7,
        budgetAppropriateness: 0.8,
        geographicMatch: 0.9,
        pastSuccessCorrelation: 0.65,
        competitionLevel: 0.7,
        applicationQuality: 0.75
      },
      positiveFactors: [
        { factor: 'Organization type matches grant focus', weight: 0.25, score: 0.8 },
        { factor: 'Appropriate funding level requested', weight: 0.2, score: 0.85 }
      ],
      negativeFactors: [
        { factor: 'Competitive funding landscape', weight: 0.15, impact: -0.1 }
      ],
      recommendedActions: [
        'Strengthen project narrative with specific measurable outcomes',
        'Build strategic partnerships to enhance application credibility',
        'Prepare comprehensive budget justification',
        'Develop clear evaluation and sustainability plans'
      ],
      improvementSuggestions: [
        {
          area: 'application_quality',
          suggestion: 'Enhance project description with specific impact metrics',
          potentialImpact: 0.08,
          priority: 'high'
        }
      ],
      matchingGrants: this.generateMockMatchingGrants(request),
      similarWinners: [],
      aiReasoning: `Based on algorithmic analysis, this application has a ${probability}% success probability. Key factors include organizational fit (${request.organizationType}), experience level (${request.experienceLevel}), and funding amount appropriateness.`,
      keyInsights: [
        'Focus on demonstrating measurable impact',
        'Consider building additional partnerships',
        'Ensure budget aligns with project scope'
      ],
      processingTime,
      timestamp: new Date().toISOString(),
      modelVersion: 'fallback-v1.0'
    }
  }

  // Service information
  getServiceInfo() {
    return {
      serviceName: 'Enhanced Prediction Service',
      version: '1.0.0',
      capabilities: [
        'Comprehensive grant success prediction',
        'AI-enhanced analysis and recommendations',
        'Grant matching and similarity analysis',
        'File-based application processing',
        'Database integration and user tracking'
      ],
      aiService: this.aiService.getServiceInfo(),
      lastUpdated: new Date().toISOString()
    }
  }
}