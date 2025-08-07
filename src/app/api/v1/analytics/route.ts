import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, checkRateLimit } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { getAnalytics, connectToDatabase } from '@/lib/database'
import { UserService } from '@/lib/services/user-service'

interface AnalyticsQuery {
  period?: 'day' | 'week' | 'month' | 'year'
  startDate?: string
  endDate?: string
  organizationType?: string
  userEmail?: string
}

// Get analytics data
export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('Analytics request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting - more restrictive for analytics
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp)) { // Uses default rate limiting settings
    logger.warn('Rate limit exceeded for analytics', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many analytics requests. Please try again later.')
  }
  
  const { searchParams } = new URL(request.url)
  const query: AnalyticsQuery = {
    period: (searchParams.get('period') as any) || 'month',
    startDate: searchParams.get('start_date') || undefined,
    endDate: searchParams.get('end_date') || undefined,
    organizationType: searchParams.get('organization_type') || undefined,
    userEmail: searchParams.get('user_email') || undefined
  }
  
  logger.debug('Processing analytics query', {
    requestId,
    period: query.period,
    hasDateRange: !!(query.startDate && query.endDate),
    organizationType: query.organizationType,
    userEmail: query.userEmail?.substring(0, 3) + '***'
  })
  
  try {
    // Get basic analytics from database
    const basicAnalytics = await getAnalytics()
    
    // Get detailed analytics with query filters
    const detailedAnalytics = await getDetailedAnalytics(query, requestId)
    
    const processingTime = overallTimer.end()
    
    const response = {
      basic: basicAnalytics || {
        totalUsers: 0,
        totalPredictions: 0,
        avgSuccessRate: 0,
        topOrgTypes: []
      },
      detailed: detailedAnalytics,
      query,
      processingTime,
      timestamp: new Date().toISOString()
    }
    
    logger.info('Analytics retrieved successfully', {
      requestId,
      totalUsers: response.basic.totalUsers,
      totalPredictions: response.basic.totalPredictions,
      avgSuccessRate: response.basic.avgSuccessRate,
      processingTime
    })
    
    return NextResponse.json(createSuccess(response, 'Analytics data retrieved successfully'))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('Analytics retrieval failed', { 
      requestId, 
      processingTime,
      query 
    }, error)
    throw error
  }
})

