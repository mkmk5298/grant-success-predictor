// CockroachDB Database utilities for Grant Predictor
// This file provides database connection and operations for production use

import { Client } from 'pg'

let db: Client | null = null

export async function connectToDatabase() {
  if (db) {
    return db
  }

  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('DATABASE_URL not configured, using in-memory storage')
    }
    return null
  }

  try {
    db = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'development' 
        ? { rejectUnauthorized: false }
        : { rejectUnauthorized: true }
    })
    
    await db.connect()
    // Database connected - log only in development
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Connected to CockroachDB successfully')
      }
    }
    
    // Initialize tables if they don't exist
    await initializeTables()
    
    return db
  } catch (error) {
    // Always log connection errors as they're critical
    console.error('Database connection failed:', error)
    return null
  }
}

async function initializeTables() {
  if (!db) return

  try {
    // Grants table - matching Python schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS grants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        agency VARCHAR(255),
        amount_min DECIMAL(15,2),
        amount_max DECIMAL(15,2),
        deadline DATE,
        description TEXT,
        category VARCHAR(100),
        keywords TEXT,
        eligibility TEXT,
        source VARCHAR(50),
        url VARCHAR(500),
        success_rate DECIMAL(5,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Applications table - matching Python schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email VARCHAR(255),
        organization_name VARCHAR(255),
        grant_id UUID REFERENCES grants(id),
        proposal_file_name VARCHAR(255),
        proposal_text TEXT,
        success_probability DECIMAL(5,2),
        match_score DECIMAL(5,2),
        strengths TEXT,
        weaknesses TEXT,
        recommendations TEXT,
        ai_analysis JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Analysis history table - matching Python schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID REFERENCES applications(id),
        openai_tokens_used INTEGER,
        analysis_cost DECIMAL(10,4),
        processing_time_seconds DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Users table for authentication - Enhanced schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        google_id VARCHAR(255) UNIQUE,
        picture VARCHAR(500),
        organization_name VARCHAR(255),
        organization_type VARCHAR(100),
        subscription_status VARCHAR(50) DEFAULT 'free',
        subscription_end TIMESTAMPTZ,
        profile_data JSONB,
        total_analyses INTEGER DEFAULT 0,
        monthly_analyses INTEGER DEFAULT 0,
        last_analysis TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Predictions table for analytics
    await db.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        organization_name VARCHAR(255) NOT NULL,
        organization_type VARCHAR(100) NOT NULL,
        funding_amount INT NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        has_partnership BOOL DEFAULT FALSE,
        has_previous_grants BOOL DEFAULT FALSE,
        success_probability INT NOT NULL,
        confidence VARCHAR(20) NOT NULL,
        ai_enhanced BOOL DEFAULT FALSE,
        recommendations JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Subscriptions table for payment tracking
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User upload tracking for 2-upload limit
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        session_id VARCHAR(255),
        ip_address VARCHAR(45),
        upload_count INTEGER DEFAULT 0,
        first_upload_at TIMESTAMPTZ,
        last_upload_at TIMESTAMPTZ,
        subscription_status VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Upload history for detailed tracking
    await db.query(`
      CREATE TABLE IF NOT EXISTS upload_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        session_id VARCHAR(255),
        file_name VARCHAR(255),
        analysis_completed BOOLEAN DEFAULT FALSE,
        credits_used INTEGER DEFAULT 1,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Analytics tracking for conversion metrics
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        session_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Database tables initialized - log only in development
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database tables initialized successfully')
      }
    }
  } catch (error) {
    // Always log critical initialization errors
    console.error('Table initialization failed:', error)
  }
}

// User operations
export async function createUser(userData: {
  email: string
  name: string
  googleId?: string
  picture?: string
  organizationName?: string
  organizationType?: string
}) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const result = await database.query(
      `INSERT INTO users (email, name, google_id, picture, organization_name, organization_type) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (email) DO UPDATE SET 
         name = $2, google_id = $3, picture = $4, organization_name = $5, organization_type = $6, updated_at = NOW()
       RETURNING *`,
      [userData.email, userData.name, userData.googleId, userData.picture, userData.organizationName, userData.organizationType]
    )
    return result.rows[0]
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create user:', error)
    }
    return null
  }
}

export async function getUserByEmail(email: string) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const result = await database.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return result.rows[0] || null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get user:', error)
    }
    return null
  }
}

export async function updateUserProfile(email: string, updates: {
  organizationName?: string
  organizationType?: string
  profileData?: any
  subscriptionStatus?: string
  subscriptionEnd?: Date
}) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const setClauses = []
    const values = []
    let paramCount = 0

    if (updates.organizationName !== undefined) {
      paramCount++
      setClauses.push(`organization_name = $${paramCount}`)
      values.push(updates.organizationName)
    }

    if (updates.organizationType !== undefined) {
      paramCount++
      setClauses.push(`organization_type = $${paramCount}`)
      values.push(updates.organizationType)
    }

    if (updates.profileData !== undefined) {
      paramCount++
      setClauses.push(`profile_data = $${paramCount}`)
      values.push(JSON.stringify(updates.profileData))
    }

    if (updates.subscriptionStatus !== undefined) {
      paramCount++
      setClauses.push(`subscription_status = $${paramCount}`)
      values.push(updates.subscriptionStatus)
    }

    if (updates.subscriptionEnd !== undefined) {
      paramCount++
      setClauses.push(`subscription_end = $${paramCount}`)
      values.push(updates.subscriptionEnd)
    }

    if (setClauses.length === 0) {
      return await getUserByEmail(email) // No updates, return current user
    }

    paramCount++
    setClauses.push(`updated_at = NOW()`)
    values.push(email)

    const query = `
      UPDATE users 
      SET ${setClauses.join(', ')}
      WHERE email = $${paramCount}
      RETURNING *
    `

    const result = await database.query(query, values)
    return result.rows[0] || null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to update user profile:', error)
    }
    return null
  }
}

export async function updateUserUsage(email: string, incrementAnalyses: boolean = true) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const result = await database.query(`
      UPDATE users 
      SET 
        total_analyses = total_analyses + $1,
        monthly_analyses = monthly_analyses + $1,
        last_analysis = NOW(),
        updated_at = NOW()
      WHERE email = $2
      RETURNING *
    `, [incrementAnalyses ? 1 : 0, email])
    
    return result.rows[0] || null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to update user usage:', error)
    }
    return null
  }
}

// Prediction operations
export async function storePrediction(predictionData: {
  userId?: string
  organizationName: string
  organizationType: string
  fundingAmount: number
  experienceLevel: string
  hasPartnership: boolean
  hasPreviousGrants: boolean
  successProbability: number
  confidence: string
  aiEnhanced: boolean
  recommendations: string[]
}) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const result = await database.query(
      `INSERT INTO predictions (
        user_id, organization_name, organization_type, funding_amount,
        experience_level, has_partnership, has_previous_grants,
        success_probability, confidence, ai_enhanced, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        predictionData.userId || null,
        predictionData.organizationName,
        predictionData.organizationType,
        predictionData.fundingAmount,
        predictionData.experienceLevel,
        predictionData.hasPartnership,
        predictionData.hasPreviousGrants,
        predictionData.successProbability,
        predictionData.confidence,
        predictionData.aiEnhanced,
        JSON.stringify(predictionData.recommendations)
      ]
    )
    return result.rows[0]
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to store prediction:', error)
    }
    return null
  }
}

