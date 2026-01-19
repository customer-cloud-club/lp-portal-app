import { vi, Mock } from 'vitest';
/**
 * Tests for IntegrationTestRunner
 */

import { IntegrationTestRunner, TestEnvironment } from './test-runner';
import { SystemIntegrationTester, SystemTestResult } from './system-integration';
import { Logger } from '../utils/logger';

// Mock dependencies
vi.mock('./system-integration');
vi.mock('../utils/logger');

const mockSystemIntegrationTester = SystemIntegrationTester as Mock<typeof SystemIntegrationTester>;
const mockLogger = Logger as Mock<typeof Logger>;

describe('IntegrationTestRunner', () => {
  let environments: TestEnvironment[];
  let runner: IntegrationTestRunner;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    environments = [
      {
        name: 'development',
        config: {
          databaseUrl: 'postgresql://localhost:5432/dev',
          apiBaseUrl: 'http://localhost:3000',
          authConfig: { clientId: 'dev-client', clientSecret: 'dev-secret' },
          notificationConfig: { webhookUrl: 'http://localhost:3001/webhook', retryAttempts: 3 },
          timeout: 30000
        }
      },
      {
        name: 'staging',
        config: {
          databaseUrl: 'postgresql://staging-db:5432/app',
          apiBaseUrl: 'https://staging-api.example.com',
          authConfig: { clientId: 'staging-client', clientSecret: 'staging-secret' },
          notificationConfig: { webhookUrl: 'https://staging-webhook.example.com', retryAttempts: 5 },
          timeout: 45000
        }
      }
    ];
    
    runner = new IntegrationTestRunner(environments);
  });

  describe('constructor', () => {
    it('should create instance with environments', () => {
      expect(runner).toBeInstanceOf(IntegrationTestRunner);
      expect(mockLogger).toHaveBeenCalledWith('IntegrationTestRunner');
    });
  });

  describe('runAllEnvironments', () => {
    it('should run tests for all environments successfully', async () => {
      const mockSuccessResult: SystemTestResult = {
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        duration: 1000,
        results: [
          { testName: 'Database Integration', success: true, duration: 200 },
          { testName: 'API Integration', success: true, duration: 300 },
          { testName: 'Auth Integration', success: true, duration: 250 },
          { testName: 'Notification Integration', success: true, duration: 150 },
          { testName: 'End-to-End Workflow', success: true, duration: 100 }
        ],
        success: true
      };
      
      const mockRunTests = vi.fn().mockResolvedValue(mockSuccessResult);
      mockSystemIntegrationTester.mockImplementation(() => ({
        runTests: mockRunTests
      } as any));
      
      const results = await runner.runAllEnvironments();
      
      expect(results.size).toBe(2);
      expect(results.get('development')).toEqual(mockSuccessResult);
      expect(results.get('staging')).toEqual(mockSuccessResult);
      expect(mockSystemIntegrationTester).toHaveBeenCalledTimes(2);
      expect(mockRunTests).toHaveBeenCalledTimes(2);
    });

    it('should handle test failures in one environment', async () => {
      const mockSuccessResult: SystemTestResult = {
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        duration: 1000,
        results: [],
        success: true
      };
      
      const mockFailureResult: SystemTestResult = {
        totalTests: 5,
        passedTests: 3,
        failedTests: 2,
        duration: 800,
        results: [
          { testName: 'Database Integration', success: true, duration: 200 },
          { testName: 'API Integration', success: false, duration: 300, error: new Error('API connection failed') },
          { testName: 'Auth Integration', success: true, duration: 250 },
          { testName: 'Notification Integration', success: false, duration: 150, error: new Error('Webhook unreachable') },
          { testName: 'End-to-End Workflow', success: true, duration: 100 }
        ],
        success: false
      };
      
      const mockRunTests = vi.fn()
        .mockResolvedValueOnce(mockSuccessResult)
        .mockResolvedValueOnce(mockFailureResult);
      
      mockSystemIntegrationTester.mockImplementation(() => ({
        runTests: mockRunTests
      } as any));
      
      const results = await runner.runAllEnvironments();
      
      expect(results.size).toBe(2);
      expect(results.get('development')?.success).toBe(true);
      expect(results.get('staging')?.success).toBe(false);
      expect(results.get('staging')?.failedTests).toBe(2);
    });

    it('should handle tester initialization failures', async () => {
      const mockRunTests = vi.fn()
        .mockResolvedValueOnce({
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          duration: 1000,
          results: [],
          success: true
        })
        .mockRejectedValueOnce(new Error('Initialization failed'));
      
      mockSystemIntegrationTester.mockImplementation(() => ({
        runTests: mockRunTests
      } as any));
      
      const results = await runner.runAllEnvironments();
      
      expect(results.size).toBe(2);
      expect(results.get('development')?.success).toBe(true);
      expect(results.get('staging')?.success).toBe(false);
      expect(results.get('staging')?.totalTests).toBe(0);
      expect(results.get('staging')?.failedTests).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report for all environments', () => {
      const results = new Map<string, SystemTestResult>();
      
      results.set('development', {
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        duration: 1000,
        results: [
          { testName: 'Database Integration', success: true, duration: 200 },
          { testName: 'API Integration', success: true, duration: 300 }
        ],
        success: true
      });
      
      results.set('staging', {
        totalTests: 5,
        passedTests: 3,
        failedTests: 2,
        duration: 800,
        results: [
          { testName: 'Database Integration', success: true, duration: 200 },
          { testName: 'API Integration', success: false, duration: 300, error: new Error('Connection failed') }
        ],
        success: false
      });
      
      const report = runner.generateReport(results);
      
      expect(report).toContain('SYSTEM INTEGRATION TEST REPORT');
      expect(report).toContain('Environment: development');
      expect(report).toContain('Status: PASSED');
      expect(report).toContain('Environment: staging');
      expect(report).toContain('Status: FAILED');
      expect(report).toContain('✓ Database Integration');
      expect(report).toContain('✗ API Integration');
      expect(report).toContain('Error: Connection failed');
      expect(report).toContain('SUMMARY: 1/2 environments passed');
    });

    it('should handle empty results', () => {
      const results = new Map<string, SystemTestResult>();
      
      const report = runner.generateReport(results);
      
      expect(report).toContain('SYSTEM INTEGRATION TEST REPORT');
      expect(report).toContain('SUMMARY: 0/0 environments passed');
    });

    it('should handle results with no individual test results', () => {
      const results = new Map<string, SystemTestResult>();
      
      results.set('test-env', {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        results: [],
        success: true
      });
      
      const report = runner.generateReport(results);
      
      expect(report).toContain('Environment: test-env');
      expect(report).toContain('Status: PASSED');
      expect(report).toContain('Total Tests: 0');
      expect(report).not.toContain('Test Details:');
    });
  });
});