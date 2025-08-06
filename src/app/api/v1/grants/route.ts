import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/database'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const minAmount = searchParams.get('min_amount')
    const maxAmount = searchParams.get('max_amount')
    const search = searchParams.get('search')
    
    // Try to fetch from database first
    const db = await connectToDatabase()
    if (db) {
      try {
        let query = 'SELECT * FROM grants WHERE 1=1'
        const params: any[] = []
        let paramCount = 0

        if (category) {
          paramCount++
          query += ` AND category ILIKE $${paramCount}`
          params.push(`%${category}%`)
        }

        if (minAmount) {
          paramCount++
          query += ` AND amount_max >= $${paramCount}`
          params.push(minAmount)
        }

        if (maxAmount) {
          paramCount++
          query += ` AND amount_min <= $${paramCount}`
          params.push(maxAmount)
        }

        if (search) {
          paramCount++
          query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR keywords ILIKE $${paramCount})`
          params.push(`%${search}%`)
        }

        query += ' ORDER BY success_rate DESC, created_at DESC LIMIT 100'

        const result = await db.query(query, params)
        
        if (result.rows.length > 0) {
          return NextResponse.json({
            success: true,
            grants: result.rows.map(row => ({
              id: row.id,
              title: row.title,
              agency: row.agency,
              amount: `$${row.amount_min} - $${row.amount_max}`,
              amount_min: row.amount_min,
              amount_max: row.amount_max,
              deadline: row.deadline,
              category: row.category,
              eligibility: row.eligibility ? row.eligibility.split(',') : [],
              description: row.description,
              keywords: row.keywords ? row.keywords.split(',') : [],
              success_rate: row.success_rate,
              match_score: row.success_rate // Use success_rate as initial match_score
            })),
            total: result.rows.length,
            source: 'database'
          })
        }
      } catch (dbError) {
        console.error('Database query error:', dbError)
        // Fall through to use mock data
      }
    }
    
    // Fallback to mock data if database is not available or empty
    let filteredGrants = [...mockGrants]
    
    // Filter by category
    if (category) {
      filteredGrants = filteredGrants.filter(grant => 
        grant.category.toLowerCase().includes(category.toLowerCase())
      )
    }
    
    // Filter by amount range
    if (minAmount) {
      filteredGrants = filteredGrants.filter(grant => 
        grant.amount >= parseInt(minAmount)
      )
    }
    
    if (maxAmount) {
      filteredGrants = filteredGrants.filter(grant => 
        grant.amount <= parseInt(maxAmount)
      )
    }
    
    // Search in title, description, and keywords
    if (search) {
      const searchLower = search.toLowerCase()
      filteredGrants = filteredGrants.filter(grant => 
        grant.title.toLowerCase().includes(searchLower) ||
        grant.description.toLowerCase().includes(searchLower) ||
        grant.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
      )
    }
    
    // Sort by match score (highest first)
    filteredGrants.sort((a, b) => b.match_score - a.match_score)
    
    return NextResponse.json({
      success: true,
      grants: filteredGrants,
      total: filteredGrants.length,
      filters_applied: {
        category,
        min_amount: minAmount,
        max_amount: maxAmount,
        search
      }
    })
    
  } catch (error) {
    console.error('Grants API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationType, fundingAmount, keywords } = await request.json()
    
    // Mock matching algorithm
    let matchedGrants = [...mockGrants]
    
    // Filter by organization eligibility
    if (organizationType) {
      matchedGrants = matchedGrants.filter(grant => 
        grant.eligibility.some(eligible => 
          eligible.toLowerCase().includes(organizationType.toLowerCase())
        )
      )
    }
    
    // Adjust match scores based on funding amount proximity
    if (fundingAmount) {
      matchedGrants = matchedGrants.map(grant => ({
        ...grant,
        match_score: Math.max(0, grant.match_score - Math.abs(grant.amount - fundingAmount) / 10000)
      }))
    }
    
    // Boost scores for keyword matches
    if (keywords && keywords.length > 0) {
      matchedGrants = matchedGrants.map(grant => {
        const keywordMatches = keywords.filter((keyword: string) =>
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
    
    return NextResponse.json({
      success: true,
      matched_grants: matchedGrants,
      total_matches: matchedGrants.length,
      matching_criteria: {
        organizationType,
        fundingAmount,
        keywords
      }
    })
    
  } catch (error) {
    console.error('Grant matching error:', error)
    return NextResponse.json(
      { error: 'Grant matching failed' },
      { status: 500 }
    )
  }
}