// Subscription operations
export async function createSubscription(subscriptionData: {
  userId: string
  stripeSubscriptionId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
}) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const result = await database.query(
      `INSERT INTO subscriptions (
        user_id, stripe_subscription_id, status,
        current_period_start, current_period_end
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        subscriptionData.userId,
        subscriptionData.stripeSubscriptionId,
        subscriptionData.status,
        subscriptionData.currentPeriodStart,
        subscriptionData.currentPeriodEnd
      ]
    )
    return result.rows[0]
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create subscription:', error)
    }
    return null
  }
}

// Analytics operations
export async function getAnalytics() {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const totalUsers = await database.query('SELECT COUNT(*) as count FROM users')
    const totalPredictions = await database.query('SELECT COUNT(*) as count FROM predictions')
    const avgSuccessRate = await database.query(
      'SELECT AVG(success_probability) as avg FROM predictions'
    )
    const topOrgTypes = await database.query(`
      SELECT organization_type, COUNT(*) as count 
      FROM predictions 
      GROUP BY organization_type 
      ORDER BY count DESC 
      LIMIT 5
    `)

    return {
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalPredictions: parseInt(totalPredictions.rows[0].count),
      avgSuccessRate: Math.round(parseFloat(avgSuccessRate.rows[0].avg || 0)),
      topOrgTypes: topOrgTypes.rows
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get analytics:', error)
    }
    return null
  }
}

// Upload tracking operations
export async function getUploadCount(userId?: string, sessionId?: string, ipAddress?: string) {
  const database = await connectToDatabase()
  if (!database) return 0

  try {
    let query, params
    
    if (userId) {
      query = 'SELECT upload_count FROM user_uploads WHERE user_id = $1'
      params = [userId]
    } else {
      query = 'SELECT upload_count FROM user_uploads WHERE session_id = $1 OR ip_address = $2'
      params = [sessionId, ipAddress]
    }

    const result = await database.query(query, params)
    return result.rows[0]?.upload_count || 0
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get upload count:', error)
    }
    return 0
  }
}

export async function incrementUploadCount(userId?: string, sessionId?: string, ipAddress?: string, fileName?: string) {
  const database = await connectToDatabase()
  if (!database) return false

  try {
    await database.query('BEGIN')

    // Update or insert upload tracking
    if (userId) {
      await database.query(`
        INSERT INTO user_uploads (user_id, session_id, ip_address, upload_count, first_upload_at, last_upload_at)
        VALUES ($1, $2, $3, 1, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          upload_count = user_uploads.upload_count + 1,
          last_upload_at = NOW(),
          session_id = COALESCE(user_uploads.session_id, $2),
          ip_address = COALESCE(user_uploads.ip_address, $3)
      `, [userId, sessionId, ipAddress])
    } else {
      await database.query(`
        INSERT INTO user_uploads (session_id, ip_address, upload_count, first_upload_at, last_upload_at)
        VALUES ($1, $2, 1, NOW(), NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          upload_count = user_uploads.upload_count + 1,
          last_upload_at = NOW(),
          ip_address = COALESCE(user_uploads.ip_address, $2)
      `, [sessionId, ipAddress])
    }

    // Record upload history
    await database.query(`
      INSERT INTO upload_history (user_id, session_id, file_name, analysis_completed, credits_used)
      VALUES ($1, $2, $3, FALSE, 1)
    `, [userId, sessionId, fileName])

    await database.query('COMMIT')
    return true
  } catch (error) {
    await database.query('ROLLBACK')
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to increment upload count:', error)
    }
    return false
  }
}

export async function hasActiveSubscription(userId: string) {
  const database = await connectToDatabase()
  if (!database) return false

  try {
    const result = await database.query(`
      SELECT s.* FROM subscriptions s 
      JOIN users u ON s.user_id = u.id 
      WHERE u.id = $1 AND s.status = 'active' AND s.current_period_end > NOW()
    `, [userId])

    return result.rows.length > 0
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to check subscription:', error)
    }
    return false
  }
}

export async function trackAnalyticsEvent(eventType: string, userId?: string, sessionId?: string, eventData?: any) {
  const database = await connectToDatabase()
  if (!database) return

  try {
    await database.query(`
      INSERT INTO analytics_events (user_id, session_id, event_type, event_data)
      VALUES ($1, $2, $3, $4)
    `, [userId, sessionId, eventType, eventData ? JSON.stringify(eventData) : null])
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to track analytics event:', error)
    }
  }
}

// Close database connection
export async function closeDatabase() {
  if (db) {
    await db.end()
    db = null
    // Database connection closed - log only in development
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database connection closed')
      }
    }
  }
}