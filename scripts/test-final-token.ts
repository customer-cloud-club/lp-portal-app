import * as lark from '@larksuiteoapi/node-sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

const APP_TOKEN = 'SU35bfdM4aa9emsMOZfjIpxdpCf';
const TABLE_ID = 'tblnPssJqIBXNi6a';

async function test() {
  console.log('Testing with new token from Network tab:');
  console.log('App Token:', APP_TOKEN);
  console.log('Table ID:', TABLE_ID);
  console.log('');

  try {
    const res = await client.bitable.appTableRecord.list({
      path: {
        app_token: APP_TOKEN,
        table_id: TABLE_ID,
      },
      params: {
        page_size: 5,
      },
    });

    console.log('Response code:', res.code);
    console.log('Response message:', res.msg);

    if (res.code === 0) {
      console.log('\n🎉🎉🎉 SUCCESS! 🎉🎉🎉');
      console.log('Found', res.data.items?.length || 0, 'records\n');
      
      if (res.data.items && res.data.items.length > 0) {
        console.log('First record sample:');
        console.log(JSON.stringify(res.data.items[0], null, 2));
      }
      
      console.log('\n=================================');
      console.log('✅ Update your .env.local with:');
      console.log(`LARKBASE_APP_TOKEN=${APP_TOKEN}`);
      console.log(`LARKBASE_TABLE_ID=${TABLE_ID}`);
      console.log('=================================');
    } else {
      console.log('\n❌ Failed:', res.msg);
      console.log('Full response:', JSON.stringify(res, null, 2));
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
