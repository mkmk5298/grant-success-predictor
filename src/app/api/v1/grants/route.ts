import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createSuccess, createError, checkRateLimit } from '@/lib/api-handler'
import { logger, createTimer } from '@/lib/logger'
import { GrantDataService, GrantSearchFilters } from '@/lib/services/grant-data-service'

const mockGrants = [
  {
    id: 'NSF-2025-001',
    title: 'Innovation in Sustainability Grant',
    agency: 'National Science Foundation',
    amount: 250000,
    deadline: '2025-03-15',
    category: 'Research & Development',
    eligibility: ['University', 'Non-profit', 'Small Business'],
    description: 'Supporting innovative approaches to environmental sustainability and clean technology development.',
    match_score: 94,
    keywords: ['sustainability', 'clean tech', 'environment', 'innovation']
  },
  {
    id: 'DOE-2025-002',
    title: 'Community Development Fund',
    agency: 'Department of Energy',
    amount: 150000,
    deadline: '2025-02-28',
    category: 'Community Impact',
    eligibility: ['Non-profit', 'Community Organization'],
    description: 'Funding for community-based energy efficiency and renewable energy projects.',
    match_score: 88,
    keywords: ['community', 'energy', 'renewable', 'efficiency']
  },
  {
    id: 'NIH-2025-003',
    title: 'Technology Advancement Initiative',
    agency: 'National Institutes of Health',
    amount: 500000,
    deadline: '2025-04-30',
    category: 'Healthcare Technology',
    eligibility: ['University', 'Research Institution', 'Startup'],
    description: 'Supporting breakthrough technologies in healthcare and medical research.',
    match_score: 82,
    keywords: ['healthcare', 'medical', 'technology', 'research']
  },
  {
    id: 'SBA-2025-004',
    title: 'Small Business Innovation Research',
    agency: 'Small Business Administration',
    amount: 75000,
    deadline: '2025-05-15',
    category: 'Small Business',
    eligibility: ['Small Business', 'Startup'],
    description: 'Phase I funding for small businesses developing innovative technologies.',
    match_score: 75,
    keywords: ['small business', 'innovation', 'technology', 'startup']
  },
  {
    id: 'ED-2025-005',
    title: 'Education Innovation Grant',
    agency: 'Department of Education',
    amount: 200000,
    deadline: '2025-06-01',
    category: 'Education',
    eligibility: ['University', 'School District', 'Non-profit'],
    description: 'Supporting innovative educational programs and technologies.',
    match_score: 71,
    keywords: ['education', 'innovation', 'technology', 'learning']
  }
]

async function fetchGrantsFromDatabase(filters: any, requestId: string): Promise<any[] | null> {
  const timer = createTimer()
  
  logger.debug('Attempting database connection for grants', { 
    requestId, 
    filters,
    hasDbConfig: !!process.env.DATABASE_URL
  })
  
  if (!process.env.DATABASE_URL) {
    logger.info('Database URL not configured, using mock data', { requestId })
    return null
  }

  try {
    // In production, implement database connection
    /*
    const db = await connectToDatabase()
    let query = 'SELECT * FROM grants WHERE 1=1'
    const params: any[] = []
    let paramCount = 0

    if (filters.category) {
      paramCount++
      query += ` AND category ILIKE $${paramCount}`
      params.push(`%${filters.category}%`)
    }

    if (filters.minAmount) {
      paramCount++
      query += ` AND amount_max >= $${paramCount}`
      params.push(filters.minAmount)
    }

    if (filters.maxAmount) {
      paramCount++
      query += ` AND amount_min <= $${paramCount}`
      params.push(filters.maxAmount)
    }

    if (filters.search) {
      paramCount++
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR keywords ILIKE $${paramCount})`
      params.push(`%${filters.search}%`)
    }

    query += ' ORDER BY success_rate DESC, created_at DESC LIMIT 100'
    const result = await db.query(query, params)
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      agency: row.agency,
      amount: row.amount_max,
      amount_min: row.amount_min,
      amount_max: row.amount_max,
      deadline: row.deadline,
      category: row.category,
      eligibility: row.eligibility ? row.eligibility.split(',') : [],
      description: row.description,
      keywords: row.keywords ? row.keywords.split(',') : [],
      success_rate: row.success_rate,
      match_score: row.success_rate
    }))
    */
    
    const duration = timer.end()
    logger.info('Database grants query would be executed (mock)', {
      requestId,
      filters,
      duration,
      type: 'mock_db_query'
    })
    
    return null // Return null to fall back to mock data
    
  } catch (error) {
    const duration = timer.end()
    logger.dbError('SELECT grants', error, { 
      requestId, 
      filters,
      duration 
    })
    return null
  }
}

