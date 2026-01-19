/**
 * LPテーブルにサンプルレコードを追加するスクリプト
 */

import 'dotenv/config';
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

const BITABLE_TOKEN = 'EG7kb49Sqaijy7seo2vjYxIdp3f';
const LP_TABLE_ID = 'tbleuPP6QtZt3Dm8';

async function addSampleRecord() {
  console.log('📝 LPテーブルにサンプルレコードを追加中...\n');

  try {
    const response = await client.bitable.appTableRecord.create({
      path: {
        app_token: BITABLE_TOKEN,
        table_id: LP_TABLE_ID,
      },
      data: {
        fields: {
          // LPタイトル (fld7UBgkaI) - Text
          'LPタイトル': 'サンプルLP - APIテスト',
          // 紹介文 (fldPf4oTcc) - Text
          '紹介文': 'これはAPIから追加されたサンプルレコードです。書き込み権限のテストとして作成されました。',
          // 公開URL (fldpe4GH5K) - URL (オブジェクト形式)
          '公開URL': {
            link: 'https://example.com/sample-lp',
            text: 'サンプルLP'
          },
          // ポータルで公開 (fldPCt8RhZ) - Checkbox
          'ポータルで公開': true,
        },
      },
    });

    if (response.code === 0) {
      console.log('✅ サンプルレコード追加成功!');
      console.log(`   Record ID: ${response.data?.record?.record_id}`);
      console.log(`   Fields: ${JSON.stringify(response.data?.record?.fields, null, 2)}`);
    } else {
      console.log('❌ エラー:', response.msg);
      console.log('   コード:', response.code);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response?.data) {
      console.error('   詳細:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

addSampleRecord().catch(console.error);
