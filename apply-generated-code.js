#!/usr/bin/env node
/**
 * Script to apply all generated code from Miyabi agents to the project
 */

const fs = require('fs');
const path = require('path');

const STORAGE_BASE = '/Users/mashimaro/.miyabi/storage/IvyGain-skillfreak-streaming-system';
const PROJECT_ROOT = '/Users/mashimaro/skillfreak-streaming-system';

async function applyGeneratedCode() {
  console.log('🌸 Miyabi コード適用スクリプト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let totalFiles = 0;
  let totalTests = 0;

  for (let issueNum = 4; issueNum <= 13; issueNum++) {
    const outputPath = path.join(STORAGE_BASE, `issue-${issueNum}`, 'codegen-output.json');

    if (!fs.existsSync(outputPath)) {
      console.log(`⚠️  Issue #${issueNum}: codegen-output.json not found`);
      continue;
    }

    try {
      const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      console.log(`\n📝 Issue #${issueNum}: ${output.files.length} files, ${output.tests.length} tests`);

      // Apply main files
      for (const file of output.files) {
        const filePath = path.join(PROJECT_ROOT, file.path);
        const dir = path.dirname(filePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, file.content, 'utf8');
        console.log(`  ✍️  ${file.path}`);
        totalFiles++;
      }

      // Apply test files
      for (const test of output.tests) {
        const testPath = path.join(PROJECT_ROOT, test.path);
        const testDir = path.dirname(testPath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }

        // Write test file
        fs.writeFileSync(testPath, test.content, 'utf8');
        console.log(`  🧪 ${test.path}`);
        totalTests++;
      }

      console.log(`  ✅ Issue #${issueNum} 完了 (Quality: ${output.qualityScore}/100)`);
    } catch (error) {
      console.error(`  ❌ Issue #${issueNum} エラー:`, error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 コード適用完了！`);
  console.log(`📝 適用ファイル: ${totalFiles}個`);
  console.log(`🧪 適用テスト: ${totalTests}個`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

applyGeneratedCode().catch(console.error);