function filterMockGrants(filters: any): any[] {
  let filteredGrants = [...mockGrants]
  
  // Filter by category
  if (filters.category) {
    filteredGrants = filteredGrants.filter(grant => 
      grant.category.toLowerCase().includes(filters.category.toLowerCase())
    )
  }
  
  // Filter by amount range
  if (filters.minAmount) {
    filteredGrants = filteredGrants.filter(grant => 
      grant.amount >= parseInt(filters.minAmount)
    )
  }
  
  if (filters.maxAmount) {
    filteredGrants = filteredGrants.filter(grant => 
      grant.amount <= parseInt(filters.maxAmount)
    )
  }
  
  // Search in title, description, and keywords
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filteredGrants = filteredGrants.filter(grant => 
      grant.title.toLowerCase().includes(searchLower) ||
      grant.description.toLowerCase().includes(searchLower) ||
      grant.keywords.some((keyword: string) => keyword.toLowerCase().includes(searchLower))
    )
  }
  
  // Sort by match score (highest first)
  filteredGrants.sort((a, b) => b.match_score - a.match_score)
  
  return filteredGrants
}

export const GET = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('Enhanced grants search request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp)) { // Uses default rate limiting settings
    logger.warn('Rate limit exceeded for grants search', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many search requests. Please try again later.')
  }
  
  const { searchParams } = new URL(request.url)
  
  // Parse search parameters into GrantSearchFilters
  const filters: GrantSearchFilters = {}
  
  if (searchParams.get('category')) {
    filters.category = searchParams.get('category') as string
  }
  if (searchParams.get('min_amount')) {
    filters.amountMin = parseInt(searchParams.get('min_amount') as string)
  }
  if (searchParams.get('max_amount')) {
    filters.amountMax = parseInt(searchParams.get('max_amount') as string)
  }
  if (searchParams.get('agency')) {
    filters.agency = searchParams.get('agency') as string
  }
  if (searchParams.get('keywords')) {
    filters.keywords = (searchParams.get('keywords') as string).split(',').map(k => k.trim())
  }
  
  // Handle search parameter as keywords
  if (searchParams.get('search')) {
    const searchTerms = (searchParams.get('search') as string).split(' ').filter(term => term.length > 0)
    filters.keywords = [...(filters.keywords || []), ...searchTerms]
  }

  // Handle deadline filters
  if (searchParams.get('deadline_from') || searchParams.get('deadline_to')) {
    filters.deadline = {}
    if (searchParams.get('deadline_from')) {
      filters.deadline.from = searchParams.get('deadline_from') as string
    }
    if (searchParams.get('deadline_to')) {
      filters.deadline.to = searchParams.get('deadline_to') as string
    }
  }
  
  logger.debug('Processing enhanced grants search', {
    requestId,
    filters,
    searchSource: 'multi_api'
  })
  
  try {
    // Use the enhanced GrantDataService
    const grantDataService = new GrantDataService()
    
    // Search across all sources
    const grants = await grantDataService.searchAllSources(filters)
    
    const processingTime = overallTimer.end()
    
    logger.info('Enhanced grants search completed successfully', {
      requestId,
      grantsReturned: grants.length,
      source: 'multi_api',
      processingTime,
      filtersApplied: Object.keys(filters).length
    })
    
    return NextResponse.json(createSuccess({
      grants: grants.map(grant => ({
        id: grant.id,
        title: grant.title,
        agency: grant.agency,
        amount: grant.amount,
        amount_min: grant.amountMin,
        amount_max: grant.amountMax,
        deadline: grant.deadline,
        category: grant.category,
        description: grant.description,
        keywords: grant.keywords,
        eligibility: grant.eligibility,
        url: grant.url,
        source: grant.source,
        success_rate: grant.successRate,
        match_score: grant.successRate, // Use success rate as match score
        last_updated: grant.lastUpdated
      })),
      total: grants.length,
      source: 'enhanced_multi_api',
      sources_queried: ['USASpending', 'Grants.gov', 'NIH', 'Foundation990s'],
      filters_applied: filters,
      processingTime
    }, `Found ${grants.length} grants from multiple sources`))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('Enhanced grants search failed, falling back to mock data', { 
      requestId, 
      processingTime,
      filters 
    }, error)
    
    // Fallback to mock data
    const mockFilters = {
      category: filters.category,
      minAmount: filters.amountMin?.toString(),
      maxAmount: filters.amountMax?.toString(),
      search: filters.keywords?.join(' ')
    }
    
    const grants = filterMockGrants(mockFilters)
    
    return NextResponse.json(createSuccess({
      grants,
      total: grants.length,
      source: 'mock_fallback',
      filters_applied: filters,
      processingTime,
      warning: 'External API sources unavailable, using mock data'
    }, `Found ${grants.length} grants (mock data fallback)`))
  }
})

