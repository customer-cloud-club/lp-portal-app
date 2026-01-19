/**
 * LarkBase接続テスト
 */

import * as lark from '@larksuiteoapi/node-sdk';
import * as dotenv from 'dotenv';

dotenv.config();  // Load .env

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

async function testConnection() {
  console.log('Testing LarkBase connection...\n');

  console.log('Environment variables:');
  console.log('LARK_APP_ID:', process.env.LARK_APP_ID);
  console.log('LARKBASE_APP_TOKEN:', process.env.LARKBASE_APP_TOKEN);
  console.log('LARKBASE_TABLE_ID:', process.env.LARKBASE_TABLE_ID);
  console.log('');

  try {
    console.log('Fetching records from LarkBase...');
    const res = await client.bitable.appTableRecord.list({
      path: {
        app_token: process.env.LARKBASE_APP_TOKEN!,
        table_id: process.env.LARKBASE_TABLE_ID!,
      },
      params: {
        page_size: 5,
      },
    });

    console.log('\nResponse code:', res.code);
    console.log('Response message:', res.msg);

    if (res.code === 0) {
      console.log('✅ Success! Found', res.data.items?.length || 0, 'records');
      console.log('\nSample records:');
      console.log(JSON.stringify(res.data.items, null, 2));
    } else {
      console.log('❌ Error:', res.msg);
      console.log('Error details:', JSON.stringify(res, null, 2));
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error);
  }
}

testConnection();
