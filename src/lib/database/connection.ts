/**
 * Database Connection Manager
 * Handles connection pooling and error recovery
 */

import { Pool } from 'pg';
import { MongoClient, Db } from 'mongodb';
import Database from 'better-sqlite3';
import Redis from 'ioredis';
import { databaseConfig, DATABASE_TYPE, getConnectionString, validateDatabaseConfig } from './config';

// Singleton instances
let pgPool: Pool | null = null;
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let sqliteDb: Database.Database | null = null;
let redisClient: Redis | null = null;

// Export DATABASE_TYPE
export { DATABASE_TYPE } from './config';

// Connection status
export const connectionStatus = {
  isConnected: false,
  lastError: null as Error | null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

/**
 * PostgreSQL Connection
 */
export async function getPostgresConnection(): Promise<Pool> {
  if (!pgPool) {
    try {
      pgPool = new Pool({
        connectionString: getConnectionString(),
        ...databaseConfig.postgres.pool,
      });
      
      // Test connection
      await pgPool.query('SELECT NOW()');
      connectionStatus.isConnected = true;
      console.log('✅ PostgreSQL connected successfully');
    } catch (error) {
      connectionStatus.lastError = error as Error;
      console.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }
  
  return pgPool;
}

/**
 * MongoDB Connection
 */
export async function getMongoConnection(): Promise<Db> {
  if (!mongoClient || !mongoDb) {
    try {
      mongoClient = new MongoClient(databaseConfig.mongodb.uri, databaseConfig.mongodb.options);
      await mongoClient.connect();
      
      const dbName = databaseConfig.mongodb.uri.split('/').pop()?.split('?')[0] || 'grant_predictor';
      mongoDb = mongoClient.db(dbName);
      
      // Test connection
      await mongoDb.admin().ping();
      connectionStatus.isConnected = true;
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      connectionStatus.lastError = error as Error;
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }
  
  return mongoDb;
}

/**
 * SQLite Connection
 */
export function getSQLiteConnection(): Database.Database {
  if (!sqliteDb) {
    try {
      const options = databaseConfig.sqlite.options.memory 
        ? ':memory:' 
        : databaseConfig.sqlite.filename;
      
      sqliteDb = new Database(options);
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');
      
      connectionStatus.isConnected = true;
      console.log('✅ SQLite connected successfully');
    } catch (error) {
      connectionStatus.lastError = error as Error;
      console.error('❌ SQLite connection failed:', error);
      throw error;
    }
  }
  
  return sqliteDb;
}

/**
 * Redis Connection
 */
export async function getRedisConnection(): Promise<Redis> {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: databaseConfig.redis.host,
        port: databaseConfig.redis.port,
        password: databaseConfig.redis.password,
        db: databaseConfig.redis.db,
        retryStrategy: (times) => {
          if (times > connectionStatus.maxReconnectAttempts) {
            return null;
          }
          return Math.min(times * 50, 2000);
        },
      });
      
      await redisClient.ping();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️ Redis connection failed (optional):', error);
      // Redis is optional, don't throw
    }
  }
  
  return redisClient as Redis;
}

/**
 * Get active database connection based on configuration
 */
export async function getDatabaseConnection(): Promise<any> {
  validateDatabaseConfig();
  
  switch (DATABASE_TYPE) {
    case 'postgres':
      return await getPostgresConnection();
    case 'mongodb':
      return await getMongoConnection();
    case 'sqlite':
      return getSQLiteConnection();
    default:
      throw new Error(`Unsupported database type: ${DATABASE_TYPE}`);
  }
}

/**
 * Close all database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (pgPool) {
    promises.push(pgPool.end().then(() => {
      pgPool = null;
      console.log('PostgreSQL connection closed');
    }));
  }
  
  if (mongoClient) {
    promises.push(mongoClient.close().then(() => {
      mongoClient = null;
      mongoDb = null;
      console.log('MongoDB connection closed');
    }));
  }
  
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    console.log('SQLite connection closed');
  }
  
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
    console.log('Redis connection closed');
  }
  
  await Promise.all(promises);
  connectionStatus.isConnected = false;
}

/**
 * Health check for database connections
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  database: string;
  status: string;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const connection = await getDatabaseConnection();
    
    // Test query based on database type
    if (DATABASE_TYPE === 'postgres') {
      await (connection as Pool).query('SELECT 1');
    } else if (DATABASE_TYPE === 'mongodb') {
      await (connection as Db).admin().ping();
    } else if (DATABASE_TYPE === 'sqlite') {
      (connection as Database.Database).prepare('SELECT 1').get();
    }
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      database: DATABASE_TYPE,
      status: 'connected',
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      database: DATABASE_TYPE,
      status: 'error',
      error: (error as Error).message,
    };
  }
}

/**
 * Transaction wrapper for database operations
 */
export async function withTransaction<T>(
  callback: (connection: any) => Promise<T>
): Promise<T> {
  const connection = await getDatabaseConnection();
  
  if (DATABASE_TYPE === 'postgres') {
    const client = await (connection as Pool).connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else if (DATABASE_TYPE === 'mongodb') {
    // MongoDB transactions require access to client
    if (!mongoClient) {
      await getMongoConnection();
    }
    const session = mongoClient!.startSession();
    try {
      const result = await session.withTransaction(() => callback(connection));
      return result as T;
    } finally {
      await session.endSession();
    }
  } else {
    // SQLite doesn't support async transactions in the same way
    return await callback(connection);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});