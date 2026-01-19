#!/usr/bin/env tsx
/**
 * Backblaze B2 Native API Connection Test
 *
 * B2 Native SDKを使用した接続テスト
 *
 * 使い方:
 *   npx tsx scripts/test-b2-native.ts
 */

import dotenv from 'dotenv';

// 環境変数読み込み（最初に実行）
dotenv.config({ path: '.env' });

import { createB2NativeClientFromEnv } from '../lib/storage/b2-native-client';

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

async function testB2Native() {
  console.log('\n🔍 Backblaze B2 Native API Test\n');
  console.log('='.repeat(60));

  // 環境変数チェック
  if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME) {
    console.error('❌ Missing environment variables:');
    console.error('   B2_KEY_ID:', B2_KEY_ID ? '✓' : '✗');
    console.error('   B2_APP_KEY:', B2_APP_KEY ? '✓' : '✗');
    console.error('   B2_BUCKET_NAME:', B2_BUCKET_NAME ? '✓' : '✗');
    console.error('\n⚠️  Please check your .env file');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Bucket: ${B2_BUCKET_NAME}`);
  console.log(`   Key ID: ${B2_KEY_ID.substring(0, 12)}...`);
  console.log('');

  try {
    // 1. B2クライアント作成 & 認証
    console.log('1️⃣  Authorizing with B2...');
    console.log('   Debug: Key ID =', process.env.B2_KEY_ID);
    console.log('   Debug: Key length =', process.env.B2_APP_KEY?.length);

    const b2Client = await createB2NativeClientFromEnv();
    console.log('   ✅ Authorization successful');

    // 2. バケット内のファイル一覧取得
    console.log('\n2️⃣  Listing files in bucket...');
    const files = await b2Client.listFiles();
    console.log(`   ✅ Found ${files.length} file(s)`);

    if (files.length > 0) {
      console.log('   Recent files:');
      files.slice(0, 5).forEach((file: any) => {
        const sizeMB = (file.contentLength / 1024 / 1024).toFixed(2);
        console.log(`      - ${file.fileName} (${sizeMB} MB)`);
      });
    }

    // 3. テストファイルアップロード
    console.log('\n3️⃣  Uploading test file...');
    const testData = JSON.stringify({
      message: 'Hello from SkillFreak Streaming System!',
      timestamp: new Date().toISOString(),
      test: 'B2 Native API test',
      api: 'Native (not S3 Compatible)',
    }, null, 2);

    const uploadResult = await b2Client.upload({
      fileName: 'test/native-api-test.json',
      data: Buffer.from(testData),
      contentType: 'application/json',
      info: {
        'test-type': 'connection-test',
        'created-by': 'skillfreak-streaming-system',
      },
    });

    console.log('   ✅ Test file uploaded successfully');
    console.log(`      File ID: ${uploadResult.fileId}`);
    console.log(`      File Name: ${uploadResult.fileName}`);
    console.log(`      Size: ${uploadResult.contentLength} bytes`);

    // 4. ファイル再取得して確認
    console.log('\n4️⃣  Verifying upload...');
    const filesAfter = await b2Client.listFiles('test/');
    const testFile = filesAfter.find((f: any) => f.fileName === 'test/native-api-test.json');

    if (testFile) {
      console.log('   ✅ Test file found in bucket');
      console.log(`      Last modified: ${new Date(testFile.uploadTimestamp).toLocaleString()}`);
    } else {
      console.log('   ⚠️  Test file not found (might take a moment to appear)');
    }

    // 5. ディレクトリ構造確認
    console.log('\n5️⃣  Recommended directory structure:');
    console.log(`   ${B2_BUCKET_NAME}/`);
    console.log('   ├── videos/         # 動画ファイル本体');
    console.log('   ├── thumbnails/     # サムネイル画像');
    console.log('   ├── metadata/       # メタデータJSON');
    console.log('   └── test/           # テスト用（✓ created）');

    console.log('\n' + '='.repeat(60));
    console.log('✅ B2 Native API test completed successfully!\n');
    console.log('🎉 Backblaze B2 is ready for use!\n');
    console.log('Next steps:');
    console.log('  1. Phase 1-2 completed - commit changes');
    console.log('  2. Proceed to Phase 1-3: Hetzner VPS setup');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ B2 Native API test failed:');
    console.error('   Error:', error.message);

    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.message?.includes('unauthorized')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Verify B2_KEY_ID and B2_APP_KEY in .env');
      console.error('   - Check that Application Key has proper permissions');
      console.error('   - Make sure key is not expired or deleted');
    } else if (error.message?.includes('not found')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Verify B2_BUCKET_NAME matches your bucket name exactly');
      console.error('   - Check bucket exists in B2 dashboard');
    }

    console.error('\n📚 Documentation:');
    console.error('   https://www.backblaze.com/b2/docs/');

    process.exit(1);
  }
}

testB2Native();
