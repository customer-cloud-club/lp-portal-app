import {
  StreamingConfig,
  DEFAULT_STREAMING_CONFIG,
  ConfigKeys,
  ConfigValidationError,
  validateStreamingConfig,
  loadStreamingConfigFromEnv,
} from './streaming-config';

describe('StreamingConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear streaming-related environment variables
    Object.values(ConfigKeys).forEach(key => {
      delete process.env[key];
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DEFAULT_STREAMING_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_STREAMING_CONFIG.port).toBe(3000);
      expect(DEFAULT_STREAMING_CONFIG.host).toBe('0.0.0.0');
      expect(DEFAULT_STREAMING_CONFIG.maxConnections).toBe(1000);
      expect(DEFAULT_STREAMING_CONFIG.bufferSize).toBe(64 * 1024);
      expect(DEFAULT_STREAMING_CONFIG.chunkSize).toBe(8 * 1024);
      expect(DEFAULT_STREAMING_CONFIG.connectionTimeout).toBe(30000);
      expect(DEFAULT_STREAMING_CONFIG.compression).toBe(true);
      expect(DEFAULT_STREAMING_CONFIG.ssl?.enabled).toBe(false);
      expect(DEFAULT_STREAMING_CONFIG.cors?.enabled).toBe(true);
      expect(DEFAULT_STREAMING_CONFIG.rateLimit?.enabled).toBe(true);
    });

    it('should pass validation', () => {
      expect(() => validateStreamingConfig(DEFAULT_STREAMING_CONFIG)).not.toThrow();
    });
  });

  describe('validateStreamingConfig', () => {
    const validConfig: StreamingConfig = { ...DEFAULT_STREAMING_CONFIG };

    it('should validate valid configuration without throwing', () => {
      expect(() => validateStreamingConfig(validConfig)).not.toThrow();
    });

    it('should throw error for invalid port (too low)', () => {
      const invalidConfig = { ...validConfig, port: 0 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Port must be between 1 and 65535'));
    });

    it('should throw error for invalid port (too high)', () => {
      const invalidConfig = { ...validConfig, port: 65536 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Port must be between 1 and 65535'));
    });

    it('should throw error for empty host', () => {
      const invalidConfig = { ...validConfig, host: '' };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Host must be specified'));
    });

    it('should throw error for invalid maxConnections', () => {
      const invalidConfig = { ...validConfig, maxConnections: 0 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Max connections must be greater than 0'));
    });

    it('should throw error for invalid bufferSize', () => {
      const invalidConfig = { ...validConfig, bufferSize: 512 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Buffer size must be at least 1024 bytes'));
    });

    it('should throw error for invalid chunkSize (too small)', () => {
      const invalidConfig = { ...validConfig, chunkSize: 256 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Chunk size must be between 512 bytes and buffer size'));
    });

    it('should throw error for invalid chunkSize (larger than buffer)', () => {
      const invalidConfig = { ...validConfig, chunkSize: validConfig.bufferSize + 1 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Chunk size must be between 512 bytes and buffer size'));
    });

    it('should throw error for invalid connectionTimeout', () => {
      const invalidConfig = { ...validConfig, connectionTimeout: 500 };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Connection timeout must be at least 1000ms'));
    });

    it('should throw error for SSL enabled without cert path', () => {
      const invalidConfig = {
        ...validConfig,
        ssl: { enabled: true, keyPath: '/path/to/key' },
      };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('SSL certificate and key paths must be provided when SSL is enabled'));
    });

    it('should throw error for SSL enabled without key path', () => {
      const invalidConfig = {
        ...validConfig,
        ssl: { enabled: true, certPath: '/path/to/cert' },
      };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('SSL certificate and key paths must be provided when SSL is enabled'));
    });

    it('should throw error for invalid rate limit window', () => {
      const invalidConfig = {
        ...validConfig,
        rateLimit: { enabled: true, windowMs: 500, maxRequests: 100 },
      };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Rate limit window must be at least 1000ms'));
    });

    it('should throw error for invalid rate limit max requests', () => {
      const invalidConfig = {
        ...validConfig,
        rateLimit: { enabled: true, windowMs: 60000, maxRequests: 0 },
      };
      expect(() => validateStreamingConfig(invalidConfig))
        .toThrow(new ConfigValidationError('Rate limit max requests must be greater than 0'));
    });
  });

  describe('loadStreamingConfigFromEnv', () => {
    it('should return default config when no environment variables are set', () => {
      const config = loadStreamingConfigFromEnv();
      expect(config).toEqual(DEFAULT_STREAMING_CONFIG);
    });

    it('should override port from environment variable', () => {
      process.env[ConfigKeys.PORT] = '8080';
      const config = loadStreamingConfigFromEnv();
      expect(config.port).toBe(8080);
    });

    it('should override host from environment variable', () => {
      process.env[ConfigKeys.HOST] = '127.0.0.1';
      const config = loadStreamingConfigFromEnv();
      expect(config.host).toBe('127.0.0.1');
    });

    it('should override boolean values from environment variables', () => {
      process.env[ConfigKeys.COMPRESSION] = 'false';
      process.env[ConfigKeys.SSL_ENABLED] = 'true';
      process.env[ConfigKeys.SSL_CERT_PATH] = '/path/to/cert.pem';
      process.env[ConfigKeys.SSL_KEY_PATH] = '/path/to/key.pem';

      const config = loadStreamingConfigFromEnv();
      expect(config.compression).toBe(false);
      expect(config.ssl?.enabled).toBe(true);
      expect(config.ssl?.certPath).toBe('/path/to/cert.pem');
      expect(config.ssl?.keyPath).toBe('/path/to/key.pem');
    });

    it('should parse CORS origin as array from JSON string', () => {
      process.env[ConfigKeys.CORS_ORIGIN] = '["http://localhost:3000", "https://example.com"]';
      const config = loadStreamingConfigFromEnv();
      expect(config.cors?.origin).toEqual(['http://localhost:3000', 'https://example.com']);
    });

    it('should parse CORS origin as array from comma-separated string', () => {
      process.env[ConfigKeys.CORS_ORIGIN] = 'http://localhost:3000, https://example.com';
      const config = loadStreamingConfigFromEnv();
      expect(config.cors?.origin).toEqual(['http://localhost:3000', 'https://example.com']);
    });

    it('should use fallback values for invalid numbers', () => {
      process.env[ConfigKeys.PORT] = 'invalid';
      process.env[ConfigKeys.MAX_CONNECTIONS] = 'not-a-number';
      
      const config = loadStreamingConfigFromEnv();
      expect(config.port).toBe(DEFAULT_STREAMING_CONFIG.port);
      expect(config.maxConnections).toBe(DEFAULT_STREAMING_CONFIG.maxConnections);
    });

    it('should use custom fallback configuration', () => {
      const customFallback: StreamingConfig = {
        ...DEFAULT_STREAMING_CONFIG,
        port: 9000,
        host: 'custom-host',
      };

      const config = loadStreamingConfigFromEnv(customFallback);
      expect(config.port).toBe(9000);
      expect(config.host).toBe('custom-host');
    });

    it('should throw validation error for invalid environment configuration', () => {
      process.env[ConfigKeys.PORT] = '99999'; // Invalid port
      
      expect(() => loadStreamingConfigFromEnv())
        .toThrow(ConfigValidationError);
    });

    it('should handle all numeric environment variables', () => {
      process.env[ConfigKeys.PORT] = '4000';
      process.env[ConfigKeys.MAX_CONNECTIONS] = '500';
      process.env[ConfigKeys.BUFFER_SIZE] = '32768';
      process.env[ConfigKeys.CHUNK_SIZE] = '4096';
      process.env[ConfigKeys.CONNECTION_TIMEOUT] = '60000';
      process.env[ConfigKeys.RATE_LIMIT_WINDOW_MS] = '300000';
      process.env[ConfigKeys.RATE_LIMIT_MAX_REQUESTS] = '200';

      const config = loadStreamingConfigFromEnv();
      expect(config.port).toBe(4000);
      expect(config.maxConnections).toBe(500);
      expect(config.bufferSize).toBe(32768);
      expect(config.chunkSize).toBe(4096);
      expect(config.connectionTimeout).toBe(60000);
      expect(config.rateLimit?.windowMs).toBe(300000);
      expect(config.rateLimit?.maxRequests).toBe(200);
    });

    it('should handle all boolean environment variables', () => {
      process.env[ConfigKeys.COMPRESSION] = 'false';
      process.env[ConfigKeys.SSL_ENABLED] = 'true';
      process.env[ConfigKeys.CORS_ENABLED] = 'false';
      process.env[ConfigKeys.CORS_CREDENTIALS] = 'true';
      process.env[ConfigKeys.RATE_LIMIT_ENABLED] = 'false';
      process.env[ConfigKeys.SSL_CERT_PATH] = '/cert.pem';
      process.env[ConfigKeys.SSL_KEY_PATH] = '/key.pem';

      const config = loadStreamingConfigFromEnv();
      expect(config.compression).toBe(false);
      expect(config.ssl?.enabled).toBe(true);
      expect(config.cors?.enabled).toBe(false);
      expect(config.cors?.credentials).toBe(true);
      expect(config.rateLimit?.enabled).toBe(false);
    });
  });

  describe('ConfigValidationError', () => {
    it('should create error with correct message and name', () => {
      const error = new ConfigValidationError('Test error');
      expect(error.message).toBe('Configuration validation error: Test error');
      expect(error.name).toBe('ConfigValidationError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});