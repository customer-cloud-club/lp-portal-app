#!/usr/bin/env tsx
/**
 * YouTube → Lark Drive バッチアーカイブスクリプト
 *
 * 全てのYouTube URLがあってアーカイブがないイベントを処理
 * ファイル名形式: YYYYMMDD_イベントタイトル.mp4
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as lark from '@larksuiteoapi/node-sdk';
import { getAllEvents, Event } from '../lib/larkbase-client.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 設定
const DOWNLOAD_DIR = './downloads';
// SkillFreakアーカイブフォルダ（Botを含むグループに共有済み）
const LARK_DRIVE_FOLDER_TOKEN = 'R2oWfpO5wlLEwBd5dMIjGRwvp2g';
const LARKBASE_APP_TOKEN = process.env.LARKBASE_APP_TOKEN!;
const LARKBASE_TABLE_ID = process.env.LARKBASE_TABLE_ID!;

// Larkクライアント
const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

/**
 * ファイル名に使えない文字を置換
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100); // 長すぎる名前を制限
}

/**
 * YouTube動画をダウンロード
 */
async function downloadYouTubeVideo(
  youtubeUrl: string,
  outputFileName: string
): Promise<string> {
  console.log(`\n📥 ダウンロード開始: ${youtubeUrl}`);
  console.log(`   ファイル名: ${outputFileName}`);

  const ytdlpCmd = 'yt-dlp';
  const outputPath = path.join(DOWNLOAD_DIR, `${outputFileName}.mp4`);

  const cmd = `${ytdlpCmd} \
    --format 'bestvideo[height<=1080]+bestaudio/best' \
    --merge-output-format mp4 \
    -o "${outputPath}" \
    "${youtubeUrl}"`;

  try {
    execSync(cmd, { stdio: 'inherit' });
    return outputPath;
  } catch (error) {
    console.error(`❌ ダウンロード失敗: ${youtubeUrl}`);
    throw error;
  }
}

/**
 * Lark Driveにアップロード（HTTP直接実装）
 */
async function uploadToLarkDrive(
  filePath: string,
  fileName: string
): Promise<string> {
  const { uploadVideoToLarkHTTP } = await import('../lib/lark-drive-http.js');
  return uploadVideoToLarkHTTP(filePath, LARK_DRIVE_FOLDER_TOKEN, fileName);
}

/**
 * LarkBaseの「アーカイブ動画」フィールドを更新
 */
async function updateLarkBaseArchive(
  recordId: string,
  fileToken: string
): Promise<void> {
  console.log(`📝 LarkBase更新中: ${recordId}`);

  // アーカイブ動画フィールドをリンク形式で更新
  // 注: Lark DocsのURL形式を使用（open.larksuite.comではなく組織ドメイン）
  const archiveUrl = `https://ivygain-project.jp.larksuite.com/file/${fileToken}`;

  const res = await client.bitable.appTableRecord.update({
    path: {
      app_token: LARKBASE_APP_TOKEN,
      table_id: LARKBASE_TABLE_ID,
      record_id: recordId,
    },
    data: {
      fields: {
        'アーカイブ動画': {
          link: archiveUrl,
          text: 'Lark Driveアーカイブ',
        },
        'アーカイブファイルトークン': fileToken,
      },
    },
  });

  if (res.code !== 0) {
    throw new Error(`LarkBase更新失敗: ${res.msg}`);
  }

  console.log(`✅ LarkBase更新完了`);
}

/**
 * 単一イベントを処理
 */
async function processEvent(event: Event): Promise<boolean> {
  const date = new Date(event.scheduled_at);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${dateStr}_${sanitizeFileName(event.title)}`;

  console.log('\n' + '='.repeat(60));
  console.log(`🎬 処理中: ${event.title}`);
  console.log(`   ID: ${event.id}`);
  console.log(`   日付: ${dateStr}`);
  console.log(`   YouTube: ${event.youtube_url}`);

  try {
    // 1. ダウンロード
    const videoPath = await downloadYouTubeVideo(event.youtube_url!, fileName);
    console.log(`✅ ダウンロード完了`);

    // 2. Lark Driveにアップロード
    console.log('\n📤 Lark Driveにアップロード中...');
    const stats = fs.statSync(videoPath);
    console.log(`   ファイルサイズ: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

    const fileToken = await uploadToLarkDrive(videoPath, `${fileName}.mp4`);
    console.log(`✅ アップロード完了: ${fileToken}`);

    // 3. LarkBase更新
    await updateLarkBaseArchive(event.id, fileToken);

    // 4. ローカルファイル削除
    fs.unlinkSync(videoPath);
    console.log('🧹 ローカルファイル削除完了');

    console.log(`\n🎉 完了: ${event.title}`);
    console.log(`   Lark Drive: https://ivygain-project.jp.larksuite.com/file/${fileToken}`);

    return true;
  } catch (error) {
    console.error(`\n❌ エラー: ${event.title}`);
    console.error(error);
    return false;
  }
}

/**
 * YouTube URLをarchive_urlとしてLarkBaseに登録（Lark Drive不要版）
 * 注: LarkBaseにはアーカイブ専用フィールドがないため、
 *     セミナーURLにYouTube URLが既に登録されている場合はスキップ
 */
async function registerYouTubeAsArchive(event: Event): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(`🎬 処理中: ${event.title}`);
  console.log(`   ID: ${event.id}`);
  console.log(`   YouTube: ${event.youtube_url}`);

  // YouTube URLが既に登録されている場合はスキップ
  // (LarkBaseには「セミナーURL」フィールドがあり、そこにYouTube URLが格納される)
  if (event.youtube_url) {
    console.log(`✅ YouTube URL は既に登録済み: ${event.youtube_url}`);
    console.log(`   → このイベントはYouTube埋め込みで再生可能です`);
    return true;
  }

  console.log(`⚠️ YouTube URLがありません。スキップします。`);
  return false;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;
  const specificId = args.find(a => a.startsWith('--id='))?.split('=')[1];
  const youtubeOnlyMode = args.includes('--youtube-only');

  // ディレクトリ作成
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  if (youtubeOnlyMode) {
    console.log('🎬 YouTube URL → LarkBase 直接登録モード');
    console.log('   (Lark Driveは使用せず、YouTube URLをアーカイブとして登録)');
  } else {
    console.log('🎬 YouTube → Lark Drive バッチアーカイブ開始');
  }
  console.log('='.repeat(60));

  // イベント取得
  const events = await getAllEvents();
  let targetEvents: Event[];

  if (specificId) {
    // 特定のイベントIDを指定
    const event = events.find(e => e.id === specificId);
    if (!event) {
      console.error(`❌ イベントが見つかりません: ${specificId}`);
      process.exit(1);
    }
    targetEvents = [event];
  } else {
    // YouTube URLがあってアーカイブがないイベント
    targetEvents = events.filter(
      e => e.youtube_url && !e.archive_file_token && !e.archive_url
    );
  }

  console.log(`\n📊 対象イベント: ${targetEvents.length}件`);
  if (limit < Infinity) {
    console.log(`   処理制限: ${limit}件`);
    targetEvents = targetEvents.slice(0, limit);
  }

  // 処理実行
  let successCount = 0;
  let failCount = 0;

  for (const event of targetEvents) {
    // YouTube-only モードではダウンロード不要でURL登録のみ
    const success = youtubeOnlyMode
      ? await registerYouTubeAsArchive(event)
      : await processEvent(event);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // 連続リクエスト防止
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 バッチ処理完了');
  console.log(`   成功: ${successCount}件`);
  console.log(`   失敗: ${failCount}件`);
}

main().catch(console.error);
