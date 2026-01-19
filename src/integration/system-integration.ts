/**
 * Full system integration test utilities
 * Provides end-to-end testing capabilities for the entire system
 */

import { EventEmitter } from 'events';

/**
 * Configuration for system integration tests
 */
export interface SystemIntegrationConfig {
  /** Timeout for individual test operations in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Environment configuration */
  environment: 'test' | 'development' | 'staging';
  /** Database connection settings */
  database: {
    host: string;
    port: number;
    name: string;
  };
  /** API endpoint configuration */
  api: {
    baseUrl: string;
    version: string;
  };
}

/**
 * Test execution result
 */
export interface TestResult {
  /** Test identifier */
  testId: string;
  /** Test name */
  name: string;
  /** Execution status */
  status: 'passed' | 'failed' | 'skipped';
  /** Execution duration in milliseconds */
  duration: number;
  /** Error message if test failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Test suite execution summary
 */
export interface TestSuiteResult {
  /** Suite identifier */
  suiteId: string;
  /** Suite name */
  name: string;
  /** Total number of tests */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Number of skipped tests */
  skippedTests: number;
  /** Total execution duration */
  duration: number;
  /** Individual test results */
  results: TestResult[];
}

/**
 * System integration test runner
 * Orchestrates full system testing workflows
 */
export class SystemIntegrationTester extends EventEmitter {
  private readonly config: SystemIntegrationConfig;
  private readonly testSuites: Map<string, TestResult[]> = new Map();
  private isRunning: boolean = false;

  /**
   * Creates a new system integration tester
   * @param config - Configuration for the test runner
   */
  constructor(config: SystemIntegrationConfig) {
    super();
    this.config = this.validateConfig(config);
  }

  /**
   * Validates the provided configuration
   * @param config - Configuration to validate
   * @returns Validated configuration
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: SystemIntegrationConfig): SystemIntegrationConfig {
    if (!config) {
      throw new Error('Configuration is required');
    }
    
    if (config.timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
    
    if (config.maxRetries < 0) {
      throw new Error('Max retries cannot be negative');
    }
    
    if (!config.database?.host || !config.api?.baseUrl) {
      throw new Error('Database and API configuration are required');
    }
    
    return config;
  }

  /**
   * Executes a complete system integration test suite
   * @param suiteName - Name of the test suite
   * @param testFunctions - Array of test functions to execute
   * @returns Promise resolving to test suite results
   */
  async runTestSuite(
    suiteName: string,
    testFunctions: Array<() => Promise<void>>
  ): Promise<TestSuiteResult> {
    if (this.isRunning) {
      throw new Error('Test suite is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const results: TestResult[] = [];
    const suiteId = `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.emit('suiteStarted', { suiteId, name: suiteName });

      for (let i = 0; i < testFunctions.length; i++) {
        const testId = `test_${i}_${Date.now()}`;
        const testName = testFunctions[i].name || `Test ${i + 1}`;
        
        const result = await this.executeTest(
          testId,
          testName,
          testFunctions[i]
        );
        
        results.push(result);
        this.emit('testCompleted', result);
      }

      const suiteResult: TestSuiteResult = {
        suiteId,
        name: suiteName,
        totalTests: testFunctions.length,
        passedTests: results.filter(r => r.status === 'passed').length,
        failedTests: results.filter(r => r.status === 'failed').length,
        skippedTests: results.filter(r => r.status === 'skipped').length,
        duration: Date.now() - startTime,
        results
      };

      this.testSuites.set(suiteId, results);
      this.emit('suiteCompleted', suiteResult);
      
      return suiteResult;
    } catch (error) {
      this.emit('suiteError', { suiteId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executes an individual test with retry logic
   * @param testId - Unique test identifier
   * @param testName - Human-readable test name
   * @param testFunction - Test function to execute
   * @returns Promise resolving to test result
   */
  private async executeTest(
    testId: string,
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<TestResult> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await Promise.race([
          testFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), this.config.timeout)
          )
        ]);

        return {
          testId,
          name: testName,
          status: 'passed',
          duration: Date.now() - startTime,
          metadata: { attempts: attempt + 1 }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return {
      testId,
      name: testName,
      status: 'failed',
      duration: Date.now() - startTime,
      error: lastError?.message || 'Test failed',
      metadata: { attempts: this.config.maxRetries + 1 }
    };
  }

  /**
   * Retrieves test results for a specific suite
   * @param suiteId - Suite identifier
   * @returns Test results or undefined if suite not found
   */
  getTestResults(suiteId: string): TestResult[] | undefined {
    return this.testSuites.get(suiteId);
  }

  /**
   * Clears all stored test results
   */
  clearResults(): void {
    this.testSuites.clear();
  }

  /**
   * Checks if the test runner is currently executing tests
   * @returns True if tests are running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Utility method to add delay
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Creates a system integration tester with default configuration
 * @param overrides - Configuration overrides
 * @returns Configured SystemIntegrationTester instance
 */
export function createSystemTester(
  overrides: Partial<SystemIntegrationConfig> = {}
): SystemIntegrationTester {
  const defaultConfig: SystemIntegrationConfig = {
    timeout: 30000,
    maxRetries: 2,
    environment: 'test',
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db'
    },
    api: {
      baseUrl: 'http://localhost:3000',
      version: 'v1'
    },
    ...overrides
  };

  return new SystemIntegrationTester(defaultConfig);
}
