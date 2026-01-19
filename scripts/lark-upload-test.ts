#!/usr/bin/env ts-node
/**
 * Lark Drive動画アップロードテストスクリプト
 *
 * Usage:
 *   ts-node scripts/lark-upload-test.ts <video-file-path>
 */

import * as lark from '@larksuiteoapi/node-sdk';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数チェック
const requiredEnvVars = ['LARK_APP_ID', 'LARK_APP_SECRET', 'LARK_FOLDER_TOKEN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 環境変数 ${envVar} が設定されていません`);
    process.exit(1);
  }
}

// Larkクライアント初期化
const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

async function uploadVideo(filePath: string): Promise<string> {
  console.log('📤 アップロード開始:', filePath);

  // ファイル存在確認
  if (!fs.existsSync(filePath)) {
    throw new Error(`ファイルが見つかりません: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 ファイルサイズ: ${fileSizeMB} MB`);

  // アップロード
  const fileStream = fs.createReadStream(filePath);

  const res = await client.drive.file.uploadAll({
    data: {
      file_name: path.basename(filePath),
      parent_type: 'explorer',
      parent_node: process.env.LARK_FOLDER_TOKEN!,
      size: stats.size,
      file: fileStream,
    },
  }) as { code?: number; msg?: string; data?: { file_token?: string } };

  if (!res || res.code !== 0) {
    throw new Error(`アップロード失敗: ${res?.msg || 'Unknown error'}`);
  }

  const fileToken = res.data?.file_token;
  if (!fileToken) {
    throw new Error('アップロード成功したがfile_tokenが取得できませんでした');
  }
  console.log('✅ アップロード成功!');
  console.log('📎 File Token:', fileToken);

  return fileToken;
}

async function getTemporaryUrl(fileToken: string): Promise<string> {
  console.log('\n🔗 一時URL取得中...');

  const res = await client.drive.media.batchGetTmpDownloadUrl({
    params: {
      file_tokens: [fileToken],
    },
  }) as { code?: number; msg?: string; data?: { tmp_download_urls?: Array<{ tmp_download_url?: string }> } };

  if (!res || res.code !== 0) {
    throw new Error(`URL取得失敗: ${res?.msg || 'Unknown error'}`);
  }

  const tmpUrl = res.data?.tmp_download_urls?.[0]?.tmp_download_url;
  if (!tmpUrl) {
    throw new Error('URL取得成功したがURLが空でした');
  }
  console.log('✅ 一時URL取得成功（24時間有効）');
  console.log('🌐 URL:', tmpUrl);

  return tmpUrl;
}

async function testVideoPlayback(url: string): Promise<void> {
  console.log('\n🎬 再生テスト...');

  // HEADリクエストでファイル情報取得（Node.js 18+ native fetch）
  const response = await fetch(url, { method: 'HEAD' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const contentType = response.headers.get('content-type');
  const acceptRanges = response.headers.get('accept-ranges');

  console.log('📊 ファイル情報:');
  console.log(`  - Content-Type: ${contentType}`);
  console.log(`  - Content-Length: ${contentLength} bytes`);
  console.log(`  - Accept-Ranges: ${acceptRanges}`);

  if (acceptRanges === 'bytes') {
    console.log('✅ Range Request対応（ストリーミング可能）');
  } else {
    console.log('⚠️  Range Request非対応（ストリーミングに問題の可能性）');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ts-node scripts/lark-upload-test.ts <video-file-path>');
    process.exit(1);
  }

  const filePath = args[0];

  try {
    console.log('🌸 Lark Drive動画アップロードテスト\n');

    // 1. アップロード
    const fileToken = await uploadVideo(filePath);

    // 2. 一時URL取得
    const tmpUrl = await getTemporaryUrl(fileToken);

    // 3. 再生テスト
    await testVideoPlayback(tmpUrl);

    console.log('\n✨ すべてのテストが成功しました！');
    console.log('\n📋 次のステップ:');
    console.log('1. このFile TokenをLarkBaseに保存');
    console.log('2. ブラウザで一時URLを開いて動画再生を確認');
    console.log('3. Video.jsでの埋め込み再生をテスト');

    console.log(`\n📎 File Token: ${fileToken}`);
    console.log(`🌐 一時URL: ${tmpUrl}`);

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
