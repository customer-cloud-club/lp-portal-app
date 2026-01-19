#!/usr/bin/env tsx
/**
 * Backblaze B2 Connection Test
 *
 * B2ストレージへの接続とファイルアップロードをテスト
 *
 * 使い方:
 *   npx tsx scripts/test-b2-connection.ts
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// 環境変数読み込み
dotenv.config({ path: '.env' });

const B2_ENDPOINT = process.env.B2_ENDPOINT;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

async function testB2Connection() {
  console.log('\n🔍 Backblaze B2 Connection Test\n');
  console.log('='.repeat(60));

  // 環境変数チェック
  if (!B2_ENDPOINT || !B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME) {
    console.error('❌ Missing environment variables:');
    console.error('   B2_ENDPOINT:', B2_ENDPOINT ? '✓' : '✗');
    console.error('   B2_KEY_ID:', B2_KEY_ID ? '✓' : '✗');
    console.error('   B2_APP_KEY:', B2_APP_KEY ? '✓' : '✗');
    console.error('   B2_BUCKET_NAME:', B2_BUCKET_NAME ? '✓' : '✗');
    console.error('\n⚠️  Please check your .env file');
    console.error('\n📝 Setup instructions:');
    console.error('   1. Create Backblaze B2 account: https://www.backblaze.com/b2/sign-up.html');
    console.error('   2. Create bucket: skillfreak-archives');
    console.error('   3. Create Application Key');
    console.error('   4. Add credentials to .env file');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Endpoint: ${B2_ENDPOINT}`);
  console.log(`   Bucket: ${B2_BUCKET_NAME}`);
  console.log(`   Key ID: ${B2_KEY_ID.substring(0, 10)}...`);
  console.log('');

  // S3クライアント作成（B2はS3互換API）
  const s3Client = new S3Client({
    endpoint: B2_ENDPOINT,
    region: 'us-west-004', // B2 US-West region
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APP_KEY,
    },
  });

  try {
    // 1. バケット一覧取得テスト
    console.log('1️⃣  Testing bucket access...');
    const listCommand = new ListBucketsCommand({});
    const listResult = await s3Client.send(listCommand);

    console.log(`   ✅ Found ${listResult.Buckets?.length || 0} bucket(s)`);
    if (listResult.Buckets) {
      listResult.Buckets.forEach(bucket => {
        console.log(`      - ${bucket.Name}`);
      });
    }

    // 2. 指定バケットの存在確認
    console.log('\n2️⃣  Checking target bucket...');
    try {
      const headCommand = new HeadBucketCommand({ Bucket: B2_BUCKET_NAME });
      await s3Client.send(headCommand);
      console.log(`   ✅ Bucket "${B2_BUCKET_NAME}" exists and is accessible`);
    } catch (error: any) {
      if (error.name === 'NotFound') {
        console.error(`   ❌ Bucket "${B2_BUCKET_NAME}" not found`);
        console.error('   📝 Create bucket in B2 console first');
        process.exit(1);
      } else {
        throw error;
      }
    }

    // 3. テストファイルアップロード
    console.log('\n3️⃣  Testing file upload...');
    const testData = JSON.stringify({
      message: 'Hello from SkillFreak Streaming System!',
      timestamp: new Date().toISOString(),
      test: 'B2 connection test',
    }, null, 2);

    const putCommand = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: 'test/connection-test.json',
      Body: Buffer.from(testData),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);
    console.log('   ✅ Test file uploaded successfully');
    console.log(`      Key: test/connection-test.json`);
    console.log(`      Size: ${testData.length} bytes`);

    // 4. ディレクトリ構造確認
    console.log('\n4️⃣  Recommended directory structure:');
    console.log('   skillfreak-archives/');
    console.log('   ├── videos/         # 動画ファイル本体');
    console.log('   ├── thumbnails/     # サムネイル画像');
    console.log('   ├── metadata/       # メタデータJSON');
    console.log('   └── test/           # テスト用（✓ created）');

    console.log('\n' + '='.repeat(60));
    console.log('✅ B2 connection test completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Ready for Phase 1-3: Hetzner VPS setup');
    console.log('  2. Implement video download service (Phase 2)');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ B2 connection test failed:');
    console.error('   Error:', error.message);

    if (error.Code === 'InvalidAccessKeyId') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check B2_KEY_ID in .env');
      console.error('   - Verify Application Key is active in B2 console');
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check B2_APP_KEY in .env');
      console.error('   - Regenerate Application Key if needed');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check B2_ENDPOINT in .env');
      console.error('   - Verify internet connection');
    }

    console.error('\n📚 Documentation:');
    console.error('   https://www.backblaze.com/b2/docs/s3_compatible_api.html');

    process.exit(1);
  }
}

testB2Connection();
