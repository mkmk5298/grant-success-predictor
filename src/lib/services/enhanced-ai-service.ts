/**
 * Enhanced AI Service for Grant Predictor
 * Based on the comprehensive FastAPI backend implementation
 */

import OpenAI from 'openai'
import { logger } from '@/lib/logger'

interface User {
  id: string
  email: string
  name: string
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

interface Grant {
  id: string
  title: string
  agency: string
  amount: number
  deadline: string
  category: string
  eligibility: string[]
  description: string
  keywords: string[]
}

interface Application {
  id: string
  projectTitle: string
  projectSummary: string
  proposalText?: string
  requestedAmount: number
}

interface PredictionResult {
  successProbability: number
  confidenceLevel: number
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
  improvementSuggestions: Array<{
    area: string
    suggestion: string
    potentialImpact: number
    priority: 'high' | 'medium' | 'low'
  }>
  similarWinners: Array<{
    organization: string
    similarityScore: number
    keySimilarities: string[]
    successFactors: string[]
  }>
  aiReasoning: string
}

export class EnhancedAIService {
  private openai: OpenAI | null = null

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      this.openai = new OpenAI({ apiKey })
      logger.info('EnhancedAIService initialized with OpenAI')
    } else {
      logger.warn('OpenAI API key not configured - using fallback analysis')
    }
  }

  async analyzeGrantMatch(user: User, grant: Grant): Promise<{ matchScore: number, detailedScores: any }> {
    if (!this.openai) {
      return this.fallbackGrantMatch(user, grant)
    }

    try {
      const prompt = this.buildGrantMatchPrompt(user, grant)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert grant consultant analyzing grant-organization fit. Provide detailed scoring and analysis in JSON format.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        matchScore: Math.min(95, Math.max(25, analysis.overall_match_score || 65)),
        detailedScores: {
          organizationFit: analysis.organization_fit || 0.7,
          projectAlignment: analysis.project_alignment || 0.8,
          budgetAppropriateness: analysis.budget_fit || 0.75,
          geographicMatch: analysis.geographic_match || 0.9,
          pastSuccessCorrelation: analysis.past_success || 0.6,
          competitionLevel: analysis.competition_assessment || 0.7
        }
      }
    } catch (error) {
      logger.error('Grant match analysis failed', {}, error)
      return this.fallbackGrantMatch(user, grant)
    }
  }

  async predictApplicationSuccess(
    user: User,
    grant: Grant,
    application?: Application
  ): Promise<PredictionResult> {
    if (!this.openai) {
      return this.fallbackPrediction(user, grant, application)
    }

    try {
      const prompt = this.buildPredictionPrompt(user, grant, application)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior grant expert with 20+ years of experience. Analyze applications and provide comprehensive predictions with specific, actionable insights.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      })

      const prediction = JSON.parse(response.choices[0].message.content || '{}')
      
      return this.formatPredictionResult(prediction, user, grant, application)
    } catch (error) {
      logger.error('Application success prediction failed', {}, error)
      return this.fallbackPrediction(user, grant, application)
    }
  }

  async generateApplicationSuggestions(
    user: User,
    grant: Grant,
    application: Application
  ): Promise<Array<{ area: string, suggestion: string, impact: string, priority: string }>> {
    if (!this.openai) {
      return this.fallbackSuggestions()
    }

    try {
      const prompt = `
        Analyze this grant application and provide specific improvement suggestions:
        
        Grant: ${grant.title} by ${grant.agency}
        Amount: $${grant.amount.toLocaleString()}
        Focus: ${grant.category}
        
        Organization: ${user.organizationName} (${user.organizationType})
        Project: ${application.projectTitle}
        Summary: ${application.projectSummary}
        
        Provide 5-8 specific, actionable suggestions to improve success probability.
        Format as JSON with: area, suggestion, potential_impact, priority.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert grant writer providing specific, actionable improvement suggestions.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1500
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      return result.suggestions || this.fallbackSuggestions()
    } catch (error) {
      logger.error('Application suggestions failed', {}, error)
      return this.fallbackSuggestions()
    }
  }

  async smartGrantSearch(
    user: User,
    query: string,
    availableGrants: Grant[]
  ): Promise<Array<{ grant: Grant, relevanceScore: number, reasoning: string }>> {
    if (!this.openai || availableGrants.length === 0) {
      return this.fallbackGrantSearch(query, availableGrants)
    }

    try {
      const grantSummaries = availableGrants.slice(0, 10).map(grant => ({
        id: grant.id,
        title: grant.title,
        agency: grant.agency,
        category: grant.category,
        keywords: grant.keywords.join(', ')
      }))

      const prompt = `
        User Query: "${query}"
        Organization: ${user.organizationName} (${user.organizationType})
        
        Available Grants: ${JSON.stringify(grantSummaries)}
        
        Analyze and rank these grants by relevance to the user's query and organization.
        Return top 5 matches with relevance scores (0-100) and brief reasoning.
        Format as JSON: { "matches": [{"grant_id": "", "score": 0, "reasoning": ""}] }
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert grant matching specialist. Analyze user needs and match them to appropriate funding opportunities.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1200
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      
      return (result.matches || []).map((match: any) => {
        const grant = availableGrants.find(g => g.id === match.grant_id)
        return grant ? {
          grant,
          relevanceScore: Math.min(100, Math.max(0, match.score || 50)),
          reasoning: match.reasoning || 'AI analysis match'
        } : null
      }).filter(Boolean)
    } catch (error) {
      logger.error('Smart grant search failed', {}, error)
      return this.fallbackGrantSearch(query, availableGrants)
    }
  }

  // Helper methods
  private buildGrantMatchPrompt(user: User, grant: Grant): string {
    return `
      Analyze how well this grant matches the organization profile:
      
      GRANT:
      - Title: ${grant.title}
      - Agency: ${grant.agency}
      - Amount: $${grant.amount.toLocaleString()}
      - Category: ${grant.category}
      - Eligibility: ${grant.eligibility.join(', ')}
      - Keywords: ${grant.keywords.join(', ')}
      
      ORGANIZATION:
      - Name: ${user.organizationName}
      - Type: ${user.organizationType}
      - Mission: ${user.profileData?.mission || 'Not specified'}
      - Focus Areas: ${user.profileData?.focusAreas?.join(', ') || 'Not specified'}
      - Annual Budget: $${user.profileData?.annualBudget?.toLocaleString() || 'Not specified'}
      - Years Operating: ${user.profileData?.yearsOperating || 'Not specified'}
      
      Provide detailed scoring (0-100) for:
      - overall_match_score
      - organization_fit
      - project_alignment  
      - budget_fit
      - geographic_match
      - past_success
      - competition_assessment
      
      Format as JSON with explanations.
    `
  }

  private buildPredictionPrompt(user: User, grant: Grant, application?: Application): string {
    return `
      Predict the success probability of this grant application:
      
      GRANT: ${grant.title} by ${grant.agency}
      Amount: $${grant.amount.toLocaleString()}
      Deadline: ${grant.deadline}
      Category: ${grant.category}
      
      APPLICANT: ${user.organizationName} (${user.organizationType})
      ${application ? `
      PROJECT: ${application.projectTitle}
      SUMMARY: ${application.projectSummary}
      REQUESTED: $${application.requestedAmount.toLocaleString()}
      ` : ''}
      
      Provide comprehensive analysis with:
      - success_probability (0-100)
      - confidence_level (0-100)
      - key_factors (scoring breakdown)
      - positive_factors (strengths)
      - risk_factors (challenges)
      - improvement_suggestions (specific actions)
      - similar_successful_applications
      - detailed_reasoning
      
      Be realistic and specific. Format as JSON.
    `
  }

  private formatPredictionResult(
    prediction: any,
    user: User,
    grant: Grant,
    application?: Application
  ): PredictionResult {
    return {
      successProbability: Math.min(95, Math.max(25, prediction.success_probability || 65)),
      confidenceLevel: Math.min(100, Math.max(50, prediction.confidence_level || 75)),
      matchScore: Math.min(95, Math.max(25, prediction.match_score || 70)),
      scoringBreakdown: {
        organizationFit: prediction.key_factors?.organization_fit || 0.75,
        projectAlignment: prediction.key_factors?.project_alignment || 0.8,
        budgetAppropriateness: prediction.key_factors?.budget_appropriateness || 0.7,
        geographicMatch: prediction.key_factors?.geographic_match || 0.9,
        pastSuccessCorrelation: prediction.key_factors?.past_success || 0.6,
        competitionLevel: prediction.key_factors?.competition || 0.65,
        applicationQuality: prediction.key_factors?.application_quality || 0.75
      },
      positiveFactors: (prediction.positive_factors || []).map((factor: any, index: number) => ({
        factor: typeof factor === 'string' ? factor : factor.factor || `Strength ${index + 1}`,
        weight: factor.weight || 0.2,
        score: factor.score || 0.8
      })),
      negativeFactors: (prediction.risk_factors || []).map((factor: any, index: number) => ({
        factor: typeof factor === 'string' ? factor : factor.factor || `Risk ${index + 1}`,
        weight: factor.weight || 0.15,
        impact: factor.impact || -0.1
      })),
      improvementSuggestions: (prediction.improvement_suggestions || []).map((suggestion: any) => ({
        area: suggestion.area || 'general',
        suggestion: typeof suggestion === 'string' ? suggestion : suggestion.suggestion || '',
        potentialImpact: suggestion.potential_impact || 0.05,
        priority: suggestion.priority || 'medium'
      })),
      similarWinners: prediction.similar_successful_applications || [],
      aiReasoning: prediction.detailed_reasoning || this.generateFallbackReasoning(prediction, user, grant)
    }
  }

  private generateFallbackReasoning(prediction: any, user: User, grant: Grant): string {
    const successProb = prediction.success_probability || 65
    const confidence = prediction.confidence_level || 75
    
    return `Based on our analysis, ${user.organizationName} has a ${successProb}% probability of success with this ${grant.agency} grant, with ${confidence}% confidence. This assessment considers organizational fit, project alignment, budget appropriateness, and competitive landscape. Key factors include the organization's profile match with grant criteria and the strength of the proposed project relative to typical winning applications.`
  }

  // Fallback methods when OpenAI is not available
  private fallbackGrantMatch(user: User, grant: Grant): { matchScore: number, detailedScores: any } {
    let score = 65 // Base score

    // Organization type matching
    if (grant.eligibility.some(e => e.toLowerCase().includes(user.organizationType?.toLowerCase() || ''))) {
      score += 15
    }

    // Budget considerations
    if (user.profileData?.annualBudget) {
      const budgetRatio = grant.amount / user.profileData.annualBudget
      if (budgetRatio > 0.1 && budgetRatio < 2) score += 10
    }

    return {
      matchScore: Math.min(95, Math.max(25, score)),
      detailedScores: {
        organizationFit: 0.7,
        projectAlignment: 0.75,
        budgetAppropriateness: 0.8,
        geographicMatch: 0.9,
        pastSuccessCorrelation: 0.65,
        competitionLevel: 0.7
      }
    }
  }

  private fallbackPrediction(user: User, grant: Grant, application?: Application): PredictionResult {
    let probability = 65
    
    // Adjust based on organization type
    if (user.organizationType === 'university') probability += 10
    else if (user.organizationType === 'nonprofit') probability += 8
    else if (user.organizationType === 'startup') probability += 5

    // Adjust based on grant amount
    if (grant.amount < 50000) probability += 8
    else if (grant.amount > 500000) probability -= 10

    return {
      successProbability: Math.min(95, Math.max(25, probability)),
      confidenceLevel: 70,
      matchScore: 72,
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
        { factor: 'Organization type aligns with grant criteria', weight: 0.25, score: 0.8 },
        { factor: 'Appropriate funding request size', weight: 0.2, score: 0.85 }
      ],
      negativeFactors: [
        { factor: 'Competitive grant category', weight: 0.15, impact: -0.1 }
      ],
      improvementSuggestions: [
        {
          area: 'application_quality',
          suggestion: 'Strengthen project narrative with specific impact metrics',
          potentialImpact: 0.08,
          priority: 'high'
        },
        {
          area: 'partnerships',
          suggestion: 'Build strategic partnerships to enhance credibility',
          potentialImpact: 0.05,
          priority: 'medium'
        }
      ],
      similarWinners: [],
      aiReasoning: `This application has a ${probability}% success probability based on organizational fit, grant criteria alignment, and funding amount appropriateness. Key strengths include good organizational match with grant requirements. Main opportunities for improvement include strengthening the project narrative and building strategic partnerships.`
    }
  }

  private fallbackSuggestions() {
    return [
      {
        area: 'project_narrative',
        suggestion: 'Strengthen project description with specific, measurable outcomes',
        impact: 'high',
        priority: 'high'
      },
      {
        area: 'budget_justification',
        suggestion: 'Provide detailed budget breakdown with clear justifications',
        impact: 'medium',
        priority: 'high'
      },
      {
        area: 'evaluation_plan',
        suggestion: 'Develop comprehensive evaluation and assessment methodology',
        impact: 'medium',
        priority: 'medium'
      }
    ]
  }

  private fallbackGrantSearch(query: string, grants: Grant[]) {
    // Simple keyword matching
    const queryWords = query.toLowerCase().split(' ')
    
    return grants
      .map(grant => {
        let score = 0
        const searchText = `${grant.title} ${grant.description} ${grant.category} ${grant.keywords.join(' ')}`.toLowerCase()
        
        queryWords.forEach(word => {
          if (searchText.includes(word)) score += 20
        })
        
        return {
          grant,
          relevanceScore: Math.min(100, score),
          reasoning: `Matches ${queryWords.filter(word => searchText.includes(word)).length} of ${queryWords.length} search terms`
        }
      })
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
  }

  // Service status and configuration
  getServiceInfo() {
    return {
      serviceType: 'Enhanced AI Service',
      openaiConfigured: !!this.openai,
      capabilities: [
        'Grant matching analysis',
        'Success probability prediction',
        'Application improvement suggestions',
        'Smart grant search',
        'Comprehensive application analysis'
      ],
      modelVersion: 'gpt-4o-mini',
      lastUpdated: new Date().toISOString()
    }
  }
}