import { vi, Mock } from 'vitest';
/**
 * Tests for SystemIntegrationTester
 */

import { SystemIntegrationTester, SystemIntegrationConfig } from './system-integration';
import { Logger } from '../utils/logger';
import { DatabaseConnection } from '../database/connection';
import { ApiClient } from '../api/client';
import { AuthService } from '../auth/service';
import { NotificationService } from '../notification/service';

// Mock dependencies
vi.mock('../utils/logger');
vi.mock('../database/connection');
vi.mock('../api/client');
vi.mock('../auth/service');
vi.mock('../notification/service');

const mockLogger = Logger as Mock<typeof Logger>;
const mockDatabase = DatabaseConnection as Mock<typeof DatabaseConnection>;
const mockApiClient = ApiClient as Mock<typeof ApiClient>;
const mockAuthService = AuthService as Mock<typeof AuthService>;
const mockNotificationService = NotificationService as Mock<typeof NotificationService>;

describe('SystemIntegrationTester', () => {
  let config: SystemIntegrationConfig;
  let tester: SystemIntegrationTester;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      databaseUrl: 'postgresql://localhost:5432/test',
      apiBaseUrl: 'http://localhost:3000',
      authConfig: {
        clientId: 'test-client',
        clientSecret: 'test-secret'
      },
      notificationConfig: {
        webhookUrl: 'http://localhost:3001/webhook',
        retryAttempts: 3
      },
      timeout: 30000
    };
    
    tester = new SystemIntegrationTester(config);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(tester).toBeInstanceOf(SystemIntegrationTester);
      expect(mockLogger).toHaveBeenCalledWith('SystemIntegrationTester');
    });
  });

  describe('runTests', () => {
    beforeEach(() => {
      // Setup mocks for successful scenario
      const mockDbInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      const mockApiInstance = {
        get: vi.fn().mockResolvedValue({ status: 200, data: { userId: 1, name: 'Test User' } })
      };
      mockApiClient.mockImplementation(() => mockApiInstance as any);
      
      const mockAuthInstance = {
        authenticate: vi.fn().mockResolvedValue('test-token'),
        validateToken: vi.fn().mockResolvedValue(true)
      };
      mockAuthService.mockImplementation(() => mockAuthInstance as any);
      
      const mockNotificationInstance = {
        send: vi.fn().mockResolvedValue({ success: true })
      };
      mockNotificationService.mockImplementation(() => mockNotificationInstance as any);
    });

    it('should run all tests successfully', async () => {
      const result = await tester.runTests();
      
      expect(result.success).toBe(true);
      expect(result.totalTests).toBe(5);
      expect(result.passedTests).toBe(5);
      expect(result.failedTests).toBe(0);
      expect(result.results).toHaveLength(5);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle database connection failure', async () => {
      const mockDbInstance = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn().mockResolvedValue(undefined)
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      await expect(tester.runTests()).rejects.toThrow('Component initialization failed');
    });

    it('should handle individual test failures', async () => {
      const mockDbInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockRejectedValue(new Error('Query failed'))
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      const mockApiInstance = {
        get: vi.fn().mockResolvedValue({ status: 200, data: {} })
      };
      mockApiClient.mockImplementation(() => mockApiInstance as any);
      
      const mockAuthInstance = {
        authenticate: vi.fn().mockResolvedValue('test-token'),
        validateToken: vi.fn().mockResolvedValue(true)
      };
      mockAuthService.mockImplementation(() => mockAuthInstance as any);
      
      const mockNotificationInstance = {
        send: vi.fn().mockResolvedValue({ success: true })
      };
      mockNotificationService.mockImplementation(() => mockNotificationInstance as any);
      
      const result = await tester.runTests();
      
      expect(result.success).toBe(false);
      expect(result.failedTests).toBeGreaterThan(0);
      const failedTest = result.results.find(r => !r.success);
      expect(failedTest).toBeDefined();
      expect(failedTest?.error?.message).toBe('Query failed');
    });

    it('should handle test timeouts', async () => {
      const shortTimeoutConfig = { ...config, timeout: 100 };
      const shortTimeoutTester = new SystemIntegrationTester(shortTimeoutConfig);
      
      const mockDbInstance = {
        connect: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200))),
        disconnect: vi.fn().mockResolvedValue(undefined)
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      await expect(shortTimeoutTester.runTests()).rejects.toThrow('Component initialization failed');
    });

    it('should handle API client errors', async () => {
      const mockDbInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      const mockApiInstance = {
        get: vi.fn().mockResolvedValue({ status: 500, data: null })
      };
      mockApiClient.mockImplementation(() => mockApiInstance as any);
      
      const mockAuthInstance = {
        authenticate: vi.fn().mockResolvedValue('test-token'),
        validateToken: vi.fn().mockResolvedValue(true)
      };
      mockAuthService.mockImplementation(() => mockAuthInstance as any);
      
      const mockNotificationInstance = {
        send: vi.fn().mockResolvedValue({ success: true })
      };
      mockNotificationService.mockImplementation(() => mockNotificationInstance as any);
      
      const result = await tester.runTests();
      
      expect(result.success).toBe(false);
      const apiTest = result.results.find(r => r.testName === 'API Integration');
      expect(apiTest?.success).toBe(false);
      expect(apiTest?.error?.message).toContain('API health check failed');
    });

    it('should handle auth service failures', async () => {
      const mockDbInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      const mockApiInstance = {
        get: vi.fn().mockResolvedValue({ status: 200, data: {} })
      };
      mockApiClient.mockImplementation(() => mockApiInstance as any);
      
      const mockAuthInstance = {
        authenticate: vi.fn().mockResolvedValue(null),
        validateToken: vi.fn().mockResolvedValue(false)
      };
      mockAuthService.mockImplementation(() => mockAuthInstance as any);
      
      const mockNotificationInstance = {
        send: vi.fn().mockResolvedValue({ success: true })
      };
      mockNotificationService.mockImplementation(() => mockNotificationInstance as any);
      
      const result = await tester.runTests();
      
      expect(result.success).toBe(false);
      const authTest = result.results.find(r => r.testName === 'Auth Integration');
      expect(authTest?.success).toBe(false);
      expect(authTest?.error?.message).toBe('Authentication failed');
    });

    it('should handle notification service failures', async () => {
      const mockDbInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })
      };
      mockDatabase.mockImplementation(() => mockDbInstance as any);
      
      const mockApiInstance = {
        get: vi.fn().mockResolvedValue({ status: 200, data: {} })
      };
      mockApiClient.mockImplementation(() => mockApiInstance as any);
      
      const mockAuthInstance = {
        authenticate: vi.fn().mockResolvedValue('test-token'),
        validateToken: vi.fn().mockResolvedValue(true)
      };
      mockAuthService.mockImplementation(() => mockAuthInstance as any);
      
      const mockNotificationInstance = {
        send: vi.fn().mockResolvedValue({ success: false, error: 'Network error' })
      };
      mockNotificationService.mockImplementation(() => mockNotificationInstance as any);
      
      const result = await tester.runTests();
      
      expect(result.success).toBe(false);
      const notificationTest = result.results.find(r => r.testName === 'Notification Integration');
      expect(notificationTest?.success).toBe(false);
      expect(notificationTest?.error?.message).toContain('Notification sending failed');
    });
  });
});