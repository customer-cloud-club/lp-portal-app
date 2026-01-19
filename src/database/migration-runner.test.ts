import { vi, Mock } from 'vitest';
/**
 * Tests for migration runner
 */

import { MigrationRunner } from './migration-runner';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn()
  }
}));

const mockCreateClient = createClient as Mock<typeof createClient>;
const mockFs = fs as Mock<typeof fs>;

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      rpc: vi.fn(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    };

    mockCreateClient.mockReturnValue(mockSupabaseClient);

    migrationRunner = new MigrationRunner(
      'https://test.supabase.co',
      'test-service-key',
      '/test/migrations'
    );

    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with provided parameters', () => {
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key'
      );
    });

    it('should use default migrations path if not provided', () => {
      const runner = new MigrationRunner(
        'https://test.supabase.co',
        'test-service-key'
      );
      expect(runner).toBeInstanceOf(MigrationRunner);
    });
  });

  describe('runMigrations', () => {
    beforeEach(() => {
      // Mock successful RLS table creation
      mockSupabaseClient.rpc.mockResolvedValueOnce({ error: null });

      // Mock executed migrations query
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '001_initial_schema',
                filename: '001_initial_schema.sql',
                executed_at: '2023-01-01T00:00:00Z'
              }
            ],
            error: null
          })
        })
      });
    });

    it('should run pending migrations successfully', async () => {
      // Mock file system
      mockFs.readdir.mockResolvedValue([
        '001_initial_schema.sql',
        '002_add_indexes.sql',
        'README.md' // Should be filtered out
      ] as any);

      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes('002_add_indexes.sql')) {
          return Promise.resolve('CREATE INDEX test_index ON users(email);');
        }
        return Promise.resolve('-- Migration content');
      });

      // Mock migration execution
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null })
      });

      await migrationRunner.runMigrations();

      // Should execute the pending migration (002_add_indexes.sql)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: 'CREATE INDEX test_index ON users(email);'
      });
    });

    it('should handle case with no pending migrations', async () => {
      // Mock file system with only executed migration
      mockFs.readdir.mockResolvedValue(['001_initial_schema.sql'] as any);
      mockFs.readFile.mockResolvedValue('-- Migration content');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await migrationRunner.runMigrations();

      expect(consoleSpy).toHaveBeenCalledWith('✨ No pending migrations found');
      consoleSpy.mockRestore();
    });

    it('should handle migration execution failure', async () => {
      mockFs.readdir.mockResolvedValue(['002_add_indexes.sql'] as any);
      mockFs.readFile.mockResolvedValue('CREATE INDEX test_index ON users(email);');

      // Mock SQL execution failure
      mockSupabaseClient.rpc.mockResolvedValueOnce({ error: null }); // table creation
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        error: { message: 'SQL syntax error' }
      });

      await expect(migrationRunner.runMigrations()).rejects.toThrow(
        'Failed to execute migration 002_add_indexes.sql: SQL execution failed: SQL syntax error'
      );
    });

    it('should handle file system errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(migrationRunner.runMigrations()).rejects.toThrow(
        'Failed to read migration files: Directory not found'
      );
    });

    it('should handle database query errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({ error: null }); // table creation
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' }
          })
        })
      });

      await expect(migrationRunner.runMigrations()).rejects.toThrow(
        'Failed to fetch executed migrations: Connection failed'
      );
    });
  });

  describe('getMigrationStatus', () => {
    it('should return correct migration status', async () => {
      // Mock migrations table initialization
      mockSupabaseClient.rpc.mockResolvedValueOnce({ error: null });

      // Mock executed migrations
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '001_initial_schema',
                filename: '001_initial_schema.sql',
                executed_at: '2023-01-01T00:00:00Z'
              }
            ],
            error: null
          })
        })
      });

      // Mock migration files
      mockFs.readdir.mockResolvedValue([
        '001_initial_schema.sql',
        '002_add_indexes.sql'
      ] as any);

      mockFs.readFile.mockResolvedValue('-- Migration content');

      const status = await migrationRunner.getMigrationStatus();

      expect(status.executed).toHaveLength(1);
      expect(status.executed[0].id).toBe('001_initial_schema');
      expect(status.pending).toHaveLength(1);
      expect(status.pending[0]).toBe('002_add_indexes.sql');
    });

    it('should handle empty migration directory', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({ error: null });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      mockFs.readdir.mockResolvedValue([] as any);

      const status = await migrationRunner.getMigrationStatus();

      expect(status.executed).toHaveLength(0);
      expect(status.pending).toHaveLength(0);
    });
  });
});