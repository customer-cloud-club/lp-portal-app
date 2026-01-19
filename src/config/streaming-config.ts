/**
 * Configuration interface for streaming server settings
 */
export interface StreamingConfig {
  /** Server port number */
  port: number;
  /** Server host address */
  host: string;
  /** Maximum number of concurrent connections */
  maxConnections: number;
  /** Buffer size in bytes for streaming data */
  bufferSize: number;
  /** Chunk size in bytes for data transmission */
  chunkSize: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Enable compression for streaming data */
  compression: boolean;
  /** SSL/TLS configuration */
  ssl?: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
  /** CORS configuration */
  cors?: {
    enabled: boolean;
    origin: string | string[];
    credentials: boolean;
  };
  /** Rate limiting configuration */
  rateLimit?: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Default streaming configuration
 */
export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  port: 3000,
  host: '0.0.0.0',
  maxConnections: 1000,
  bufferSize: 64 * 1024, // 64KB
  chunkSize: 8 * 1024, // 8KB
  connectionTimeout: 30000, // 30 seconds
  compression: true,
  ssl: {
    enabled: false,
  },
  cors: {
    enabled: true,
    origin: '*',
    credentials: false,
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
};

/**
 * Environment variable keys for configuration
 */
export enum ConfigKeys {
  PORT = 'STREAMING_PORT',
  HOST = 'STREAMING_HOST',
  MAX_CONNECTIONS = 'STREAMING_MAX_CONNECTIONS',
  BUFFER_SIZE = 'STREAMING_BUFFER_SIZE',
  CHUNK_SIZE = 'STREAMING_CHUNK_SIZE',
  CONNECTION_TIMEOUT = 'STREAMING_CONNECTION_TIMEOUT',
  COMPRESSION = 'STREAMING_COMPRESSION',
  SSL_ENABLED = 'STREAMING_SSL_ENABLED',
  SSL_CERT_PATH = 'STREAMING_SSL_CERT_PATH',
  SSL_KEY_PATH = 'STREAMING_SSL_KEY_PATH',
  CORS_ENABLED = 'STREAMING_CORS_ENABLED',
  CORS_ORIGIN = 'STREAMING_CORS_ORIGIN',
  CORS_CREDENTIALS = 'STREAMING_CORS_CREDENTIALS',
  RATE_LIMIT_ENABLED = 'STREAMING_RATE_LIMIT_ENABLED',
  RATE_LIMIT_WINDOW_MS = 'STREAMING_RATE_LIMIT_WINDOW_MS',
  RATE_LIMIT_MAX_REQUESTS = 'STREAMING_RATE_LIMIT_MAX_REQUESTS',
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Configuration validation error: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates streaming configuration
 * @param config - Configuration to validate
 * @throws {ConfigValidationError} When configuration is invalid
 */
export function validateStreamingConfig(config: StreamingConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new ConfigValidationError('Port must be between 1 and 65535');
  }

  if (!config.host || config.host.trim() === '') {
    throw new ConfigValidationError('Host must be specified');
  }

  if (config.maxConnections < 1) {
    throw new ConfigValidationError('Max connections must be greater than 0');
  }

  if (config.bufferSize < 1024) {
    throw new ConfigValidationError('Buffer size must be at least 1024 bytes');
  }

  if (config.chunkSize < 512 || config.chunkSize > config.bufferSize) {
    throw new ConfigValidationError('Chunk size must be between 512 bytes and buffer size');
  }

  if (config.connectionTimeout < 1000) {
    throw new ConfigValidationError('Connection timeout must be at least 1000ms');
  }

  if (config.ssl?.enabled && (!config.ssl.certPath || !config.ssl.keyPath)) {
    throw new ConfigValidationError('SSL certificate and key paths must be provided when SSL is enabled');
  }

  if (config.rateLimit?.enabled) {
    if (config.rateLimit.windowMs < 1000) {
      throw new ConfigValidationError('Rate limit window must be at least 1000ms');
    }
    if (config.rateLimit.maxRequests < 1) {
      throw new ConfigValidationError('Rate limit max requests must be greater than 0');
    }
  }
}

/**
 * Loads streaming configuration from environment variables
 * @param fallbackConfig - Fallback configuration to use for missing values
 * @returns Streaming configuration with environment overrides
 */
export function loadStreamingConfigFromEnv(
  fallbackConfig: StreamingConfig = DEFAULT_STREAMING_CONFIG
): StreamingConfig {
  const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  };

  const parseNumber = (value: string | undefined, defaultValue: number): number => {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const parseStringArray = (value: string | undefined): string[] | string => {
    if (value === undefined) return '*';
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value.split(',').map(s => s.trim());
    }
  };

  const config: StreamingConfig = {
    port: parseNumber(process.env[ConfigKeys.PORT], fallbackConfig.port),
    host: process.env[ConfigKeys.HOST] || fallbackConfig.host,
    maxConnections: parseNumber(process.env[ConfigKeys.MAX_CONNECTIONS], fallbackConfig.maxConnections),
    bufferSize: parseNumber(process.env[ConfigKeys.BUFFER_SIZE], fallbackConfig.bufferSize),
    chunkSize: parseNumber(process.env[ConfigKeys.CHUNK_SIZE], fallbackConfig.chunkSize),
    connectionTimeout: parseNumber(process.env[ConfigKeys.CONNECTION_TIMEOUT], fallbackConfig.connectionTimeout),
    compression: parseBoolean(process.env[ConfigKeys.COMPRESSION], fallbackConfig.compression),
    ssl: {
      enabled: parseBoolean(process.env[ConfigKeys.SSL_ENABLED], fallbackConfig.ssl?.enabled || false),
      certPath: process.env[ConfigKeys.SSL_CERT_PATH] || fallbackConfig.ssl?.certPath,
      keyPath: process.env[ConfigKeys.SSL_KEY_PATH] || fallbackConfig.ssl?.keyPath,
    },
    cors: {
      enabled: parseBoolean(process.env[ConfigKeys.CORS_ENABLED], fallbackConfig.cors?.enabled || true),
      origin: parseStringArray(process.env[ConfigKeys.CORS_ORIGIN]) || fallbackConfig.cors?.origin || '*',
      credentials: parseBoolean(process.env[ConfigKeys.CORS_CREDENTIALS], fallbackConfig.cors?.credentials || false),
    },
    rateLimit: {
      enabled: parseBoolean(process.env[ConfigKeys.RATE_LIMIT_ENABLED], fallbackConfig.rateLimit?.enabled || true),
      windowMs: parseNumber(process.env[ConfigKeys.RATE_LIMIT_WINDOW_MS], fallbackConfig.rateLimit?.windowMs || 900000),
      maxRequests: parseNumber(process.env[ConfigKeys.RATE_LIMIT_MAX_REQUESTS], fallbackConfig.rateLimit?.maxRequests || 100),
    },
  };

  validateStreamingConfig(config);
  return config;
}