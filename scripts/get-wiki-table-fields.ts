/**
 * Wiki形式のBitableフィールド情報取得スクリプト
 * 対象: https://customer-cloud.jp.larksuite.com/wiki/VCCNwfe2Birpd8kus00jUDD1ppc?table=tbleuPP6QtZt3Dm8
 */

import 'dotenv/config';
import * as lark from '@larksuiteoapi/node-sdk';

// customer-cloud.jp.larksuite.com はカスタムドメインなので、複数のドメインを試す
const clients = {
  // Lark Suite 標準
  larkStd: new lark.Client({
    appId: process.env.LARK_APP_ID!,
    appSecret: process.env.LARK_APP_SECRET!,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Lark,
  }),
  // Lark Suite Open API
  larkOpen: new lark.Client({
    appId: process.env.LARK_APP_ID!,
    appSecret: process.env.LARK_APP_SECRET!,
    appType: lark.AppType.SelfBuild,
    domain: 'https://open.larksuite.com',
  }),
  // Feishu (中国版)
  feishu: new lark.Client({
    appId: process.env.LARK_APP_ID!,
    appSecret: process.env.LARK_APP_SECRET!,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
  }),
};

// メインで使うクライアント
const client = clients.larkStd;

// URLから抽出した値
const WIKI_TOKEN = 'VCCNwfe2Birpd8kus00jUDD1ppc';
// URLのテーブルID: tbleuPP6QtZt3Dm8 (LPテーブル)
const TABLE_ID = 'tbleuPP6QtZt3Dm8';

