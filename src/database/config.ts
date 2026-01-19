/**
 * Database configuration and connection utilities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './schema';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
}

/**
 * Environment-based configuration loader
 */
export class DatabaseConfigLoader {
  /**
   * Load configuration from environment variables
   */
  public static loadFromEnv(): DatabaseConfig {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY environment variable is required');
    }

    return {
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceKey
    };
  }

  /**
   * Validate configuration object
   */
  public static validate(config: DatabaseConfig): void {
    if (!config.supabaseUrl) {
      throw new Error('supabaseUrl is required in database configuration');
    }

    if (!config.supabaseAnonKey) {
      throw new Error('supabaseAnonKey is required in database configuration');
    }

    // Validate URL format
    try {
      new URL(config.supabaseUrl);
    } catch {
      throw new Error('supabaseUrl must be a valid URL');
    }
  }
}

/**
 * Database client factory
 */
export class DatabaseClientFactory {
  /**
   * Create a Supabase client with anonymous key (for client-side usage)
   */
  public static createClient(config: DatabaseConfig): SupabaseClient<Database> {
    DatabaseConfigLoader.validate(config);

    return createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );
  }

  /**
   * Create a Supabase client with service key (for server-side usage)
   */
  public static createServiceClient(config: DatabaseConfig): SupabaseClient<Database> {
    if (!config.supabaseServiceKey) {
      throw new Error('supabaseServiceKey is required for service client');
    }

    DatabaseConfigLoader.validate(config);

    return createClient<Database>(
      config.supabaseUrl,
      config.supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }

  /**
   * Create client from environment variables
   */
  public static createFromEnv(): SupabaseClient<Database> {
    const config = DatabaseConfigLoader.loadFromEnv();
    return this.createClient(config);
  }

  /**
   * Create service client from environment variables
   */
  public static createServiceFromEnv(): SupabaseClient<Database> {
    const config = DatabaseConfigLoader.loadFromEnv();
    return this.createServiceClient(config);
  }
}

/**
 * Connection health checker
 */
export class DatabaseHealthChecker {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Check database connection health
   */
  public async checkHealth(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      const { error } = await this.client
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        return {
          healthy: false,
          error: error.message
        };
      }

      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Wait for database to become available
   */
  public async waitForConnection(
    maxAttempts: number = 10,
    delayMs: number = 1000
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const health = await this.checkHealth();
      
      if (health.healthy) {
        console.log(`✅ Database connection established (attempt ${attempt})`);
        return;
      }

      if (attempt === maxAttempts) {
        throw new Error(
          `Database connection failed after ${maxAttempts} attempts: ${health.error}`
        );
      }

      console.log(
        `⏳ Database connection attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`
      );
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}