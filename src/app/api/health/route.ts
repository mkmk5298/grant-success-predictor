import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  responseTime?: number
}

async function checkOpenAI(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        service: 'OpenAI',
        status: 'degraded',
        message: 'API key not configured'
      }
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })

    const responseTime = Date.now() - start

    if (response.ok) {
      return {
        service: 'OpenAI',
        status: 'healthy',
        message: 'API accessible',
        responseTime
      }
    } else {
      return {
        service: 'OpenAI',
        status: 'unhealthy',
        message: `API error: ${response.status} ${response.statusText}`,
        responseTime
      }
    }
  } catch (error) {
    const responseTime = Date.now() - start
    return {
      service: 'OpenAI',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime
    }
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  try {
    if (!process.env.DATABASE_URL) {
      return {
        service: 'Database',
        status: 'degraded',
        message: 'Connection string not configured'
      }
    }

    // For now, just check if the URL is present
    // In production, you would actually test the connection
    const responseTime = Date.now() - start
    
    return {
      service: 'Database',
      status: 'degraded',
      message: 'Connection configured but not tested',
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - start
    return {
      service: 'Database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime
    }
  }
}

async function checkStripe(): Promise<HealthCheckResult> {
  const start = Date.now()
  
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        service: 'Stripe',
        status: 'degraded',
        message: 'API key not configured'
      }
    }

    // Simple configuration check for now
    const responseTime = Date.now() - start
    const isTestKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
    
    return {
      service: 'Stripe',
      status: 'healthy',
      message: isTestKey ? 'Test API key configured' : 'Live API key configured',
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - start
    return {
      service: 'Stripe',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Configuration error',
      responseTime
    }
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const overallStart = Date.now()
  
  logger.info('Health check requested', { requestId })
  
  try {
    // Run all health checks in parallel
    const [openaiResult, databaseResult, stripeResult] = await Promise.all([
      checkOpenAI(),
      checkDatabase(),
      checkStripe()
    ])
    
    const overallTime = Date.now() - overallStart
    const allServices = [openaiResult, databaseResult, stripeResult]
    const healthyServices = allServices.filter(s => s.status === 'healthy').length
    const degradedServices = allServices.filter(s => s.status === 'degraded').length
    const unhealthyServices = allServices.filter(s => s.status === 'unhealthy').length
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedServices > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: overallTime,
      services: {
        openai: openaiResult,
        database: databaseResult,
        stripe: stripeResult
      },
      summary: {
        total: allServices.length,
        healthy: healthyServices,
        degraded: degradedServices,
        unhealthy: unhealthyServices
      }
    }
    
    logger.info('Health check completed', {
      requestId,
      overallStatus,
      responseTime: overallTime,
      healthy: healthyServices,
      degraded: degradedServices,
      unhealthy: unhealthyServices
    })
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(response, { status: httpStatus })
    
  } catch (error) {
    const overallTime = Date.now() - overallStart
    
    logger.error('Health check failed', { 
      requestId, 
      responseTime: overallTime 
    }, error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: overallTime
    }, { status: 503 })
  }
}