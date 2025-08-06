// Database Migration Runner
// Handles database schema migrations with rollback support

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
  checksum?: string;
}

export interface MigrationRecord {
  version: number;
  name: string;
  executed_at: Date;
  checksum: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;
  
  constructor(connectionString: string, migrationsPath = './migrations') {
    this.pool = new Pool({ connectionString });
    this.migrationsPath = migrationsPath;
  }
  
  // Initialize migrations table
  async initialize() {
    await this.createMigrationsTable();
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Migrations table initialized');
    }
  }
  
  // Run all pending migrations
  async runMigrations() {
    if (process.env.NODE_ENV !== 'test') {
      console.log('🔄 Starting migrations...');
    }
    
    // Ensure migrations table exists
    await this.createMigrationsTable();
    
    // Get pending migrations
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('✅ No pending migrations');
      }
      return;
    }
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(`Found ${pending.length} pending migrations`);
    }
    
    for (const migration of pending) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`\n📦 Running migration: ${migration.name}`);
      }
      
      const startTime = Date.now();
      
      try {
        // Start transaction
        await this.pool.query('BEGIN');
        
        // Run migration
        await this.pool.query(migration.up);
        
        // Record migration
        await this.pool.query(
          `INSERT INTO migrations (version, name, executed_at, checksum) 
           VALUES ($1, $2, NOW(), $3)`,
          [migration.version, migration.name, migration.checksum || '']
        );
        
        // Commit transaction
        await this.pool.query('COMMIT');
        
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV !== 'test') {
          console.log(`✅ Migration ${migration.name} completed in ${duration}ms`);
        }
        
      } catch (error) {
        // Rollback transaction
        await this.pool.query('ROLLBACK');
        console.error(`❌ Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('\n✅ All migrations completed successfully');
    }
  }
  
  // Rollback migrations
  async rollback(steps: number = 1) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`🔙 Rolling back ${steps} migration(s)...`);
    }
    
    const executed = await this.getExecutedMigrations(steps);
    
    if (executed.length === 0) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('✅ No migrations to rollback');
      }
      return;
    }
    
    for (const migration of executed.reverse()) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`\n🔙 Rolling back: ${migration.name}`);
      }
      
      const startTime = Date.now();
      
      try {
        // Start transaction
        await this.pool.query('BEGIN');
        
        // Run rollback
        await this.pool.query(migration.down);
        
        // Remove migration record
        await this.pool.query(
          'DELETE FROM migrations WHERE version = $1',
          [migration.version]
        );
        
        // Commit transaction
        await this.pool.query('COMMIT');
        
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV !== 'test') {
          console.log(`✅ Rollback ${migration.name} completed in ${duration}ms`);
        }
        
      } catch (error) {
        // Rollback transaction
        await this.pool.query('ROLLBACK');
        console.error(`❌ Rollback ${migration.name} failed:`, error);
        throw error;
      }
    }
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('\n✅ Rollback completed successfully');
    }
  }
  
  // Get migration status
  async status() {
    const executed = await this.getExecutedMigrationRecords();
    const all = await this.getAllMigrations();
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('\n📊 Migration Status:');
      console.log('─'.repeat(60));
    }
    
    for (const migration of all) {
      const record = executed.find(r => r.version === migration.version);
      
      if (process.env.NODE_ENV !== 'test') {
        if (record) {
          console.log(
            `✅ ${migration.version.toString().padStart(3, '0')} - ${migration.name.padEnd(30)} ` +
            `[${record.executed_at.toISOString()}]`
          );
        } else {
          console.log(
            `⏳ ${migration.version.toString().padStart(3, '0')} - ${migration.name.padEnd(30)} ` +
            `[pending]`
          );
        }
      }
    }
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('─'.repeat(60));
      console.log(`Total: ${all.length} | Executed: ${executed.length} | Pending: ${all.length - executed.length}`);
    }
  }
  
  // Create migrations table if not exists
  private async createMigrationsTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64)
      )
    `);
    
    // Create index for faster lookups
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_migrations_executed_at 
      ON migrations(executed_at DESC)
    `);
  }
  
  // Get all migration files
  private async getAllMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    
    // Check if migrations directory exists
    if (!fs.existsSync(this.migrationsPath)) {
      return migrations;
    }
    
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      // Parse version and name from filename
      // Expected format: 001_create_users_table.sql
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      
      if (!match) {
        console.warn(`Skipping invalid migration file: ${file}`);
        continue;
      }
      
      const version = parseInt(match[1], 10);
      const name = match[2];
      
      const filePath = path.join(this.migrationsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split UP and DOWN sections
      const sections = content.split(/^-- DOWN$/m);
      const up = sections[0].replace(/^-- UP$/m, '').trim();
      const down = sections[1]?.trim() || '';
      
      // Calculate checksum
      const checksum = this.calculateChecksum(content);
      
      migrations.push({
        version,
        name,
        up,
        down,
        checksum,
      });
    }
    
    return migrations.sort((a, b) => a.version - b.version);
  }
  
  // Get executed migration records
  private async getExecutedMigrationRecords(): Promise<MigrationRecord[]> {
    const result = await this.pool.query(
      'SELECT version, name, executed_at, checksum FROM migrations ORDER BY version'
    );
    
    return result.rows;
  }
  
  // Get pending migrations
  private async getPendingMigrations(): Promise<Migration[]> {
    const all = await this.getAllMigrations();
    const executed = await this.getExecutedMigrationRecords();
    
    const executedVersions = new Set(executed.map(r => r.version));
    
    return all.filter(m => !executedVersions.has(m.version));
  }
  
  // Get executed migrations for rollback
  private async getExecutedMigrations(limit: number): Promise<Migration[]> {
    const records = await this.pool.query(
      'SELECT version, name FROM migrations ORDER BY version DESC LIMIT $1',
      [limit]
    );
    
    const all = await this.getAllMigrations();
    const migrations: Migration[] = [];
    
    for (const record of records.rows) {
      const migration = all.find(m => m.version === record.version);
      if (migration) {
        migrations.push(migration);
      } else {
        console.warn(`Migration file not found for version ${record.version}`);
      }
    }
    
    return migrations;
  }
  
  // Calculate checksum for migration content
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  // Close database connection
  async close() {
    await this.pool.end();
  }
}

// CLI interface for running migrations
export async function runMigrationsCLI() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  const runner = new MigrationRunner(connectionString);
  
  try {
    const command = process.argv[2] || 'up';
    
    switch (command) {
      case 'up':
        await runner.runMigrations();
        break;
        
      case 'down':
        const steps = parseInt(process.argv[3] || '1', 10);
        await runner.rollback(steps);
        break;
        
      case 'status':
        await runner.status();
        break;
        
      case 'init':
        await runner.initialize();
        break;
        
      default:
        if (process.env.NODE_ENV !== 'test') {
          console.log('Usage: npm run migrate [up|down|status|init] [steps]');
        }
        process.exit(1);
    }
    
    await runner.close();
    process.exit(0);
    
  } catch (error) {
    console.error('Migration failed:', error);
    await runner.close();
    process.exit(1);
  }
}

// Export for programmatic use
export default MigrationRunner;