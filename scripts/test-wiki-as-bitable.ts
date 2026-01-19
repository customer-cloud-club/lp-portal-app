import * as lark from '@larksuiteoapi/node-sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

// WikiドキュメントIDをビットテーブルのapp_tokenとして試す
const BITABLE_APP_TOKEN = 'PxvIwd2fniGE5pkiC0YjHCNEpad';
const TABLE_ID = 'tblnPssJqIBXNi6a';

async function test() {
  console.log('Testing Wiki Document ID as Bitable App Token:');
  console.log('App Token:', BITABLE_APP_TOKEN);
  console.log('Table ID:', TABLE_ID);
  console.log('');

  try {
    const res = await client.bitable.appTableRecord.list({
      path: {
        app_token: BITABLE_APP_TOKEN,
        table_id: TABLE_ID,
      },
      params: {
        page_size: 5,
      },
    });

    console.log('Response code:', res.code);
    console.log('Response message:', res.msg);

    if (res.code === 0) {
      console.log('\n✅ SUCCESS! This IS a bitable!');
      console.log('Found', res.data.items?.length || 0, 'records');
      console.log('\nFirst record:', JSON.stringify(res.data.items?.[0], null, 2));
      
      console.log('\n=================================');
      console.log('Use these values in .env.local:');
      console.log(`LARKBASE_APP_TOKEN=${BITABLE_APP_TOKEN}`);
      console.log(`LARKBASE_TABLE_ID=${TABLE_ID}`);
      console.log('=================================');
    } else {
      console.log('\n❌ Not a valid bitable or no access');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
