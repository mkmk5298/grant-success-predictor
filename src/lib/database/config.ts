/**
 * Database Configuration
 * L10 Distinguished Engineer Architecture
 * Production-ready database setup with connection pooling
 */

export const databaseConfig = {
  // PostgreSQL configuration (recommended for production)
  postgres: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'grant_predictor',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    
    // Connection pool settings
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  },
  
  // MongoDB configuration (alternative)
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/grant_predictor',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    }
  },
  
  // SQLite configuration (for development/testing)
  sqlite: {
    filename: process.env.SQLITE_FILE || './database.sqlite',
    options: {
      memory: process.env.NODE_ENV === 'test',
    }
  },
  
  // Redis configuration (for caching/sessions)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    ttl: 3600, // 1 hour default TTL
  }
};

// Database type selection
export const DATABASE_TYPE = process.env.DATABASE_TYPE as 'postgres' | 'mongodb' | 'sqlite' || 'postgres';

// Connection string builder
export function getConnectionString(): string {
  switch (DATABASE_TYPE) {
    case 'postgres':
      const { host, port, database, user, password } = databaseConfig.postgres;
      return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    
    case 'mongodb':
      return databaseConfig.mongodb.uri;
    
    case 'sqlite':
      return databaseConfig.sqlite.filename;
    
    default:
      throw new Error(`Unsupported database type: ${DATABASE_TYPE}`);
  }
}

// Environment validation
export function validateDatabaseConfig(): void {
  const required = ['DATABASE_TYPE'];
  
  if (DATABASE_TYPE === 'postgres') {
    required.push('DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER');
  } else if (DATABASE_TYPE === 'mongodb') {
    required.push('MONGODB_URI');
  }
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing database environment variables: ${missing.join(', ')}`);
  }
}