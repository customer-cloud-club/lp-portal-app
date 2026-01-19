/**
 * LarkBase テーブル一覧・フィールド構造確認スクリプト
 */

import 'dotenv/config';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const LARKBASE_APP_TOKEN = process.env.LARKBASE_APP_TOKEN;

async function getTenantAccessToken(): Promise<string> {
  const response = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const data = await response.json();
  return data.tenant_access_token;
}

async function listTables(token: string) {
  const response = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  const data = await response.json();
  return data.data.items;
}

async function getTableFields(token: string, tableId: string) {
  const response = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${tableId}/fields`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  const data = await response.json();
  return data.data.items;
}

async function main() {
  console.log('🔍 LarkBase テーブル構造を確認中...\n');

  const token = await getTenantAccessToken();
  const tables = await listTables(token);

  // Stripe関連とイベント管理テーブルを詳しく確認
  const targetTables = ['Stripe_Customer', 'Payment intents', '通知登録', 'イベント管理'];

  for (const table of tables) {
    if (targetTables.includes(table.name)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 テーブル: ${table.name}`);
      console.log(`   ID: ${table.table_id}`);
      console.log(`${'='.repeat(60)}`);

      const fields = await getTableFields(token, table.table_id);
      console.log('\nフィールド一覧:');
      for (const field of fields) {
        const typeNames: Record<number, string> = {
          1: 'テキスト',
          2: '数値',
          3: '単一選択',
          4: '複数選択',
          5: '日時',
          7: 'チェックボックス',
          11: 'ユーザー',
          13: '電話番号',
          15: 'URL',
          17: '添付ファイル',
          18: 'リンク',
          19: '式',
          20: '作成日時',
          21: '更新日時',
          22: '作成者',
          23: '更新者',
        };
        const typeName = typeNames[field.type] || `type=${field.type}`;
        console.log(`  - ${field.field_name} (${typeName})`);
      }
    }
  }

  console.log('\n\n📝 全テーブル一覧:');
  for (const table of tables) {
    console.log(`  - ${table.name}: ${table.table_id}`);
  }
}

main().catch(console.error);
