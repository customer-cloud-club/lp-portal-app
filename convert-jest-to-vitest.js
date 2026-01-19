#!/usr/bin/env node
/**
 * Convert Jest syntax to Vitest syntax in all test files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add vitest import if jest is used
  if (content.includes('jest.') && !content.includes("from 'vitest'")) {
    content = "import { vi } from 'vitest';\n" + content;
    modified = true;
  }

  // Convert jest.mock() to vi.mock()
  if (content.includes('jest.mock(')) {
    content = content.replace(/jest\.mock\(/g, 'vi.mock(');
    modified = true;
  }

  // Convert jest.fn() to vi.fn()
  if (content.includes('jest.fn(')) {
    content = content.replace(/jest\.fn\(/g, 'vi.fn(');
    modified = true;
  }

  // Convert jest.spyOn() to vi.spyOn()
  if (content.includes('jest.spyOn(')) {
    content = content.replace(/jest\.spyOn\(/g, 'vi.spyOn(');
    modified = true;
  }

  // Convert jest.MockedClass to Mock
  if (content.includes('jest.MockedClass')) {
    content = content.replace(/jest\.MockedClass<([^>]+)>/g, 'Mock<$1>');
    modified = true;
  }

  // Convert jest.Mocked to Mock
  if (content.includes('jest.Mocked')) {
    content = content.replace(/jest\.Mocked<([^>]+)>/g, 'Mock<$1>');
    modified = true;
  }

  // Convert jest.MockedFunction to Mock
  if (content.includes('jest.MockedFunction')) {
    content = content.replace(/jest\.MockedFunction<([^>]+)>/g, 'Mock<$1>');
    modified = true;
  }

  // Convert jest.useFakeTimers()
  if (content.includes('jest.useFakeTimers(')) {
    content = content.replace(/jest\.useFakeTimers\(/g, 'vi.useFakeTimers(');
    modified = true;
  }

  // Convert jest.useRealTimers()
  if (content.includes('jest.useRealTimers(')) {
    content = content.replace(/jest\.useRealTimers\(/g, 'vi.useRealTimers(');
    modified = true;
  }

  // Convert jest.clearAllMocks()
  if (content.includes('jest.clearAllMocks(')) {
    content = content.replace(/jest\.clearAllMocks\(/g, 'vi.clearAllMocks(');
    modified = true;
  }

  // Convert jest.resetAllMocks()
  if (content.includes('jest.resetAllMocks(')) {
    content = content.replace(/jest\.resetAllMocks\(/g, 'vi.resetAllMocks(');
    modified = true;
  }

  // Convert jest.restoreAllMocks()
  if (content.includes('jest.restoreAllMocks(')) {
    content = content.replace(/jest\.restoreAllMocks\(/g, 'vi.restoreAllMocks(');
    modified = true;
  }

  // Convert jest.resetModules()
  if (content.includes('jest.resetModules(')) {
    content = content.replace(/jest\.resetModules\(/g, 'vi.resetModules(');
    modified = true;
  }

  // Convert jest.advanceTimersByTime()
  if (content.includes('jest.advanceTimersByTime(')) {
    content = content.replace(/jest\.advanceTimersByTime\(/g, 'vi.advanceTimersByTime(');
    modified = true;
  }

  // Convert jest.runOnlyPendingTimers()
  if (content.includes('jest.runOnlyPendingTimers(')) {
    content = content.replace(/jest\.runOnlyPendingTimers\(/g, 'vi.runOnlyPendingTimers(');
    modified = true;
  }

  // Convert jest.runAllTimers()
  if (content.includes('jest.runAllTimers(')) {
    content = content.replace(/jest\.runAllTimers\(/g, 'vi.runAllTimers(');
    modified = true;
  }

  // Add Mock import from vitest if needed
  if (content.includes('Mock<') && !content.includes('Mock,') && !content.includes('import { Mock }')) {
    content = content.replace(
      "import { vi } from 'vitest';",
      "import { vi, Mock } from 'vitest';"
    );
    modified = true;
  }

  return { content, modified };
}

function main() {
  console.log('🔄 Jest → Vitest 変換スクリプト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find all test files
  const patterns = [
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'tests/**/*.test.ts',
    'tests/**/*.test.tsx'
  ];

  let totalFiles = 0;
  let modifiedFiles = 0;

  patterns.forEach(pattern => {
    const files = glob.sync(pattern);

    files.forEach(filePath => {
      totalFiles++;
      const { content, modified } = convertFile(filePath);

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ ${filePath}`);
        modifiedFiles++;
      }
    });
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 変換完了！`);
  console.log(`📝 対象ファイル: ${totalFiles}個`);
  console.log(`✍️  変更ファイル: ${modifiedFiles}個`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
