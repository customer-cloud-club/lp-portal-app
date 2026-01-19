/**
 * LarkBase 通知登録テーブル自動セットアップスクリプト
 *
 * このスクリプトはLarkBase APIを使用して通知登録テーブルを自動作成します。
 * 実行後、テーブルIDを.envのLARKBASE_NOTIFICATION_TABLE_IDに設定してください。
 *
 * 使用方法: npx tsx scripts/setup-notification-table.ts
 */

import 'dotenv/config';

const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

// 環境変数から取得
const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const LARKBASE_APP_TOKEN = process.env.LARKBASE_APP_TOKEN;

if (!APP_ID || !APP_SECRET || !LARKBASE_APP_TOKEN) {
  console.error('❌ 必要な環境変数が設定されていません:');
  console.error('  - LARK_APP_ID');
  console.error('  - LARK_APP_SECRET');
  console.error('  - LARKBASE_APP_TOKEN');
  process.exit(1);
}

/**
 * tenant_access_token を取得
 */
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

/**
 * テーブルを作成
 */
async function createTable(token: string): Promise<string> {
  console.log('📋 通知登録テーブルを作成中...');

  const response = await fetch(
    `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: {
          name: '通知登録',
          default_view_name: 'デフォルトビュー',
          fields: [
            {
              field_name: '通知アドレス',
              type: 1, // テキスト
            },
            {
              field_name: 'キーP256dh',
              type: 1, // テキスト
            },
            {
              field_name: 'キーAuth',
              type: 1, // テキスト
            },
            {
              field_name: 'イベントID',
              type: 1, // テキスト
            },
            {
              field_name: 'イベント名',
              type: 1, // テキスト
            },
            {
              field_name: 'イベント日時',
              type: 5, // 日付時刻
              property: {
                date_formatter: 'yyyy/MM/dd HH:mm',
              },
            },
            {
              field_name: '朝通知',
              type: 7, // チェックボックス
            },
            {
              field_name: '15分前通知',
              type: 7, // チェックボックス
            },
            {
              field_name: '5分前通知',
              type: 7, // チェックボックス
            },
            {
              field_name: '朝通知済み',
              type: 7, // チェックボックス
            },
            {
              field_name: '15分前通知済み',
              type: 7, // チェックボックス
            },
            {
              field_name: '5分前通知済み',
              type: 7, // チェックボックス
            },
            {
              field_name: '登録日時',
              type: 5, // 日付時刻
              property: {
                date_formatter: 'yyyy/MM/dd HH:mm',
              },
            },
          ],
        },
      }),
    }
  );

  const data = await response.json();

  if (data.code !== 0) {
    console.error('❌ テーブル作成失敗:', data.msg);
    console.error('詳細:', JSON.stringify(data, null, 2));
    throw new Error(`テーブル作成失敗: ${data.msg}`);
  }

  const tableId = data.data.table_id;
  console.log('✅ テーブル作成成功!');
  console.log(`📝 テーブルID: ${tableId}`);

  return tableId;
}

/**
 * .envファイルを更新（手動で行う場合のガイド）
 */
function showEnvSetupGuide(tableId: string) {
  console.log('\n========================================');
  console.log('📌 次のステップ:');
  console.log('========================================');
  console.log('以下の行を .env ファイルに追加してください:\n');
  console.log(`LARKBASE_NOTIFICATION_TABLE_ID=${tableId}`);
  console.log('\n========================================');
  console.log('追加後、デプロイを実行してください:');
  console.log('npm run deploy');
  console.log('========================================\n');
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 LarkBase 通知登録テーブル セットアップ開始\n');

  try {
    // 1. トークン取得
    console.log('🔑 アクセストークンを取得中...');
    const token = await getTenantAccessToken();
    console.log('✅ トークン取得成功\n');

    // 2. テーブル作成
    const tableId = await createTable(token);

    // 3. セットアップガイド表示
    showEnvSetupGuide(tableId);

    console.log('🎉 セットアップ完了!');
  } catch (error) {
    console.error('❌ エラー:', (error as Error).message);
    process.exit(1);
  }
}

main();
