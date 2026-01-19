/**
 * LP API テストスクリプト
 */

import 'dotenv/config';

const LARKBASE_CONFIG = {
  appToken: 'EG7kb49Sqaijy7seo2vjYxIdp3f',
  tableId: 'tbleuPP6QtZt3Dm8',  // LPテーブル（環境変数を使わず直接指定）
  appId: process.env.LARK_APP_ID || 'cli_a9da5d0d8af8de1a',
  appSecret: process.env.LARK_APP_SECRET || 'PZhfO1sv3vwLRsQQeDbdPbtJZWTz4Wgd',
};

async function getTenantAccessToken(): Promise<string> {
  const response = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: LARKBASE_CONFIG.appId,
      app_secret: LARKBASE_CONFIG.appSecret,
    }),
  });

  const data = await response.json();
  console.log('Token response:', data.code === 0 ? 'OK' : data);
  return data.tenant_access_token;
}

async function testGetRecords() {
  console.log('🔍 LPレコード取得テスト\n');
  console.log('Config:', {
    appToken: LARKBASE_CONFIG.appToken,
    tableId: LARKBASE_CONFIG.tableId,
    appId: LARKBASE_CONFIG.appId ? 'SET' : 'NOT SET',
    appSecret: LARKBASE_CONFIG.appSecret ? 'SET' : 'NOT SET',
  });

  const token = await getTenantAccessToken();
  console.log('\nToken取得:', token ? 'OK' : 'FAILED');

  // フィルターなしで全件取得
  console.log('\n--- フィルターなしで取得 ---');
  const url1 = `https://open.larksuite.com/open-apis/bitable/v1/apps/${LARKBASE_CONFIG.appToken}/tables/${LARKBASE_CONFIG.tableId}/records?page_size=100`;

  const response1 = await fetch(url1, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data1 = await response1.json();
  console.log('Response code:', data1.code);
  console.log('Message:', data1.msg);
  console.log('Total records:', data1.data?.total);

  if (data1.data?.items) {
    console.log('\nRecords:');
    data1.data.items.forEach((item: any, i: number) => {
      console.log(`\n${i + 1}. Record ID: ${item.record_id}`);
      console.log('   Fields:', JSON.stringify(item.fields, null, 2).slice(0, 500));
    });
  }

  // フィルターありで取得 - 様々な構文をテスト
  console.log('\n--- フィルター構文テスト ---');

  const filterVariants = [
    'CurrentValue.[ポータルで公開]=TRUE',
    'CurrentValue.[ポータルで公開]=true',
    'CurrentValue.[ポータルで公開]="TRUE"',
    'CurrentValue.[ポータルで公開]=1',
    '[ポータルで公開]=TRUE',
    'ポータルで公開=TRUE',
  ];

  for (const filter of filterVariants) {
    const url2 = `https://open.larksuite.com/open-apis/bitable/v1/apps/${LARKBASE_CONFIG.appToken}/tables/${LARKBASE_CONFIG.tableId}/records?page_size=100&filter=${encodeURIComponent(filter)}`;

    const response2 = await fetch(url2, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data2 = await response2.json();
    console.log(`Filter: "${filter}" -> code: ${data2.code}, records: ${data2.data?.total ?? 'N/A'}, msg: ${data2.msg}`);
  }
}

testGetRecords().catch(console.error);
