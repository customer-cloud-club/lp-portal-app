/**
 * LarkBaseフィールド名確認スクリプト
 */

import 'dotenv/config';
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

async function checkFields() {
  console.log('🔍 LarkBaseフィールド確認中...\n');

  // テーブルのフィールド一覧を取得
  try {
    const fieldsRes = await client.bitable.appTableField.list({
      path: {
        app_token: process.env.LARKBASE_APP_TOKEN!,
        table_id: process.env.LARKBASE_TABLE_ID!,
      },
    });

    if (fieldsRes.code !== 0) {
      console.log('❌ フィールド一覧取得エラー:', fieldsRes.msg);
      return;
    }

    const fields = fieldsRes.data?.items || [];
    console.log(`📋 フィールド一覧 (${fields.length}件):\n`);

    fields.forEach((field: any, i: number) => {
      console.log(`${i + 1}. ${field.field_name}`);
      console.log(`   - ID: ${field.field_id}`);
      console.log(`   - Type: ${field.type}`);
      if (field.property) {
        console.log(`   - Property: ${JSON.stringify(field.property).slice(0, 100)}`);
      }
      console.log('');
    });

    // 動画関連フィールドを探す
    console.log('\n🎬 動画関連フィールド:');
    const videoFields = fields.filter(
      (f: any) =>
        f.field_name.includes('動画') ||
        f.field_name.includes('アーカイブ') ||
        f.field_name.includes('YouTube') ||
        f.field_name.includes('URL')
    );

    videoFields.forEach((f: any) => {
      console.log(`  - ${f.field_name} (${f.type})`);
    });
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkFields().catch(console.error);