interface GrantMatchRequest {
  organizationType?: string
  fundingAmount?: number
  keywords?: string[]
}

function calculateGrantMatches(criteria: GrantMatchRequest): any[] {
  let matchedGrants = [...mockGrants]
  
  logger.debug('Calculating grant matches', {
    organizationType: criteria.organizationType,
    fundingAmount: criteria.fundingAmount,
    keywordsCount: criteria.keywords?.length || 0
  })
  
  // Filter by organization eligibility
  if (criteria.organizationType) {
    const beforeCount = matchedGrants.length
    matchedGrants = matchedGrants.filter(grant => 
      grant.eligibility.some(eligible => 
        eligible.toLowerCase().includes(criteria.organizationType!.toLowerCase())
      )
    )
    
    logger.debug('Filtered by organization type', {
      organizationType: criteria.organizationType,
      beforeCount,
      afterCount: matchedGrants.length
    })
  }
  
  // Adjust match scores based on funding amount proximity
  if (criteria.fundingAmount) {
    matchedGrants = matchedGrants.map(grant => ({
      ...grant,
      match_score: Math.max(0, grant.match_score - Math.abs(grant.amount - criteria.fundingAmount!) / 10000)
    }))
  }
  
  // Boost scores for keyword matches
  if (criteria.keywords && criteria.keywords.length > 0) {
    matchedGrants = matchedGrants.map(grant => {
      const keywordMatches = criteria.keywords!.filter((keyword: string) =>
        grant.keywords.some(grantKeyword => 
          grantKeyword.toLowerCase().includes(keyword.toLowerCase())
        )
      ).length
      
      return {
        ...grant,
        match_score: Math.min(100, grant.match_score + (keywordMatches * 5))
      }
    })
  }
  
  // Sort by match score and take top matches
  matchedGrants.sort((a, b) => b.match_score - a.match_score)
  matchedGrants = matchedGrants.slice(0, 10) // Top 10 matches
  
  return matchedGrants
}

export const POST = withApiHandler(async (request: NextRequest, { requestContext, requestId }) => {
  const overallTimer = createTimer()
  
  logger.info('Grant matching request received', { 
    requestId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent 
  })
  
  // Rate limiting
  const clientIp = requestContext.ip || 'unknown'
  if (!checkRateLimit(clientIp)) { // Uses default rate limiting settings
    logger.warn('Rate limit exceeded for grant matching', { ip: clientIp, requestId })
    throw createError.rateLimited('Too many matching requests. Please try again later.')
  }
  
  let body: GrantMatchRequest
  try {
    body = await request.json()
  } catch (error) {
    logger.warn('Invalid JSON in request body', { requestId, error })
    throw createError.validation('Invalid request format')
  }
  
  const { organizationType, fundingAmount, keywords } = body
  
  logger.debug('Processing grant matching request', {
    requestId,
    organizationType,
    fundingAmount,
    keywordsCount: keywords?.length || 0
  })
  
  // Validate funding amount if provided
  if (fundingAmount !== undefined && (fundingAmount < 0 || fundingAmount > 50000000)) {
    throw createError.validation('Funding amount must be between $0 and $50,000,000')
  }
  
  // Validate keywords if provided
  if (keywords && (!Array.isArray(keywords) || keywords.length > 20)) {
    throw createError.validation('Keywords must be an array with maximum 20 items')
  }
  
  try {
    // Calculate matching grants
    const matchedGrants = calculateGrantMatches(body)
    
    const processingTime = overallTimer.end()
    
    logger.info('Grant matching completed successfully', {
      requestId,
      totalMatches: matchedGrants.length,
      topMatchScore: matchedGrants[0]?.match_score || 0,
      processingTime,
      criteria: {
        organizationType,
        fundingAmount,
        keywordsCount: keywords?.length || 0
      }
    })
    
    return NextResponse.json(createSuccess({
      matched_grants: matchedGrants,
      total_matches: matchedGrants.length,
      matching_criteria: {
        organizationType,
        fundingAmount,
        keywords: keywords || []
      },
      top_match_score: matchedGrants[0]?.match_score || 0,
      processingTime
    }, `Found ${matchedGrants.length} matching grants`))
    
  } catch (error) {
    const processingTime = overallTimer.end()
    logger.error('Grant matching failed', { 
      requestId, 
      processingTime,
      criteria: { organizationType, fundingAmount, keywords: keywords?.length }
    }, error)
    throw error
  }
})