async function getWikiTableFields() {
  console.log('🔍 Wiki Bitableフィールド情報を取得中...\n');
  console.log(`Wiki Token: ${WIKI_TOKEN}`);
  console.log(`Table ID: ${TABLE_ID}\n`);

  // 先にWikiからBitableトークンを取得
  console.log('Step 1: Wiki APIからBitableトークンを取得...');
  let bitableToken: string | undefined;

  for (const [name, c] of Object.entries(clients)) {
    try {
      const nodeRes = await c.wiki.space.getNode({
        params: {
          token: WIKI_TOKEN,
        },
      });

      if (nodeRes.code === 0 && nodeRes.data?.node?.obj_token) {
        bitableToken = nodeRes.data.node.obj_token;
        console.log(`✅ ${name}: Bitable Token取得成功: ${bitableToken}`);
        console.log(`   obj_type: ${nodeRes.data.node.obj_type}`);
        console.log(`   title: ${nodeRes.data.node.title}`);
        break;
      }
    } catch (error: any) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  if (!bitableToken) {
    console.log('\n❌ Bitable Tokenを取得できませんでした');
    return;
  }

  // Step 2: 各クライアントでフィールド取得を試す
  console.log('\nStep 2: フィールド一覧を取得...');
  const tokensToTry = [bitableToken, WIKI_TOKEN];

  for (const token of tokensToTry) {
    console.log(`\n  トークン: ${token}`);
    for (const [name, c] of Object.entries(clients)) {
      try {
        const fieldsRes = await c.bitable.appTableField.list({
          path: {
            app_token: token,
            table_id: TABLE_ID,
          },
        });

        if (fieldsRes.code === 0 && fieldsRes.data?.items) {
          console.log(`  ✅ ${name} で成功!`);
          outputFields(fieldsRes.data.items);
          return;
        } else {
          console.log(`  ❌ ${name}: ${fieldsRes.msg} (code: ${fieldsRes.code})`);
        }
      } catch (error: any) {
        // エラー詳細を確認
        const errData = error.response?.data;
        console.log(`  ❌ ${name}: ${error.message}`);
        if (errData) {
          console.log(`     詳細: code=${errData.code}, msg=${errData.msg}`);
        }
      }
    }
  }

  // Step 3: テーブル一覧を取得してみる（全テーブルを表示）
  console.log('\nStep 3: テーブル一覧の取得を試みます...');
  let allTables: any[] = [];

  for (const token of tokensToTry) {
    for (const [name, c] of Object.entries(clients)) {
      try {
        // page_sizeを大きくして全テーブルを取得
        const tablesRes = await c.bitable.appTable.list({
          path: {
            app_token: token,
          },
          params: {
            page_size: 100,
          },
        });

        if (tablesRes.code === 0 && tablesRes.data?.items) {
          allTables = tablesRes.data.items;
          console.log(`\n✅ ${name} (token: ${token}) テーブル一覧取得成功 (${tablesRes.data.items.length}件):`);
          tablesRes.data.items.forEach((t: any, i: number) => {
            console.log(`   ${i + 1}. ${t.name} (${t.table_id})`);
          });
          // 成功したら他のクライアントは試さない
          break;
        }
      } catch (error: any) {
        // 静かに失敗
      }
    }
    if (allTables.length > 0) break;
  }

  // Step 4: 各テーブルのフィールド情報を取得
  if (allTables.length > 0) {
    console.log('\n\n========================================');
    console.log('Step 4: 各テーブルのフィールド詳細を取得');
    console.log('========================================\n');

    for (const table of allTables) {
      console.log(`\n### ${table.name} (${table.table_id})`);
      console.log('----------------------------------------');

      try {
        const fieldsRes = await client.bitable.appTableField.list({
          path: {
            app_token: bitableToken!,
            table_id: table.table_id,
          },
        });

        if (fieldsRes.code === 0 && fieldsRes.data?.items) {
          console.log(`フィールド数: ${fieldsRes.data.items.length}件\n`);
          console.log('| フィールド名 | Field ID | 型 |');
          console.log('|-------------|----------|-----|');
          fieldsRes.data.items.forEach((field: any) => {
            console.log(`| ${field.field_name} | ${field.field_id} | ${getTypeName(field.type)} |`);
          });
        } else {
          console.log(`❌ フィールド取得失敗: ${fieldsRes.msg}`);
        }
      } catch (error: any) {
        console.log(`❌ エラー: ${error.message}`);
      }
    }
    return;
  }

  console.log('\n❌ フィールド取得に失敗しました。');
  console.log('\n可能な解決策:');
  console.log('1. Lark管理画面でアプリにこのBitableへのアクセス権限を付与');
  console.log('2. Bitableの共有設定でアプリを追加');
}

async function tryDirectAccess() {
  // Wiki BitableはURLのwiki_tokenをそのままapp_tokenとして使える場合もある
  // または obj_type が bitable の場合は別の方法が必要

  try {
    // テーブル一覧を取得してみる
    console.log('\nテーブル一覧取得を試みます...');
    const tablesRes = await client.bitable.appTable.list({
      path: {
        app_token: WIKI_TOKEN,
      },
    });

    console.log('Tables Response:', JSON.stringify(tablesRes, null, 2));

    if (tablesRes.code === 0 && tablesRes.data?.items) {
      console.log('\n✅ テーブル一覧取得成功:');
      tablesRes.data.items.forEach((table: any) => {
        console.log(`  - ${table.name} (${table.table_id})`);
      });

      // 指定されたテーブルのフィールドを取得
      const fieldsRes = await client.bitable.appTableField.list({
        path: {
          app_token: WIKI_TOKEN,
          table_id: TABLE_ID,
        },
      });

      if (fieldsRes.code === 0) {
        outputFields(fieldsRes.data?.items || []);
      }
    }
  } catch (error: any) {
    console.error('代替方法も失敗:', error.message);
  }
}

function outputFields(fields: any[]) {
  console.log(`\n📋 フィールド一覧 (${fields.length}件):\n`);
  console.log('-------------------------------------------');

  fields.forEach((field: any, i: number) => {
    console.log(`${i + 1}. ${field.field_name}`);
    console.log(`   - Field ID: ${field.field_id}`);
    console.log(`   - Type: ${field.type} (${getTypeName(field.type)})`);
    if (field.property) {
      const propStr = JSON.stringify(field.property);
      if (propStr.length > 200) {
        console.log(`   - Property: ${propStr.slice(0, 200)}...`);
      } else {
        console.log(`   - Property: ${propStr}`);
      }
    }
    console.log('');
  });

  // マッピング用のサマリー出力
  console.log('\n📊 マッピング用サマリー:');
  console.log('-------------------------------------------');
  console.log('| フィールド名 | Field ID | 型 |');
  console.log('|-------------|----------|-----|');
  fields.forEach((field: any) => {
    console.log(`| ${field.field_name} | ${field.field_id} | ${getTypeName(field.type)} |`);
  });
}

function getTypeName(type: number): string {
  const typeMap: Record<number, string> = {
    1: 'Text',
    2: 'Number',
    3: 'SingleSelect',
    4: 'MultiSelect',
    5: 'DateTime',
    7: 'Checkbox',
    11: 'User',
    13: 'Phone',
    15: 'URL',
    17: 'Attachment',
    18: 'Link',
    19: 'Lookup',
    20: 'Formula',
    21: 'DuplexLink',
    22: 'Location',
    23: 'GroupChat',
    1001: 'CreatedTime',
    1002: 'ModifiedTime',
    1003: 'CreatedUser',
    1004: 'ModifiedUser',
    1005: 'AutoNumber',
  };
  return typeMap[type] || `Unknown(${type})`;
}

getWikiTableFields().catch(console.error);
