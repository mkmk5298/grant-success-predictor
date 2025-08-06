// CockroachDB Database utilities for Grant Predictor
// This file provides database connection and operations for production use

import { Client } from 'pg'

let db: Client | null = null

export async function connectToDatabase() {
  if (db) {
    return db
  }

  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not configured, using in-memory storage')
    return null
  }

  try {
    db = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })
    
    await db.connect()
    console.log('Connected to CockroachDB successfully')
    
    // Initialize tables if they don't exist
    await initializeTables()
    
    return db
  } catch (error) {
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

    // Users table for authentication
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        google_id VARCHAR(255) UNIQUE,
        picture VARCHAR(500),
        subscription_status VARCHAR(50) DEFAULT 'free',
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

    console.log('Database tables initialized successfully')
  } catch (error) {
    console.error('Table initialization failed:', error)
  }
}

// User operations
export async function createUser(userData: {
  email: string
  name: string
  googleId?: string
  picture?: string
}) {
  const database = await connectToDatabase()
  if (!database) return null

  try {
    const result = await database.query(
      `INSERT INTO users (email, name, google_id, picture) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET 
         name = $2, google_id = $3, picture = $4, updated_at = NOW()
       RETURNING *`,
      [userData.email, userData.name, userData.googleId, userData.picture]
    )
    return result.rows[0]
  } catch (error) {
    console.error('Failed to create user:', error)
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
    console.error('Failed to get user:', error)
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
    console.error('Failed to store prediction:', error)
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
    console.error('Failed to create subscription:', error)
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
    console.error('Failed to get analytics:', error)
    return null
  }
}

// Close database connection
export async function closeDatabase() {
  if (db) {
    await db.end()
    db = null
    console.log('Database connection closed')
  }
}