async function getDetailedAnalytics(query: AnalyticsQuery, requestId: string) {
  const database = await connectToDatabase()
  
  if (!database) {
    logger.info('Database not available, returning mock analytics', { requestId })
    return getMockDetailedAnalytics(query)
  }
  
  try {
    // Build dynamic query based on filters
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramCount = 0
    
    // Date range filter
    if (query.startDate) {
      paramCount++
      whereClause += ` AND created_at >= $${paramCount}`
      params.push(query.startDate)
    }
    
    if (query.endDate) {
      paramCount++
      whereClause += ` AND created_at <= $${paramCount}`
      params.push(query.endDate)
    }
    
    // Organization type filter
    if (query.organizationType) {
      paramCount++
      whereClause += ` AND organization_type = $${paramCount}`
      params.push(query.organizationType)
    }
    
    // User filter
    if (query.userEmail) {
      // Need to join with users table
      const userService = new UserService()
      const user = await userService.getUserProfile(query.userEmail)
      
      if (user) {
        paramCount++
        whereClause += ` AND user_id = $${paramCount}`
        params.push(user.id)
      }
    }
    
    // Success rate trends
    const trendQuery = `
      SELECT 
        DATE_TRUNC('${query.period}', created_at) as period,
        COUNT(*) as total_predictions,
        AVG(success_probability) as avg_success_rate,
        COUNT(CASE WHEN ai_enhanced = true THEN 1 END) as ai_enhanced_count
      FROM predictions
      ${whereClause}
      GROUP BY DATE_TRUNC('${query.period}', created_at)
      ORDER BY period DESC
      LIMIT 50
    `
    
    const trendResult = await database.query(trendQuery, params)
    
    // Organization type breakdown
    const orgTypeQuery = `
      SELECT 
        organization_type,
        COUNT(*) as prediction_count,
        AVG(success_probability) as avg_success_rate,
        AVG(funding_amount) as avg_funding_amount
      FROM predictions
      ${whereClause}
      GROUP BY organization_type
      ORDER BY prediction_count DESC
    `
    
    const orgTypeResult = await database.query(orgTypeQuery, params)
    
    // Experience level analysis
    const experienceQuery = `
      SELECT 
        experience_level,
        COUNT(*) as prediction_count,
        AVG(success_probability) as avg_success_rate,
        COUNT(CASE WHEN has_partnership = true THEN 1 END) as with_partnerships,
        COUNT(CASE WHEN has_previous_grants = true THEN 1 END) as with_previous_grants
      FROM predictions
      ${whereClause}
      GROUP BY experience_level
      ORDER BY prediction_count DESC
    `
    
    const experienceResult = await database.query(experienceQuery, params)
    
    // Funding amount distribution
    const fundingQuery = `
      SELECT 
        CASE 
          WHEN funding_amount < 50000 THEN 'Under $50K'
          WHEN funding_amount < 250000 THEN '$50K-$250K'
          WHEN funding_amount < 1000000 THEN '$250K-$1M'
          ELSE 'Over $1M'
        END as funding_range,
        COUNT(*) as prediction_count,
        AVG(success_probability) as avg_success_rate
      FROM predictions
      ${whereClause}
      GROUP BY funding_range
      ORDER BY MIN(funding_amount)
    `
    
    const fundingResult = await database.query(fundingQuery, params)
    
    return {
      trends: trendResult.rows.map(row => ({
        period: row.period,
        totalPredictions: parseInt(row.total_predictions),
        avgSuccessRate: Math.round(parseFloat(row.avg_success_rate || 0)),
        aiEnhancedCount: parseInt(row.ai_enhanced_count)
      })),
      organizationTypes: orgTypeResult.rows.map(row => ({
        organizationType: row.organization_type,
        predictionCount: parseInt(row.prediction_count),
        avgSuccessRate: Math.round(parseFloat(row.avg_success_rate || 0)),
        avgFundingAmount: Math.round(parseFloat(row.avg_funding_amount || 0))
      })),
      experienceLevels: experienceResult.rows.map(row => ({
        experienceLevel: row.experience_level,
        predictionCount: parseInt(row.prediction_count),
        avgSuccessRate: Math.round(parseFloat(row.avg_success_rate || 0)),
        withPartnerships: parseInt(row.with_partnerships),
        withPreviousGrants: parseInt(row.with_previous_grants)
      })),
      fundingDistribution: fundingResult.rows.map(row => ({
        fundingRange: row.funding_range,
        predictionCount: parseInt(row.prediction_count),
        avgSuccessRate: Math.round(parseFloat(row.avg_success_rate || 0))
      }))
    }
    
  } catch (error) {
    logger.error('Detailed analytics query failed', { requestId }, error)
    return getMockDetailedAnalytics(query)
  }
}

function getMockDetailedAnalytics(query: AnalyticsQuery) {
  const now = new Date()
  const periods = []
  
  // Generate mock trend data
  for (let i = 0; i < 12; i++) {
    const date = new Date(now)
    if (query.period === 'month') {
      date.setMonth(date.getMonth() - i)
    } else if (query.period === 'week') {
      date.setDate(date.getDate() - (i * 7))
    } else {
      date.setDate(date.getDate() - i)
    }
    
    periods.push({
      period: date.toISOString().split('T')[0],
      totalPredictions: Math.floor(Math.random() * 50) + 10,
      avgSuccessRate: Math.floor(Math.random() * 30) + 60,
      aiEnhancedCount: Math.floor(Math.random() * 30) + 5
    })
  }
  
  return {
    trends: periods.reverse(),
    organizationTypes: [
      { organizationType: 'nonprofit', predictionCount: 45, avgSuccessRate: 72, avgFundingAmount: 185000 },
      { organizationType: 'university', predictionCount: 38, avgSuccessRate: 78, avgFundingAmount: 350000 },
      { organizationType: 'startup', predictionCount: 32, avgSuccessRate: 65, avgFundingAmount: 125000 },
      { organizationType: 'corporation', predictionCount: 28, avgSuccessRate: 68, avgFundingAmount: 275000 }
    ],
    experienceLevels: [
      { experienceLevel: 'expert', predictionCount: 52, avgSuccessRate: 78, withPartnerships: 45, withPreviousGrants: 48 },
      { experienceLevel: 'intermediate', predictionCount: 67, avgSuccessRate: 69, withPartnerships: 32, withPreviousGrants: 28 },
      { experienceLevel: 'beginner', predictionCount: 34, avgSuccessRate: 58, withPartnerships: 12, withPreviousGrants: 8 }
    ],
    fundingDistribution: [
      { fundingRange: 'Under $50K', predictionCount: 28, avgSuccessRate: 75 },
      { fundingRange: '$50K-$250K', predictionCount: 89, avgSuccessRate: 68 },
      { fundingRange: '$250K-$1M', predictionCount: 32, avgSuccessRate: 62 },
      { fundingRange: 'Over $1M', predictionCount: 14, avgSuccessRate: 55 }
    ]
  }
}