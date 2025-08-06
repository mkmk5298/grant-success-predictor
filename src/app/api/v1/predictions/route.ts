import { NextRequest, NextResponse } from 'next/server'
import { storePrediction } from '@/lib/database'

async function getOpenAIPrediction(data: any) {
  const openaiKey = process.env.OPENAI_API_KEY
  
  if (!openaiKey) {
    return null
  }

  try {
    const prompt = `As a grant expert, analyze this organization profile and predict their grant success probability:

Organization: ${data.organizationName}
Type: ${data.organizationType}
Funding Amount: $${data.fundingAmount}
Experience: ${data.experienceLevel}
Has Partnerships: ${data.hasPartnership ? 'Yes' : 'No'}
Previous Grants: ${data.hasPreviousGrants ? 'Yes' : 'No'}

Provide a realistic success probability (25-95%) and 4 specific, actionable recommendations in JSON format:
{
  "successProbability": number,
  "confidence": "high|medium|low",
  "recommendations": [string, string, string, string]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert grant consultant with 20+ years of experience helping organizations secure funding.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    const result = await response.json()
    
    if (result.choices?.[0]?.message?.content) {
      try {
        return JSON.parse(result.choices[0].message.content)
      } catch (parseError) {
        console.error('OpenAI response parsing error:', parseError)
        return null
      }
    }
    
    return null
  } catch (error) {
    console.error('OpenAI API error:', error)
    return null
  }
}

function calculateFallbackProbability(data: any): number {
  let probability = 65 // Base probability
  
  // Adjust based on organization type
  if (data.organizationType === 'university') probability += 10
  if (data.organizationType === 'nonprofit') probability += 8
  if (data.organizationType === 'startup') probability += 5
  
  // Adjust based on experience
  if (data.experienceLevel === 'expert') probability += 15
  if (data.experienceLevel === 'intermediate') probability += 8
  
  // Adjust based on other factors
  if (data.hasPartnership) probability += 7
  if (data.hasPreviousGrants) probability += 12
  
  // Adjust based on funding amount (smaller amounts = higher success rate)
  if (data.fundingAmount < 50000) probability += 10
  else if (data.fundingAmount < 200000) probability += 5
  else if (data.fundingAmount > 500000) probability -= 8
  
  // Cap at realistic ranges
  return Math.min(Math.max(probability, 25), 95)
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const {
      organizationName,
      organizationType,
      fundingAmount,
      experienceLevel,
      hasPartnership,
      hasPreviousGrants
    } = data
    
    if (!organizationName || !organizationType || !experienceLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Try OpenAI prediction first
    const openaiPrediction = await getOpenAIPrediction(data)
    
    let prediction
    if (openaiPrediction) {
      prediction = {
        successProbability: openaiPrediction.successProbability,
        confidence: openaiPrediction.confidence || 'high',
        aiEnhanced: true,
        factors: {
          organizationType,
          experienceLevel,
          fundingAmount,
          hasPartnership,
          hasPreviousGrants
        },
        recommendations: openaiPrediction.recommendations || [
          'Strengthen project narrative with specific impact metrics',
          'Build strategic partnerships in your field',
          'Prepare detailed budget justification',
          'Gather letters of support from key stakeholders'
        ]
      }
    } else {
      // Fallback to algorithmic calculation
      prediction = {
        successProbability: calculateFallbackProbability(data),
        confidence: 'medium',
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
          'Prepare detailed budget justification',
          'Gather letters of support from key stakeholders'
        ]
      }
    }

    // Store prediction in CockroachDB for analytics
    try {
      await storePrediction({
        organizationName: data.organizationName,
        organizationType: data.organizationType,
        fundingAmount: data.fundingAmount,
        experienceLevel: data.experienceLevel,
        hasPartnership: data.hasPartnership,
        hasPreviousGrants: data.hasPreviousGrants,
        successProbability: prediction.successProbability,
        confidence: prediction.confidence,
        aiEnhanced: prediction.aiEnhanced,
        recommendations: prediction.recommendations
      })
    } catch (dbError) {
      console.error('Database storage failed:', dbError)
      // Continue without failing the request
    }
    
    const response = {
      success: true,
      prediction,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      { error: 'Prediction failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Grant Predictor AI Prediction API',
    version: '1.0',
    endpoints: {
      'POST /api/v1/predictions': 'Generate grant success predictions',
      'POST /api/v1/auth/google': 'Google OAuth authentication',
      'POST /api/v1/payments/create-subscription': 'Create Stripe subscription'
    }
  })
}