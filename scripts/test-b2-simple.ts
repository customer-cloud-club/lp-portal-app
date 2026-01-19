#!/usr/bin/env tsx
import B2 from 'backblaze-b2';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  console.log('\n🔍 B2 Simple Test\n');

  const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID!,
    applicationKey: process.env.B2_APP_KEY!,
  });

  try {
    // Authorize
    console.log('1️⃣  Authorizing...');
    const authResponse = await b2.authorize();
    console.log('   ✅ Authorized');
    console.log('   Account ID:', authResponse.data.accountId);

    // List buckets
    console.log('\n2️⃣  Listing buckets...');
    const bucketsResponse = await b2.listBuckets({});
    console.log('   ✅ Found', bucketsResponse.data.buckets.length, 'bucket(s)');

    const bucket = bucketsResponse.data.buckets.find(
      b => b.bucketName === process.env.B2_BUCKET_NAME
    );

    if (bucket) {
      console.log('   ✅ Target bucket found:', bucket.bucketName);
      console.log('      Bucket ID:', bucket.bucketId);

      // Upload test file
      console.log('\n3️⃣  Uploading test file...');
      const uploadUrlResponse = await b2.getUploadUrl({ bucketId: bucket.bucketId });

      const testData = Buffer.from(JSON.stringify({
        test: 'B2 connection',
        timestamp: new Date().toISOString(),
      }, null, 2));

      const uploadResponse = await b2.uploadFile({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        uploadAuthToken: uploadUrlResponse.data.authorizationToken,
        fileName: 'test/simple-test.json',
        data: testData,
        contentType: 'application/json',
      });

      console.log('   ✅ File uploaded');
      console.log('      File ID:', uploadResponse.data.fileId);
      console.log('      File Name:', uploadResponse.data.fileName);

      console.log('\n✅ All tests passed!\n');
    } else {
      console.log('   ❌ Bucket not found:', process.env.B2_BUCKET_NAME);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

test();
