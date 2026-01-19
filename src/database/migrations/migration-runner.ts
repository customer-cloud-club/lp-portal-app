/**
 * Migration runner utility for Supabase database migrations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../schema';
import { promises as fs } from 'fs';
import { join } from 'path';

interface MigrationRecord {
  id: string;
  filename: string;
  executed_at: string;
}

interface MigrationFile {
  id: string;
  filename: string;
  content: string;
}

/**
 * Migration runner class for managing database schema changes
 */
export class MigrationRunner {
  private supabase: SupabaseClient<Database>;
  private migrationsPath: string;

  /**
   * Creates a new migration runner instance
   * @param supabaseUrl - Supabase project URL
   * @param supabaseKey - Supabase service role key
   * @param migrationsPath - Path to migrations directory
   */
  constructor(
    private supabaseUrl: string,
    private supabaseKey: string,
    migrationsPath?: string
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.migrationsPath = migrationsPath || join(__dirname, './migrations');
  }

  /**
   * Initialize migrations table if it doesn't exist
   */
  private async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    const { error } = await this.supabase.rpc('exec_sql', {
      sql: createTableQuery
    });

    if (error) {
      throw new Error(`Failed to initialize migrations table: ${error.message}`);
    }
  }

  /**
   * Get list of executed migrations from database
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const { data, error } = await this.supabase
      .from('schema_migrations')
      .select('*')
      .order('executed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch executed migrations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get list of migration files from filesystem
   */
  private async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

      const migrations: MigrationFile[] = [];

      for (const filename of sqlFiles) {
        const content = await fs.readFile(
          join(this.migrationsPath, filename),
          'utf-8'
        );
        const id = filename.replace('.sql', '');

        migrations.push({ id, filename, content });
      }

      return migrations;
    } catch (error) {
      throw new Error(`Failed to read migration files: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: MigrationFile): Promise<void> {
    try {
      // Execute the migration SQL
      const { error: sqlError } = await this.supabase.rpc('exec_sql', {
        sql: migration.content
      });

      if (sqlError) {
        throw new Error(`SQL execution failed: ${sqlError.message}`);
      }

      // Record the migration as executed
      const { error: insertError } = await this.supabase
        .from('schema_migrations')
        .insert({
          id: migration.id,
          filename: migration.filename
        });

      if (insertError) {
        throw new Error(`Failed to record migration: ${insertError.message}`);
      }

      console.log(`✅ Executed migration: ${migration.filename}`);
    } catch (error) {
      throw new Error(`Failed to execute migration ${migration.filename}: ${(error as Error).message}`);
    }
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migrations...');

      // Initialize migrations table
      await this.initializeMigrationsTable();

      // Get executed migrations and available migration files
      const [executedMigrations, migrationFiles] = await Promise.all([
        this.getExecutedMigrations(),
        this.getMigrationFiles()
      ]);

      const executedIds = new Set(executedMigrations.map(m => m.id));
      const pendingMigrations = migrationFiles.filter(m => !executedIds.has(m.id));

      if (pendingMigrations.length === 0) {
        console.log('✨ No pending migrations found');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Check migration status
   */
  public async getMigrationStatus(): Promise<{
    executed: MigrationRecord[];
    pending: string[];
  }> {
    await this.initializeMigrationsTable();

    const [executedMigrations, migrationFiles] = await Promise.all([
      this.getExecutedMigrations(),
      this.getMigrationFiles()
    ]);

    const executedIds = new Set(executedMigrations.map(m => m.id));
    const pending = migrationFiles
      .filter(m => !executedIds.has(m.id))
      .map(m => m.filename);

    return {
      executed: executedMigrations,
      pending
    };
  }
}