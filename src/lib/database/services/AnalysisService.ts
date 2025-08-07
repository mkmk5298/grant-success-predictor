/**
 * Analysis Service
 * Handles grant analysis database operations
 */

import { GrantAnalysis, MatchingGrant } from '../models';
import { getDatabaseConnection, DATABASE_TYPE } from '../connection';
import { Pool } from 'pg';
import { Db } from 'mongodb';
import Database from 'better-sqlite3';
import crypto from 'crypto';

export class AnalysisService {
  /**
   * Create a new grant analysis
   */
  static async createAnalysis(data: Partial<GrantAnalysis>): Promise<GrantAnalysis> {
    const analysisId = crypto.randomUUID();
    const now = new Date();
    
    const analysis: GrantAnalysis = {
      id: analysisId,
      userId: data.userId || null,
      sessionId: data.sessionId || crypto.randomUUID(),
      
      // Organization info
      organizationName: data.organizationName!,
      organizationType: data.organizationType!,
      fundingAmount: data.fundingAmount!,
      experienceLevel: data.experienceLevel!,
      hasPartnership: data.hasPartnership || false,
      hasPreviousGrants: data.hasPreviousGrants || false,
      
      // File info
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      fileType: data.fileType || null,
      fileUrl: data.fileUrl || null,
      
      // Analysis results
      successProbability: data.successProbability || 0,
      recommendations: data.recommendations || [],
      matchingGrants: data.matchingGrants || [],
      
      // AI Processing
      aiModel: data.aiModel || 'gpt-4',
      processingTime: data.processingTime || 0,
      tokenUsage: data.tokenUsage || null,
      
      // Metadata
      createdAt: now,
      updatedAt: now,
      isPublic: data.isPublic || false,
      tags: data.tags || [],
    };
    
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const query = `
        INSERT INTO grant_analyses (
          id, user_id, session_id, organization_name, organization_type,
          funding_amount, experience_level, has_partnership, has_previous_grants,
          file_name, file_size, file_type, file_url,
          success_probability, recommendations, matching_grants,
          ai_model, processing_time, token_usage,
          created_at, updated_at, is_public, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `;
      
      const values = [
        analysis.id, analysis.userId, analysis.sessionId,
        analysis.organizationName, analysis.organizationType,
        analysis.fundingAmount, analysis.experienceLevel,
        analysis.hasPartnership, analysis.hasPreviousGrants,
        analysis.fileName, analysis.fileSize, analysis.fileType, analysis.fileUrl,
        analysis.successProbability,
        JSON.stringify(analysis.recommendations),
        JSON.stringify(analysis.matchingGrants),
        analysis.aiModel, analysis.processingTime, analysis.tokenUsage,
        analysis.createdAt, analysis.updatedAt, analysis.isPublic,
        JSON.stringify(analysis.tags)
      ];
      
      const result = await (db as Pool).query(query, values);
      return this.mapRowToAnalysis(result.rows[0]);
    } else if (DATABASE_TYPE === 'mongodb') {
      await (db as Db).collection('analyses').insertOne(analysis);
      return analysis;
    } else {
      // SQLite
      const stmt = (db as Database.Database).prepare(`
        INSERT INTO grant_analyses (
          id, user_id, session_id, organization_name, organization_type,
          funding_amount, experience_level, has_partnership, has_previous_grants,
          file_name, file_size, file_type, file_url,
          success_probability, recommendations, matching_grants,
          ai_model, processing_time, token_usage,
          created_at, updated_at, is_public, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        analysis.id, analysis.userId, analysis.sessionId,
        analysis.organizationName, analysis.organizationType,
        analysis.fundingAmount, analysis.experienceLevel,
        analysis.hasPartnership ? 1 : 0, analysis.hasPreviousGrants ? 1 : 0,
        analysis.fileName, analysis.fileSize, analysis.fileType, analysis.fileUrl,
        analysis.successProbability,
        JSON.stringify(analysis.recommendations),
        JSON.stringify(analysis.matchingGrants),
        analysis.aiModel, analysis.processingTime, analysis.tokenUsage,
        analysis.createdAt.toISOString(), analysis.updatedAt.toISOString(),
        analysis.isPublic ? 1 : 0,
        JSON.stringify(analysis.tags)
      );
      
      return analysis;
    }
  }
  
  /**
   * Find analysis by ID
   */
  static async findById(analysisId: string): Promise<GrantAnalysis | null> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'SELECT * FROM grant_analyses WHERE id = $1',
        [analysisId]
      );
      return result.rows[0] ? this.mapRowToAnalysis(result.rows[0]) : null;
    } else if (DATABASE_TYPE === 'mongodb') {
      const analysis = await (db as Db).collection('analyses').findOne({ id: analysisId });
      return analysis as unknown as GrantAnalysis | null;
    } else {
      const stmt = (db as Database.Database).prepare('SELECT * FROM grant_analyses WHERE id = ?');
      const row = stmt.get(analysisId);
      return row ? this.mapRowToAnalysis(row) : null;
    }
  }
  
  /**
   * Find analyses by user ID
   */
  static async findByUserId(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<GrantAnalysis[]> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'SELECT * FROM grant_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      return result.rows.map(row => this.mapRowToAnalysis(row));
    } else if (DATABASE_TYPE === 'mongodb') {
      const analyses = await (db as Db).collection('analyses')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .toArray();
      return analyses as unknown as GrantAnalysis[];
    } else {
      const stmt = (db as Database.Database).prepare(
        'SELECT * FROM grant_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      );
      const rows = stmt.all(userId, limit, offset);
      return rows.map(row => this.mapRowToAnalysis(row));
    }
  }
  
  /**
   * Find analyses by session ID (for guest users)
   */
  static async findBySessionId(sessionId: string): Promise<GrantAnalysis[]> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'SELECT * FROM grant_analyses WHERE session_id = $1 ORDER BY created_at DESC',
        [sessionId]
      );
      return result.rows.map(row => this.mapRowToAnalysis(row));
    } else if (DATABASE_TYPE === 'mongodb') {
      const analyses = await (db as Db).collection('analyses')
        .find({ sessionId })
        .sort({ createdAt: -1 })
        .toArray();
      return analyses as unknown as GrantAnalysis[];
    } else {
      const stmt = (db as Database.Database).prepare(
        'SELECT * FROM grant_analyses WHERE session_id = ? ORDER BY created_at DESC'
      );
      const rows = stmt.all(sessionId);
      return rows.map(row => this.mapRowToAnalysis(row));
    }
  }
  
  /**
   * Update analysis results
   */
  static async updateResults(
    analysisId: string,
    results: {
      successProbability: number;
      recommendations: string[];
      matchingGrants: MatchingGrant[];
      processingTime?: number;
      tokenUsage?: number;
    }
  ): Promise<GrantAnalysis | null> {
    const db = await getDatabaseConnection();
    const updatedAt = new Date();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        `UPDATE grant_analyses 
         SET success_probability = $2, recommendations = $3, matching_grants = $4,
             processing_time = $5, token_usage = $6, updated_at = $7
         WHERE id = $1 RETURNING *`,
        [
          analysisId,
          results.successProbability,
          JSON.stringify(results.recommendations),
          JSON.stringify(results.matchingGrants),
          results.processingTime || 0,
          results.tokenUsage || null,
          updatedAt
        ]
      );
      return result.rows[0] ? this.mapRowToAnalysis(result.rows[0]) : null;
    } else if (DATABASE_TYPE === 'mongodb') {
      await (db as Db).collection('analyses').updateOne(
        { id: analysisId },
        {
          $set: {
            successProbability: results.successProbability,
            recommendations: results.recommendations,
            matchingGrants: results.matchingGrants,
            processingTime: results.processingTime || 0,
            tokenUsage: results.tokenUsage || null,
            updatedAt
          }
        }
      );
      return this.findById(analysisId);
    } else {
      const stmt = (db as Database.Database).prepare(`
        UPDATE grant_analyses 
        SET success_probability = ?, recommendations = ?, matching_grants = ?,
            processing_time = ?, token_usage = ?, updated_at = ?
        WHERE id = ?
      `);
      
      stmt.run(
        results.successProbability,
        JSON.stringify(results.recommendations),
        JSON.stringify(results.matchingGrants),
        results.processingTime || 0,
        results.tokenUsage || null,
        updatedAt.toISOString(),
        analysisId
      );
      
      return this.findById(analysisId);
    }
  }
  
  /**
   * Get analysis statistics
   */
  static async getAnalysisStats(): Promise<{
    totalAnalyses: number;
    averageSuccessRate: number;
    totalOrganizations: number;
    mostCommonType: string;
  }> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(`
        SELECT 
          COUNT(*) as total_analyses,
          AVG(success_probability) as avg_success_rate,
          COUNT(DISTINCT organization_name) as total_organizations,
          MODE() WITHIN GROUP (ORDER BY organization_type) as most_common_type
        FROM grant_analyses
      `);
      
      return {
        totalAnalyses: parseInt(result.rows[0].total_analyses),
        averageSuccessRate: parseFloat(result.rows[0].avg_success_rate) || 0,
        totalOrganizations: parseInt(result.rows[0].total_organizations),
        mostCommonType: result.rows[0].most_common_type || 'nonprofit',
      };
    } else if (DATABASE_TYPE === 'mongodb') {
      const [stats] = await (db as Db).collection('analyses').aggregate([
        {
          $group: {
            _id: null,
            totalAnalyses: { $sum: 1 },
            avgSuccessRate: { $avg: '$successProbability' },
            organizations: { $addToSet: '$organizationName' },
            types: { $push: '$organizationType' }
          }
        }
      ]).toArray();
      
      // Find most common type
      const typeCounts = stats?.types?.reduce((acc: any, type: string) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const mostCommonType = Object.entries(typeCounts)
        .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'nonprofit';
      
      return {
        totalAnalyses: stats?.totalAnalyses || 0,
        averageSuccessRate: stats?.avgSuccessRate || 0,
        totalOrganizations: stats?.organizations?.length || 0,
        mostCommonType,
      };
    } else {
      // SQLite
      const stmt = (db as Database.Database).prepare(`
        SELECT 
          COUNT(*) as totalAnalyses,
          AVG(success_probability) as avgSuccessRate,
          COUNT(DISTINCT organization_name) as totalOrganizations
        FROM grant_analyses
      `);
      
      const result = stmt.get() as any;
      
      // Get most common type separately for SQLite
      const typeStmt = (db as Database.Database).prepare(`
        SELECT organization_type, COUNT(*) as count
        FROM grant_analyses
        GROUP BY organization_type
        ORDER BY count DESC
        LIMIT 1
      `);
      
      const typeResult = typeStmt.get() as any;
      
      return {
        totalAnalyses: result.totalAnalyses || 0,
        averageSuccessRate: result.avgSuccessRate || 0,
        totalOrganizations: result.totalOrganizations || 0,
        mostCommonType: typeResult?.organization_type || 'nonprofit',
      };
    }
  }
  
  /**
   * Search analyses
   */
  static async searchAnalyses(
    query: string,
    filters?: {
      organizationType?: string;
      minSuccessRate?: number;
      maxSuccessRate?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<GrantAnalysis[]> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      let sql = 'SELECT * FROM grant_analyses WHERE 1=1';
      const values: any[] = [];
      let paramCount = 0;
      
      if (query) {
        paramCount++;
        sql += ` AND (organization_name ILIKE $${paramCount} OR tags::text ILIKE $${paramCount})`;
        values.push(`%${query}%`);
      }
      
      if (filters?.organizationType) {
        paramCount++;
        sql += ` AND organization_type = $${paramCount}`;
        values.push(filters.organizationType);
      }
      
      if (filters?.minSuccessRate !== undefined) {
        paramCount++;
        sql += ` AND success_probability >= $${paramCount}`;
        values.push(filters.minSuccessRate);
      }
      
      if (filters?.maxSuccessRate !== undefined) {
        paramCount++;
        sql += ` AND success_probability <= $${paramCount}`;
        values.push(filters.maxSuccessRate);
      }
      
      if (filters?.startDate) {
        paramCount++;
        sql += ` AND created_at >= $${paramCount}`;
        values.push(filters.startDate);
      }
      
      if (filters?.endDate) {
        paramCount++;
        sql += ` AND created_at <= $${paramCount}`;
        values.push(filters.endDate);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT 100';
      
      const result = await (db as Pool).query(sql, values);
      return result.rows.map(row => this.mapRowToAnalysis(row));
    } else if (DATABASE_TYPE === 'mongodb') {
      const filter: any = {};
      
      if (query) {
        filter.$or = [
          { organizationName: { $regex: query, $options: 'i' } },
          { tags: { $in: [query] } }
        ];
      }
      
      if (filters?.organizationType) {
        filter.organizationType = filters.organizationType;
      }
      
      if (filters?.minSuccessRate !== undefined || filters?.maxSuccessRate !== undefined) {
        filter.successProbability = {};
        if (filters.minSuccessRate !== undefined) {
          filter.successProbability.$gte = filters.minSuccessRate;
        }
        if (filters.maxSuccessRate !== undefined) {
          filter.successProbability.$lte = filters.maxSuccessRate;
        }
      }
      
      if (filters?.startDate || filters?.endDate) {
        filter.createdAt = {};
        if (filters.startDate) {
          filter.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          filter.createdAt.$lte = filters.endDate;
        }
      }
      
      const analyses = await (db as Db).collection('analyses')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      
      return analyses as unknown as GrantAnalysis[];
    } else {
      // SQLite - simplified search
      let sql = 'SELECT * FROM grant_analyses WHERE 1=1';
      const values: any[] = [];
      
      if (query) {
        sql += ' AND (organization_name LIKE ? OR tags LIKE ?)';
        values.push(`%${query}%`, `%${query}%`);
      }
      
      if (filters?.organizationType) {
        sql += ' AND organization_type = ?';
        values.push(filters.organizationType);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT 100';
      
      const stmt = (db as Database.Database).prepare(sql);
      const rows = stmt.all(...values);
      return rows.map(row => this.mapRowToAnalysis(row));
    }
  }
  
  /**
   * Delete analysis
   */
  static async deleteAnalysis(analysisId: string): Promise<boolean> {
    const db = await getDatabaseConnection();
    
    if (DATABASE_TYPE === 'postgres') {
      const result = await (db as Pool).query(
        'DELETE FROM grant_analyses WHERE id = $1',
        [analysisId]
      );
      return (result.rowCount || 0) > 0;
    } else if (DATABASE_TYPE === 'mongodb') {
      const result = await (db as Db).collection('analyses').deleteOne({ id: analysisId });
      return result.deletedCount > 0;
    } else {
      const stmt = (db as Database.Database).prepare('DELETE FROM grant_analyses WHERE id = ?');
      const result = stmt.run(analysisId);
      return result.changes > 0;
    }
  }
  
  /**
   * Helper: Map database row to GrantAnalysis object
   */
  private static mapRowToAnalysis(row: any): GrantAnalysis {
    return {
      id: row.id,
      userId: row.user_id || row.userId,
      sessionId: row.session_id || row.sessionId,
      organizationName: row.organization_name || row.organizationName,
      organizationType: row.organization_type || row.organizationType,
      fundingAmount: row.funding_amount || row.fundingAmount,
      experienceLevel: row.experience_level || row.experienceLevel,
      hasPartnership: Boolean(row.has_partnership || row.hasPartnership),
      hasPreviousGrants: Boolean(row.has_previous_grants || row.hasPreviousGrants),
      fileName: row.file_name || row.fileName,
      fileSize: row.file_size || row.fileSize,
      fileType: row.file_type || row.fileType,
      fileUrl: row.file_url || row.fileUrl,
      successProbability: row.success_probability || row.successProbability,
      recommendations: typeof row.recommendations === 'string' 
        ? JSON.parse(row.recommendations) 
        : row.recommendations || [],
      matchingGrants: typeof row.matching_grants === 'string'
        ? JSON.parse(row.matching_grants)
        : row.matchingGrants || [],
      aiModel: row.ai_model || row.aiModel,
      processingTime: row.processing_time || row.processingTime,
      tokenUsage: row.token_usage || row.tokenUsage,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt),
      isPublic: Boolean(row.is_public || row.isPublic),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
    };
  }
}