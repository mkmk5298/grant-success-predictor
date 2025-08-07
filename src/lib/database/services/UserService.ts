/**
 * User Service
 * Handles all user-related database operations
 */

import { User, Session, Account } from '../models';
import { getDatabaseConnection, DATABASE_TYPE, withTransaction } from '../connection';
import { Pool } from 'pg';
import { Db } from 'mongodb';
import Database from 'better-sqlite3';
import crypto from 'crypto';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(data: Partial<User>): Promise<User> {
    const userId = crypto.randomUUID();
    const now = new Date();
    
    const user: User = {
      id: userId,
      email: data.email!,
      name: data.name || null,
      picture: data.picture || null,
      googleId: data.googleId || null,
      emailVerified: data.emailVerified || false,
      subscriptionStatus: 'free',
      subscriptionId: null,
      subscriptionEndDate: null,
      stripeCustomerId: null,
      uploadsUsed: 0,
      uploadsLimit: 2, // Free tier limit
      lastUploadDate: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      loginCount: 1,
    };
    
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const query = `
        INSERT INTO users (
          id, email, name, picture, google_id, email_verified,
          subscription_status, subscription_id, subscription_end_date,
          stripe_customer_id, uploads_used, uploads_limit,
          last_upload_date, created_at, updated_at, last_login_at, login_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
      
      const values = [
        user.id, user.email, user.name, user.picture, user.googleId,
        user.emailVerified, user.subscriptionStatus, user.subscriptionId,
        user.subscriptionEndDate, user.stripeCustomerId, user.uploadsUsed,
        user.uploadsLimit, user.lastUploadDate, user.createdAt,
        user.updatedAt, user.lastLoginAt, user.loginCount
      ];
      
      const result = await (db as Pool).query(query, values);
      return this.mapRowToUser(result.rows[0]);
    } else if (DATABASE_TYPE === 'mongodb') {
      await (db as Db).collection('users').insertOne(user);
      return user;
    } else {
      // SQLite
      const stmt = (db as Database.Database).prepare(`
        INSERT INTO users (
          id, email, name, picture, google_id, email_verified,
          subscription_status, subscription_id, subscription_end_date,
          stripe_customer_id, uploads_used, uploads_limit,
          last_upload_date, created_at, updated_at, last_login_at, login_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        user.id, user.email, user.name, user.picture, user.googleId,
        user.emailVerified ? 1 : 0, user.subscriptionStatus, user.subscriptionId,
        user.subscriptionEndDate?.toISOString(), user.stripeCustomerId,
        user.uploadsUsed, user.uploadsLimit, user.lastUploadDate?.toISOString(),
        user.createdAt.toISOString(), user.updatedAt.toISOString(),
        user.lastLoginAt?.toISOString(), user.loginCount
      );
      
      return user;
    }
  }
  
  /**
   * Find user by ID
   */
  static async findById(userId: string): Promise<User | null> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } else if (DATABASE_TYPE === 'mongodb') {
      const user = await (db as Db).collection('users').findOne({ id: userId });
      return user as unknown as User | null;
    } else {
      const stmt = (db as Database.Database).prepare('SELECT * FROM users WHERE id = ?');
      const row = stmt.get(userId);
      return row ? this.mapRowToUser(row) : null;
    }
  }
  
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } else if (DATABASE_TYPE === 'mongodb') {
      const user = await (db as Db).collection('users').findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
      return user as unknown as User | null;
    } else {
      const stmt = (db as Database.Database).prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
      const row = stmt.get(email);
      return row ? this.mapRowToUser(row) : null;
    }
  }
  
  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } else if (DATABASE_TYPE === 'mongodb') {
      const user = await (db as Db).collection('users').findOne({ googleId });
      return user as unknown as User | null;
    } else {
      const stmt = (db as Database.Database).prepare('SELECT * FROM users WHERE google_id = ?');
      const row = stmt.get(googleId);
      return row ? this.mapRowToUser(row) : null;
    }
  }
  
  /**
   * Update user
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const db = await getDatabaseConnection();
    updates.updatedAt = new Date();
    
    if (DATABASE_TYPE === 'postgres') {
      const fields = Object.keys(updates)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = [userId, ...Object.values(updates)];
      
      const result = await (db as Pool).query(
        `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`,
        values
      );
      
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } else if (DATABASE_TYPE === 'mongodb') {
      await (db as Db).collection('users').updateOne(
        { id: userId },
        { $set: updates }
      );
      return this.findById(userId);
    } else {
      const fields = Object.keys(updates)
        .map(key => `${this.camelToSnake(key)} = ?`)
        .join(', ');
      
      const values = [...Object.values(updates), userId];
      
      const stmt = (db as Database.Database).prepare(
        `UPDATE users SET ${fields} WHERE id = ?`
      );
      stmt.run(...values);
      
      return this.findById(userId);
    }
  }
  
  /**
   * Update login timestamp
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await this.updateUser(userId, {
      lastLoginAt: new Date(),
      loginCount: await this.incrementLoginCount(userId),
    });
  }
  
  /**
   * Increment login count
   */
  private static async incrementLoginCount(userId: string): Promise<number> {
    const user = await this.findById(userId);
    return (user?.loginCount || 0) + 1;
  }
  
  /**
   * Update subscription status
   */
  static async updateSubscription(
    userId: string,
    subscriptionId: string,
    status: User['subscriptionStatus'],
    endDate?: Date
  ): Promise<void> {
    await this.updateUser(userId, {
      subscriptionId,
      subscriptionStatus: status,
      subscriptionEndDate: endDate || null,
      uploadsLimit: status === 'active' ? 999999 : 2, // Unlimited for paid users
    });
  }
  
  /**
   * Track upload usage
   */
  static async trackUpload(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const allowed = user.uploadsUsed < user.uploadsLimit;
    
    if (allowed) {
      await this.updateUser(userId, {
        uploadsUsed: user.uploadsUsed + 1,
        lastUploadDate: new Date(),
      });
    }
    
    return {
      allowed,
      remaining: Math.max(0, user.uploadsLimit - user.uploadsUsed - 1),
    };
  }
  
  /**
   * Reset upload counter (monthly reset for free users)
   */
  static async resetUploadCounter(userId: string): Promise<void> {
    await this.updateUser(userId, {
      uploadsUsed: 0,
    });
  }
  
  /**
   * Delete user (GDPR compliance)
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'DELETE FROM users WHERE id = $1',
        [userId]
      );
      return (result.rowCount || 0) > 0;
    } else if (DATABASE_TYPE === 'mongodb') {
      const result = await (db as Db).collection('users').deleteOne({ id: userId });
      return result.deletedCount > 0;
    } else {
      const stmt = (db as Database.Database).prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(userId);
      return result.changes > 0;
    }
  }
  
  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    paidUsers: number;
    totalUploads: number;
  }> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
          COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paid_users,
          SUM(uploads_used) as total_uploads
        FROM users
      `);
      
      return {
        totalUsers: parseInt(result.rows[0].total_users),
        activeUsers: parseInt(result.rows[0].active_users),
        paidUsers: parseInt(result.rows[0].paid_users),
        totalUploads: parseInt(result.rows[0].total_uploads) || 0,
      };
    } else if (DATABASE_TYPE === 'mongodb') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [stats] = await (db as Db).collection('users').aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $gte: ['$lastLoginAt', thirtyDaysAgo] }, 1, 0]
              }
            },
            paidUsers: {
              $sum: {
                $cond: [{ $eq: ['$subscriptionStatus', 'active'] }, 1, 0]
              }
            },
            totalUploads: { $sum: '$uploadsUsed' },
          }
        }
      ]).toArray();
      
      return {
        totalUsers: stats?.totalUsers || 0,
        activeUsers: stats?.activeUsers || 0,
        paidUsers: stats?.paidUsers || 0,
        totalUploads: stats?.totalUploads || 0,
      };
    } else {
      // SQLite
      const stmt = (db as Database.Database).prepare(`
        SELECT 
          COUNT(*) as totalUsers,
          COUNT(CASE WHEN datetime(last_login_at) > datetime('now', '-30 days') THEN 1 END) as activeUsers,
          COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paidUsers,
          SUM(uploads_used) as totalUploads
        FROM users
      `);
      
      const result = stmt.get() as any;
      
      return {
        totalUsers: result.totalUsers || 0,
        activeUsers: result.activeUsers || 0,
        paidUsers: result.paidUsers || 0,
        totalUploads: result.totalUploads || 0,
      };
    }
  }
  
  /**
   * Helper: Convert camelCase to snake_case
   */
  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  /**
   * Helper: Map database row to User object
   */
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id || row.googleId,
      emailVerified: Boolean(row.email_verified || row.emailVerified),
      subscriptionStatus: row.subscription_status || row.subscriptionStatus,
      subscriptionId: row.subscription_id || row.subscriptionId,
      subscriptionEndDate: row.subscription_end_date ? new Date(row.subscription_end_date) : null,
      stripeCustomerId: row.stripe_customer_id || row.stripeCustomerId,
      uploadsUsed: row.uploads_used || row.uploadsUsed || 0,
      uploadsLimit: row.uploads_limit || row.uploadsLimit || 2,
      lastUploadDate: row.last_upload_date ? new Date(row.last_upload_date) : null,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      loginCount: row.login_count || row.loginCount || 0,
    };
  }
}