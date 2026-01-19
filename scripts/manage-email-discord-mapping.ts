/**
 * メール↔Discord IDマッピング管理スクリプト
 *
 * Lメッセージ経由の既存会員をDiscord IDと紐付けるためのツール
 *
 * 使い方:
 *   # マッピング一覧表示
 *   npx ts-node scripts/manage-email-discord-mapping.ts list
 *
 *   # 単一マッピング追加
 *   npx ts-node scripts/manage-email-discord-mapping.ts add <email> <discord_id> [note]
 *
 *   # CSVファイルから一括インポート
 *   npx ts-node scripts/manage-email-discord-mapping.ts import <csv_file>
 *   # CSVフォーマット: email,discord_id,discord_username,note
 *
 *   # メールでDiscord IDを検索
 *   npx ts-node scripts/manage-email-discord-mapping.ts find <email>
 *
 *   # Stripeの全顧客メールを表示（マッピング登録用）
 *   npx ts-node scripts/manage-email-discord-mapping.ts stripe-customers
 */

import 'dotenv/config';
import * as fs from 'fs';

// Lark API設定
const LARK_API_BASE = 'https://open.larksuite.com/open-apis';
const LARK_APP_ID = process.env.LARK_APP_ID || '';
const LARK_APP_SECRET = process.env.LARK_APP_SECRET || '';
const LARKBASE_APP_TOKEN = process.env.LARKBASE_APP_TOKEN || '';
const EMAIL_DISCORD_MAPPING_TABLE_ID = process.env.LARKBASE_EMAIL_DISCORD_MAPPING_TABLE_ID || '';

// Stripe API設定
const STRIPE_SECRET_KEY = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';

// Access Token キャッシュ
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const response = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Lark API error: ${data.msg}`);
  }

  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + data.expire * 1000,
  };

  return cachedToken.token;
}

// マッピング一覧を取得
async function listMappings(): Promise<void> {
  if (!EMAIL_DISCORD_MAPPING_TABLE_ID) {
    console.error('Error: LARKBASE_EMAIL_DISCORD_MAPPING_TABLE_ID is not set');
    console.log('\n.env.local に以下を追加してください:');
    console.log('LARKBASE_EMAIL_DISCORD_MAPPING_TABLE_ID=<テーブルID>');
    console.log('\nLarkBaseで新しいテーブルを作成し、以下のフィールドを追加:');
    console.log('  - email (テキスト)');
    console.log('  - discord_id (テキスト)');
    console.log('  - discord_username (テキスト)');
    console.log('  - note (テキスト)');
    console.log('  - created_at (数値)');
    return;
  }

  const token = await getTenantAccessToken();
  const url = `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${EMAIL_DISCORD_MAPPING_TABLE_ID}/records`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const res = await response.json();
  if (res.code !== 0) {
    console.error('Error fetching mappings:', res.msg);
    return;
  }

  const items = res.data?.items || [];
  console.log(`\n=== メール↔Discord IDマッピング一覧 (${items.length}件) ===\n`);

  if (items.length === 0) {
    console.log('マッピングはまだ登録されていません。');
    return;
  }

  for (const item of items) {
    const fields = item.fields;
    const email = extractText(fields['email']);
    const discordId = extractText(fields['discord_id']);
    const discordUsername = extractText(fields['discord_username']);
    const note = extractText(fields['note']);
    const createdAt = fields['created_at'] ? new Date(Number(fields['created_at'])).toISOString() : 'N/A';

    console.log(`Email: ${email}`);
    console.log(`  Discord ID: ${discordId}`);
    if (discordUsername) console.log(`  Discord Username: ${discordUsername}`);
    if (note) console.log(`  Note: ${note}`);
    console.log(`  Created: ${createdAt}`);
    console.log('');
  }
}

// マッピングを追加
async function addMapping(email: string, discordId: string, note?: string): Promise<void> {
  if (!EMAIL_DISCORD_MAPPING_TABLE_ID) {
    console.error('Error: LARKBASE_EMAIL_DISCORD_MAPPING_TABLE_ID is not set');
    return;
  }

  const token = await getTenantAccessToken();
  const url = `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${EMAIL_DISCORD_MAPPING_TABLE_ID}/records`;

  const fields: Record<string, unknown> = {
    email: email.toLowerCase(),
    discord_id: discordId,
    created_at: Date.now(),
  };
  if (note) fields['note'] = note;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  const res = await response.json();
  if (res.code !== 0) {
    console.error('Error adding mapping:', res.msg);
    return;
  }

  console.log(`✅ マッピングを追加しました: ${email} → ${discordId}`);
}

// CSVからインポート
async function importFromCsv(csvFile: string): Promise<void> {
  if (!EMAIL_DISCORD_MAPPING_TABLE_ID) {
    console.error('Error: LARKBASE_EMAIL_DISCORD_MAPPING_TABLE_ID is not set');
    return;
  }

  if (!fs.existsSync(csvFile)) {
    console.error(`Error: File not found: ${csvFile}`);
    return;
  }

  const content = fs.readFileSync(csvFile, 'utf-8');
  const lines = content.trim().split('\n');

  // ヘッダー行をスキップ
  const dataLines = lines[0].includes('email') ? lines.slice(1) : lines;

  console.log(`\n=== CSVインポート (${dataLines.length}件) ===\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const line of dataLines) {
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    const [email, discordId, discordUsername, note] = parts;

    if (!email || !discordId) {
      console.log(`⚠️ スキップ: ${line} (email または discord_id が不足)`);
      errorCount++;
      continue;
    }

    try {
      const token = await getTenantAccessToken();
      const url = `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${EMAIL_DISCORD_MAPPING_TABLE_ID}/records`;

      const fields: Record<string, unknown> = {
        email: email.toLowerCase(),
        discord_id: discordId,
        created_at: Date.now(),
      };
      if (discordUsername) fields['discord_username'] = discordUsername;
      if (note) fields['note'] = note;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      const res = await response.json();
      if (res.code !== 0) {
        console.log(`❌ エラー: ${email} - ${res.msg}`);
        errorCount++;
      } else {
        console.log(`✅ ${email} → ${discordId}`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ エラー: ${email} - ${err}`);
      errorCount++;
    }
  }

  console.log(`\n完了: ${successCount}件成功, ${errorCount}件失敗`);
}

// メールでDiscord IDを検索
async function findByEmail(email: string): Promise<void> {
  if (!EMAIL_DISCORD_MAPPING_TABLE_ID) {
    console.error('Error: LARKBASE_EMAIL_DISCORD_MAPPING_TABLE_ID is not set');
    return;
  }

  const token = await getTenantAccessToken();
  const url = `${LARK_API_BASE}/bitable/v1/apps/${LARKBASE_APP_TOKEN}/tables/${EMAIL_DISCORD_MAPPING_TABLE_ID}/records/search`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: {
        conditions: [{ field_name: 'email', operator: 'is', value: [email.toLowerCase()] }],
      },
      page_size: 1,
    }),
  });

  const res = await response.json();
  if (res.code !== 0 || !res.data?.items?.length) {
    console.log(`マッピングが見つかりません: ${email}`);
    return;
  }

  const fields = res.data.items[0].fields;
  console.log(`\n=== 検索結果 ===`);
  console.log(`Email: ${email}`);
  console.log(`Discord ID: ${extractText(fields['discord_id'])}`);
  if (fields['discord_username']) {
    console.log(`Discord Username: ${extractText(fields['discord_username'])}`);
  }
}

// Stripeの全顧客を表示
async function listStripeCustomers(): Promise<void> {
  if (!STRIPE_SECRET_KEY) {
    console.error('Error: STRIPE_SECRET_KEY is not set');
    return;
  }

  console.log('\n=== Stripe顧客一覧（メールアドレス付き） ===\n');
  console.log('CSVフォーマット: email,discord_id,discord_username,note');
  console.log('---');

  let hasMore = true;
  let startingAfter: string | undefined;
  let totalCount = 0;

  while (hasMore) {
    const params = new URLSearchParams({ limit: '100' });
    if (startingAfter) params.append('starting_after', startingAfter);

    const response = await fetch(
      `https://api.stripe.com/v1/customers?${params}`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
    );

    const data = await response.json();

    for (const customer of data.data) {
      if (customer.email) {
        console.log(`${customer.email},,,"${customer.name || ''}"`);
        totalCount++;
      }
      startingAfter = customer.id;
    }

    hasMore = data.has_more;
  }

  console.log('---');
  console.log(`\n合計: ${totalCount}件のメールアドレス`);
  console.log('\n上記をCSVファイルに保存し、discord_id列を埋めてからインポートしてください。');
}

function extractText(field: unknown): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.map((item: { text?: string }) => item?.text || '').join('');
  }
  if (typeof field === 'object' && (field as { text?: string }).text) {
    return (field as { text: string }).text;
  }
  return String(field);
}

