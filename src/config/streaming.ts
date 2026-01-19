/**
 * Streaming server configuration
 * Provides configuration settings for streaming functionality
 */

export interface StreamingConfig {
  /** Server port for streaming */
  port: number;
  /** Host address */
  host: string;
  /** Maximum number of concurrent connections */
  maxConnections: number;
  /** Buffer size in bytes */
  bufferSize: number;
  /** Connection timeout in milliseconds */
  timeout: number;
  /** Enable SSL/TLS */
  ssl: boolean;
  /** SSL certificate path (required if ssl is true) */
  sslCertPath?: string;
  /** SSL key path (required if ssl is true) */
  sslKeyPath?: string;
  /** Compression settings */
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  /** CORS settings */
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
  };
  /** Rate limiting */
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
}

export interface StreamingServerOptions {
  /** Configuration object */
  config: StreamingConfig;
  /** Logger instance */
  logger?: {
    info: (message: string) => void;
    error: (message: string, error?: Error) => void;
    warn: (message: string) => void;
  };
}

/**
 * Default streaming configuration
 */
export const defaultStreamingConfig: StreamingConfig = {
  port: 8080,
  host: '0.0.0.0',
  maxConnections: 100,
  bufferSize: 64 * 1024, // 64KB
  timeout: 30000, // 30 seconds
  ssl: false,
  compression: {
    enabled: true,
    level: 6,
    threshold: 1024
  },
  cors: {
    enabled: true,
    origins: ['*'],
    methods: ['GET', 'POST', 'OPTIONS']
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
};

/**
 * Configuration validator
 */
export class StreamingConfigValidator {
  /**
   * Validates streaming configuration
   * @param config Configuration to validate
   * @returns Validation result
   * @throws Error if configuration is invalid
   */
  static validate(config: Partial<StreamingConfig>): StreamingConfig {
    const validatedConfig = { ...defaultStreamingConfig, ...config };

    // Port validation
    if (validatedConfig.port < 1 || validatedConfig.port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }

    // Host validation
    if (!validatedConfig.host || validatedConfig.host.trim() === '') {
      throw new Error('Host cannot be empty');
    }

    // Max connections validation
    if (validatedConfig.maxConnections < 1) {
      throw new Error('Max connections must be greater than 0');
    }

    // Buffer size validation
    if (validatedConfig.bufferSize < 1024) {
      throw new Error('Buffer size must be at least 1024 bytes');
    }

    // Timeout validation
    if (validatedConfig.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }

    // SSL validation
    if (validatedConfig.ssl) {
      if (!validatedConfig.sslCertPath || !validatedConfig.sslKeyPath) {
        throw new Error('SSL certificate and key paths are required when SSL is enabled');
      }
    }

    // Compression level validation
    if (validatedConfig.compression.level < 0 || validatedConfig.compression.level > 9) {
      throw new Error('Compression level must be between 0 and 9');
    }

    // Rate limit validation
    if (validatedConfig.rateLimit.enabled) {
      if (validatedConfig.rateLimit.windowMs < 1000) {
        throw new Error('Rate limit window must be at least 1000ms');
      }
      if (validatedConfig.rateLimit.maxRequests < 1) {
        throw new Error('Max requests must be greater than 0');
      }
    }

    return validatedConfig;
  }

  /**
   * Checks if configuration is valid without throwing
   * @param config Configuration to check
   * @returns True if valid, false otherwise
   */
  static isValid(config: Partial<StreamingConfig>): boolean {
    try {
      this.validate(config);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Environment-based configuration loader
 */
export class StreamingConfigLoader {
  /**
   * Loads configuration from environment variables
   * @returns Configuration object
   */
  static fromEnvironment(): StreamingConfig {
    const config: Partial<StreamingConfig> = {
      port: process.env.STREAMING_PORT ? parseInt(process.env.STREAMING_PORT, 10) : undefined,
      host: process.env.STREAMING_HOST,
      maxConnections: process.env.STREAMING_MAX_CONNECTIONS ? parseInt(process.env.STREAMING_MAX_CONNECTIONS, 10) : undefined,
      bufferSize: process.env.STREAMING_BUFFER_SIZE ? parseInt(process.env.STREAMING_BUFFER_SIZE, 10) : undefined,
      timeout: process.env.STREAMING_TIMEOUT ? parseInt(process.env.STREAMING_TIMEOUT, 10) : undefined,
      ssl: process.env.STREAMING_SSL === 'true',
      sslCertPath: process.env.STREAMING_SSL_CERT_PATH,
      sslKeyPath: process.env.STREAMING_SSL_KEY_PATH
    };

    return StreamingConfigValidator.validate(config);
  }

  /**
   * Loads configuration from JSON file
   * @param filePath Path to configuration file
   * @returns Configuration object
   */
  static async fromFile(filePath: string): Promise<StreamingConfig> {
    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(fileContent) as Partial<StreamingConfig>;
      return StreamingConfigValidator.validate(config);
    } catch (error) {
      throw new Error(`Failed to load configuration from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
