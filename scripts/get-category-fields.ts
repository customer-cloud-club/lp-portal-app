import 'dotenv/config';
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
  domain: lark.Domain.Lark,
});

async function getTableFields() {
  const appToken = process.env.LARKBASE_APP_TOKEN || '';
  const tableId = process.env.LARKBASE_TABLE_ID || '';

  console.log('Fetching fields from LarkBase...');
  console.log('App Token:', appToken);
  console.log('Table ID:', tableId);

  const response = await client.bitable.appTableField.list({
    path: {
      app_token: appToken,
      table_id: tableId,
    },
  });

  if (response.data?.items) {
    for (const field of response.data.items) {
      if (field.field_name === 'カテゴリ' || field.field_name?.includes('カテゴリ')) {
        console.log('\n=== カテゴリフィールド ===');
        console.log('Field Name:', field.field_name);
        console.log('Field ID:', field.field_id);
        console.log('Type:', field.type);
        console.log('Options:', JSON.stringify(field.property, null, 2));
      }
    }
  }
}

getTableFields().catch(console.error);