// メイン処理
async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case 'list':
      await listMappings();
      break;

    case 'add':
      if (args.length < 2) {
        console.log('Usage: npx ts-node scripts/manage-email-discord-mapping.ts add <email> <discord_id> [note]');
        return;
      }
      await addMapping(args[0], args[1], args[2]);
      break;

    case 'import':
      if (args.length < 1) {
        console.log('Usage: npx ts-node scripts/manage-email-discord-mapping.ts import <csv_file>');
        console.log('CSVフォーマット: email,discord_id,discord_username,note');
        return;
      }
      await importFromCsv(args[0]);
      break;

    case 'find':
      if (args.length < 1) {
        console.log('Usage: npx ts-node scripts/manage-email-discord-mapping.ts find <email>');
        return;
      }
      await findByEmail(args[0]);
      break;

    case 'stripe-customers':
      await listStripeCustomers();
      break;

    default:
      console.log(`
メール↔Discord IDマッピング管理ツール

使い方:
  npx ts-node scripts/manage-email-discord-mapping.ts <command> [options]

コマンド:
  list                           マッピング一覧を表示
  add <email> <discord_id> [note]  マッピングを追加
  import <csv_file>              CSVファイルから一括インポート
  find <email>                   メールでDiscord IDを検索
  stripe-customers               Stripeの全顧客メールを表示（CSV用）

CSVフォーマット:
  email,discord_id,discord_username,note

例:
  # Stripeの顧客メール一覧をCSVで出力
  npx ts-node scripts/manage-email-discord-mapping.ts stripe-customers > members.csv

  # CSVにdiscord_idを追記してインポート
  npx ts-node scripts/manage-email-discord-mapping.ts import members.csv
`);
  }
}

main().catch(console.error);
