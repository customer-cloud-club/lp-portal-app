/**
 * 会員管理システム用テーブルセットアップスクリプト
 *
 * 1. ログイン履歴テーブルを作成
 * 2. 通知登録テーブルにDiscord IDフィールドを追加
 *
 * 使用方法: npx tsx scripts/setup-member-tables.ts
 */

import 'dotenv/config';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const LARKBASE_APP_TOKEN = process.env.LARKBASE_APP_TOKEN;
const NOTIFICATION_TABLE_ID = process.env.LARKBASE_NOTIFICATION_TABLE_ID || 'tbl1ciWJquMptdVN';

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
  if (data.code !== 0) throw new Error(`トークン取得失敗: ${data.msg}`);
  return data.tenant_access_token;
}

/**
 * ログイン履歴テーブルを作成
 */
async function createLoginHistoryTable(token: string): Promise<string | null> {
  console.log('\n📋 ログイン履歴テーブルを作成中...');

  const response = await fetch(`${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table: {
        name: 'ログイン履歴',
        default_view_name: 'デフォルトビュー',
        fields: [
          {
            field_name: 'Discord ID',
            type: 1, // テキスト
          },
          {
            field_name: 'Discordユーザー名',
            type: 1, // テキスト
          },
          {
            field_name: '表示名',
            type: 1, // テキスト
          },
          {
            field_name: 'ログイン日時',
            type: 5, // 日時
            property: {
              date_formatter: 'yyyy/MM/dd HH:mm',
            },
          },
          {
            field_name: 'デバイス種別',
            type: 3, // 単一選択
            property: {
              options: [
                { name: 'PWA', color: 0 },
                { name: 'PC', color: 1 },
                { name: 'Mobile', color: 2 },
                { name: 'Unknown', color: 3 },
              ],
            },
          },
          {
            field_name: 'User-Agent',
            type: 1, // テキスト
          },
          {
            field_name: 'IPアドレス',
            type: 1, // テキスト
          },
        ],
      },
    }),
  });

  const data = await response.json();

  if (data.code === 1254013) {
    console.log('⚠️ ログイン履歴テーブルは既に存在します');
    // 既存テーブルのIDを取得
    const tablesResponse = await fetch(
      `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const tablesData = await tablesResponse.json();
    const loginHistoryTable = tablesData.data?.items?.find(
      (t: { name: string }) => t.name === 'ログイン履歴'
    );
    return loginHistoryTable?.table_id || null;
  }

  if (data.code !== 0) {
    console.error('❌ テーブル作成失敗:', data.msg);
    return null;
  }

  console.log('✅ ログイン履歴テーブル作成成功!');
  console.log(`   テーブルID: ${data.data.table_id}`);
  return data.data.table_id;
}

/**
 * 通知登録テーブルにDiscord IDフィールドを追加
 */
async function addDiscordIdFieldToNotifications(token: string): Promise<boolean> {
  console.log('\n📋 通知登録テーブルにDiscord IDフィールドを追加中...');

  // 既存フィールドを確認
  const fieldsResponse = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${NOTIFICATION_TABLE_ID}/fields`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const fieldsData = await fieldsResponse.json();
  const existingFields = fieldsData.data?.items || [];
  const hasDiscordId = existingFields.some(
    (f: { field_name: string }) => f.field_name === 'Discord ID'
  );

  if (hasDiscordId) {
    console.log('⚠️ Discord IDフィールドは既に存在します');
    return true;
  }

  // フィールドを追加
  const response = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${NOTIFICATION_TABLE_ID}/fields`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        field_name: 'Discord ID',
        type: 1, // テキスト
      }),
    }
  );

  const data = await response.json();

  if (data.code !== 0) {
    console.error('❌ フィールド追加失敗:', data.msg);
    return false;
  }

  console.log('✅ Discord IDフィールド追加成功!');
  return true;
}

async function main() {
  console.log('🚀 会員管理システム テーブルセットアップ開始\n');

  try {
    const token = await getTenantAccessToken();
    console.log('✅ アクセストークン取得成功');

    // 1. ログイン履歴テーブル作成
    const loginHistoryTableId = await createLoginHistoryTable(token);

    // 2. 通知登録テーブルにDiscord IDフィールド追加
    await addDiscordIdFieldToNotifications(token);

    // 結果表示
    console.log('\n========================================');
    console.log('📌 セットアップ完了');
    console.log('========================================');

    if (loginHistoryTableId) {
      console.log('\n.env に以下を追加してください:\n');
      console.log(`LARKBASE_LOGIN_HISTORY_TABLE_ID=${loginHistoryTableId}`);
    }

    console.log('\n========================================\n');
  } catch (error) {
    console.error('❌ エラー:', (error as Error).message);
    process.exit(1);
  }
}

main();
