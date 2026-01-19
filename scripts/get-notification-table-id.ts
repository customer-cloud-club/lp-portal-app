/**
 * LarkBase 通知登録テーブルIDを取得するスクリプト
 *
 * 使用方法: npx tsx scripts/get-notification-table-id.ts
 */

import 'dotenv/config';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const LARKBASE_APP_TOKEN = process.env.LARKBASE_APP_TOKEN;

if (!APP_ID || !APP_SECRET || !LARKBASE_APP_TOKEN) {
  console.error('❌ 必要な環境変数が設定されていません');
  process.exit(1);
}

async function getTenantAccessToken(): Promise<string> {
  const response = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`トークン取得失敗: ${data.msg}`);
  }

  return data.tenant_access_token;
}

async function listTables(token: string) {
  const response = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (data.code !== 0) {
    console.error('❌ テーブル一覧取得失敗:', data.msg);
    return;
  }

  console.log('\n📋 LarkBaseテーブル一覧:\n');
  for (const table of data.data.items) {
    console.log(`  - ${table.name}: ${table.table_id}`);
    if (table.name === '通知登録') {
      console.log('\n✅ 通知登録テーブルが見つかりました！');
      console.log(`\n.env に以下を追加してください:\nLARKBASE_NOTIFICATION_TABLE_ID=${table.table_id}\n`);
    }
  }
}

async function main() {
  console.log('🔍 LarkBaseテーブルを検索中...\n');

  const token = await getTenantAccessToken();
  await listTables(token);
}

main().catch(console.error);
