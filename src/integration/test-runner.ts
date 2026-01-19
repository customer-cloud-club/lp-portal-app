/**
 * Test runner for executing system integration tests
 */

import { SystemIntegrationTester, SystemIntegrationConfig, SystemTestResult } from './system-integration';
import { Logger } from '../utils/logger';

/**
 * Test environment configuration
 */
export interface TestEnvironment {
  readonly name: string;
  readonly config: SystemIntegrationConfig;
}

/**
 * Multi-environment test runner
 */
export class IntegrationTestRunner {
  private readonly logger: Logger;
  private readonly environments: readonly TestEnvironment[];

  constructor(environments: readonly TestEnvironment[]) {
    this.logger = new Logger('IntegrationTestRunner');
    this.environments = environments;
  }

  /**
   * Run integration tests across all environments
   */
  public async runAllEnvironments(): Promise<Map<string, SystemTestResult>> {
    const results = new Map<string, SystemTestResult>();
    
    for (const environment of this.environments) {
      this.logger.info(`Running tests for environment: ${environment.name}`);
      
      try {
        const tester = new SystemIntegrationTester(environment.config);
        const result = await tester.runTests();
        results.set(environment.name, result);
        
        if (result.success) {
          this.logger.info(`Environment ${environment.name}: All tests passed`);
        } else {
          this.logger.error(`Environment ${environment.name}: ${result.failedTests} tests failed`);
        }
      } catch (error) {
        this.logger.error(`Environment ${environment.name} failed:`, error);
        
        // Create failed result
        const failedResult: SystemTestResult = {
          totalTests: 0,
          passedTests: 0,
          failedTests: 1,
          duration: 0,
          results: [],
          success: false
        };
        
        results.set(environment.name, failedResult);
      }
    }
    
    return results;
  }

  /**
   * Generate test report
   */
  public generateReport(results: Map<string, SystemTestResult>): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('SYSTEM INTEGRATION TEST REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    
    let totalEnvironments = 0;
    let passedEnvironments = 0;
    
    for (const [environmentName, result] of results) {
      totalEnvironments++;
      if (result.success) {
        passedEnvironments++;
      }
      
      lines.push(`Environment: ${environmentName}`);
      lines.push('-'.repeat(40));
      lines.push(`Status: ${result.success ? 'PASSED' : 'FAILED'}`);
      lines.push(`Total Tests: ${result.totalTests}`);
      lines.push(`Passed: ${result.passedTests}`);
      lines.push(`Failed: ${result.failedTests}`);
      lines.push(`Duration: ${result.duration}ms`);
      lines.push('');
      
      if (result.results.length > 0) {
        lines.push('Test Details:');
        for (const testResult of result.results) {
          const status = testResult.success ? '✓' : '✗';
          lines.push(`  ${status} ${testResult.testName} (${testResult.duration}ms)`);
          if (testResult.error) {
            lines.push(`    Error: ${testResult.error.message}`);
          }
        }
        lines.push('');
      }
    }
    
    lines.push('='.repeat(80));
    lines.push(`SUMMARY: ${passedEnvironments}/${totalEnvironments} environments passed`);
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }
}