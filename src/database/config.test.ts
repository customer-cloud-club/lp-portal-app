import { vi, Mock } from 'vitest';
/**
 * Tests for database configuration
 */

import {
  DatabaseConfig,
  DatabaseConfigLoader,
  DatabaseClientFactory,
  DatabaseHealthChecker
} from './config';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@supabase/supabase-js');

const mockCreateClient = createClient as Mock<typeof createClient>;

describe('DatabaseConfigLoader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadFromEnv', () => {
    it('should load configuration from environment variables', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const config = DatabaseConfigLoader.loadFromEnv();

      expect(config).toEqual({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        supabaseServiceKey: 'test-service-key'
      });
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';
      delete process.env.SUPABASE_URL;

      expect(() => DatabaseConfigLoader.loadFromEnv()).toThrow(
        'SUPABASE_URL environment variable is required'
      );
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => DatabaseConfigLoader.loadFromEnv()).toThrow(
        'SUPABASE_ANON_KEY environment variable is required'
      );
    });

    it('should work without SUPABASE_SERVICE_KEY', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';
      delete process.env.SUPABASE_SERVICE_KEY;

      const config = DatabaseConfigLoader.loadFromEnv();

      expect(config.supabaseUrl).toBe('https://test.supabase.co');
      expect(config.supabaseAnonKey).toBe('test-anon-key');
      expect(config.supabaseServiceKey).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config: DatabaseConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key'
      };

      expect(() => DatabaseConfigLoader.validate(config)).not.toThrow();
    });

    it('should throw error for missing supabaseUrl', () => {
      const config = {
        supabaseAnonKey: 'test-anon-key'
      } as DatabaseConfig;

      expect(() => DatabaseConfigLoader.validate(config)).toThrow(
        'supabaseUrl is required in database configuration'
      );
    });

    it('should throw error for missing supabaseAnonKey', () => {
      const config = {
        supabaseUrl: 'https://test.supabase.co'
      } as DatabaseConfig;

      expect(() => DatabaseConfigLoader.validate(config)).toThrow(
        'supabaseAnonKey is required in database configuration'
      );
    });

    it('should throw error for invalid URL format', () => {
      const config: DatabaseConfig = {
        supabaseUrl: 'invalid-url',
        supabaseAnonKey: 'test-anon-key'
      };

      expect(() => DatabaseConfigLoader.validate(config)).toThrow(
        'supabaseUrl must be a valid URL'
      );
    });
  });
});

describe('DatabaseClientFactory', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      from: vi.fn(),
      auth: {
        signIn: vi.fn(),
        signOut: vi.fn()
      }
    };
    mockCreateClient.mockReturnValue(mockClient);
    vi.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create client with correct parameters', () => {
      const config: DatabaseConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key'
      };

      const client = DatabaseClientFactory.createClient(config);

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        }
      );
      expect(client).toBe(mockClient);
    });

    it('should validate configuration before creating client', () => {
      const invalidConfig = {
        supabaseAnonKey: 'test-anon-key'
      } as DatabaseConfig;

      expect(() => DatabaseClientFactory.createClient(invalidConfig)).toThrow(
        'supabaseUrl is required in database configuration'
      );
    });
  });

  describe('createServiceClient', () => {
    it('should create service client with correct parameters', () => {
      const config: DatabaseConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        supabaseServiceKey: 'test-service-key'
      };

      const client = DatabaseClientFactory.createServiceClient(config);

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );
      expect(client).toBe(mockClient);
    });

    it('should throw error when service key is missing', () => {
      const config: DatabaseConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key'
      };

      expect(() => DatabaseClientFactory.createServiceClient(config)).toThrow(
        'supabaseServiceKey is required for service client'
      );
    });
  });

  describe('createFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variables', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';

      const client = DatabaseClientFactory.createFromEnv();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.any(Object)
      );
      expect(client).toBe(mockClient);
    });
  });
});

describe('DatabaseHealthChecker', () => {
  let mockClient: any;
  let healthChecker: DatabaseHealthChecker;

  beforeEach(() => {
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    };
    healthChecker = new DatabaseHealthChecker(mockClient);
    vi.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status on successful connection', async () => {
      mockClient.limit.mockResolvedValue({ error: null });

      const health = await healthChecker.checkHealth();

      expect(health.healthy).toBe(true);
      expect(typeof health.latency).toBe('number');
      expect(health.error).toBeUndefined();
    });

    it('should return unhealthy status on database error', async () => {
      mockClient.limit.mockResolvedValue({
        error: { message: 'Connection failed' }
      });

      const health = await healthChecker.checkHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection failed');
      expect(health.latency).toBeUndefined();
    });

    it('should return unhealthy status on exception', async () => {
      mockClient.limit.mockRejectedValue(new Error('Network error'));

      const health = await healthChecker.checkHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Network error');
    });
  });

  describe('waitForConnection', () => {
    it('should resolve immediately if connection is healthy', async () => {
      mockClient.limit.mockResolvedValue({ error: null });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await expect(healthChecker.waitForConnection(3, 100)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database connection established (attempt 1)')
      );
      consoleSpy.mockRestore();
    });

    it('should retry on failed connections and eventually succeed', async () => {
      mockClient.limit
        .mockResolvedValueOnce({ error: { message: 'Connection failed' } })
        .mockResolvedValueOnce({ error: { message: 'Connection failed' } })
        .mockResolvedValueOnce({ error: null });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await expect(healthChecker.waitForConnection(3, 10)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database connection established (attempt 3)')
      );
      consoleSpy.mockRestore();
    });

    it('should throw error after max attempts', async () => {
      mockClient.limit.mockResolvedValue({
        error: { message: 'Connection failed' }
      });

      await expect(healthChecker.waitForConnection(2, 10)).rejects.toThrow(
        'Database connection failed after 2 attempts: Connection failed'
      );
    });
  });
});