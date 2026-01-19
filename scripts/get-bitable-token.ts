/**
 * WikiドキュメントからビットテーブルのトークンID取得
 */

import * as lark from '@larksuiteoapi/node-sdk';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

const WIKI_DOC_TOKEN = 'PxvIwd2fniGE5pkiC0YjHCNEpad';
const TABLE_ID_FROM_URL = 'tblnPssJqIBXNi6a';

async function getTenantAccessToken(): Promise<string> {
  const res = await client.auth.tenantAccessToken.internal({
    data: {
      app_id: process.env.LARK_APP_ID!,
      app_secret: process.env.LARK_APP_SECRET!,
    },
  }) as { code?: number; msg?: string; tenant_access_token?: string };

  if (res.code !== 0) {
    throw new Error(`Failed to get tenant access token: ${res.msg}`);
  }

  return res.tenant_access_token!;
}

async function getBitableToken() {
  console.log('Fetching bitable token from Wiki document...\n');
  console.log('Wiki Document Token:', WIKI_DOC_TOKEN);
  console.log('Table ID (from URL):', TABLE_ID_FROM_URL);
  console.log('');

  try {
    // アクセストークン取得
    console.log('Getting access token...');
    const token = await getTenantAccessToken();
    console.log('✅ Access token obtained\n');

    // WikiドキュメントのブロックをHTTP APIで取得
    console.log('Fetching document blocks via HTTP API...');
    const url = `https://open.larksuite.com/open-apis/docx/v1/documents/${WIKI_DOC_TOKEN}/blocks`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: {
        page_size: 100,
      },
    });

    console.log('Response status:', response.status);
    console.log('Response code:', response.data.code);

    if (response.data.code !== 0) {
      console.log('Error:', response.data.msg);
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      return;
    }

    const blocks = response.data.data?.items || [];
    console.log('Found', blocks.length, 'blocks\n');

    // ビットテーブルブロックを探す
    console.log('Looking for bitable blocks...');
    for (const block of blocks) {
      console.log('Block type:', block.block_type, 'ID:', block.block_id);

      if (block.block_type === 19 || block.block_type === 'bitable') {
        console.log('\n✅ Found bitable block!');
        console.log('Block details:', JSON.stringify(block, null, 2));

        if (block.bitable && block.bitable.token) {
          console.log('\nBitable token:', block.bitable.token);
          return block.bitable.token;
        }
      }
    }

    console.log('\n❌ No bitable block found');
    console.log('\nAll blocks preview:');
    blocks.slice(0, 3).forEach((b: any) => {
      console.log(`- ${b.block_type}: ${b.block_id}`);
    });

  } catch (error: any) {
    console.error('Error occurred:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getBitableToken().then(token => {
  if (token) {
    console.log('\n=================================');
    console.log('🎉 Bitable App Token:', token);
    console.log('Table ID:', TABLE_ID_FROM_URL);
    console.log('=================================');
    console.log('\nUpdate your .env.local:');
    console.log(`LARKBASE_APP_TOKEN=${token}`);
    console.log(`LARKBASE_TABLE_ID=${TABLE_ID_FROM_URL}`);
  }
});
