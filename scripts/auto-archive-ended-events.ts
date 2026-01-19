#!/usr/bin/env ts-node
/**
 * 自動アーカイブスクリプト
 *
 * イベント終了後に自動でYouTube動画をLark Driveにアーカイブし、
 * LarkBaseの「アーカイブ動画」フィールドにURLを登録する
 *
 * 使い方:
 *   npx ts-node scripts/auto-archive-ended-events.ts
 *   npx ts-node scripts/auto-archive-ended-events.ts --hours 24  # 過去24時間
 *   npx ts-node scripts/auto-archive-ended-events.ts --dry-run   # 実行せずに確認
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getEventsToArchive, getRecentlyEndedEvents, getEventEndTime } from '../lib/larkbase-scheduler.js';
import { registerArchiveUrl, updateEvent } from '../lib/portalapp-sync.js';
import { uploadVideoToLarkHTTP } from '../lib/lark-drive-http.js';
import { uploadVideoToLark } from '../lib/lark-client.js';
import type { Event } from '../lib/larkbase-client.js';

dotenv.config();

// 設定
const DOWNLOAD_DIR = './downloads';
const LARK_DRIVE_FOLDER_TOKEN = process.env.LARK_DRIVE_FOLDER_ID!;

interface ArchiveResult {
  eventId: string;
  eventTitle: string;
  success: boolean;
  fileToken?: string;
  error?: string;
}

/**
 * YouTube動画をダウンロード
 */
async function downloadYouTubeVideo(videoUrl: string, videoId: string): Promise<string> {
  console.log(`  📥 ダウンロード中: ${videoUrl}`);

  // ディレクトリ作成
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const ytdlpCmd = '/Users/mashimaro/Library/Python/3.12/bin/yt-dlp';
  const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp4`);

  // 既にダウンロード済みの場合はスキップ
  if (fs.existsSync(outputPath)) {
    console.log(`  ⏭️  既存ファイル使用: ${outputPath}`);
    return outputPath;
  }

  const cmd = `${ytdlpCmd} \
    --format 'bestvideo[height<=1080]+bestaudio/best' \
    --merge-output-format mp4 \
    -o "${outputPath}" \
    "${videoUrl}"`;

  execSync(cmd, { stdio: 'inherit' });

  return outputPath;
}

/**
 * YouTube URLからVideo IDを抽出
 */
function extractVideoId(url: string): string | null {
  // youtube.com/watch?v=xxx
  const match1 = url.match(/[?&]v=([^&]+)/);
  if (match1) return match1[1];

  // youtu.be/xxx
  const match2 = url.match(/youtu\.be\/([^?]+)/);
  if (match2) return match2[1];

  // youtube.com/live/xxx
  const match3 = url.match(/youtube\.com\/live\/([^?]+)/);
  if (match3) return match3[1];

  return null;
}

/**
 * 単一イベントをアーカイブ
 */
async function archiveEvent(event: Event): Promise<ArchiveResult> {
  const result: ArchiveResult = {
    eventId: event.id,
    eventTitle: event.title,
    success: false,
  };

  try {
    const videoId = extractVideoId(event.youtube_url!);
    if (!videoId) {
      throw new Error(`無効なYouTube URL: ${event.youtube_url}`);
    }

    // 1. YouTube動画ダウンロード
    const videoPath = await downloadYouTubeVideo(event.youtube_url!, videoId);

    // 2. Lark Driveにアップロード
    console.log(`  📤 Lark Driveにアップロード中...`);
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;
    let fileToken: string;

    if (fileSize < 10 * 1024 * 1024) {
      // 10MB未満: SDK使用
      fileToken = await uploadVideoToLark(videoPath, LARK_DRIVE_FOLDER_TOKEN);
    } else {
      // 10MB以上: HTTP直接実装
      console.log(`  📊 大容量ファイル (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
      fileToken = await uploadVideoToLarkHTTP(videoPath, LARK_DRIVE_FOLDER_TOKEN);
    }

    // 3. LarkBaseの「アーカイブ動画」フィールドを更新
    console.log(`  📝 LarkBase更新中...`);
    await registerArchiveUrl(event.id, fileToken);

    // 4. クリーンアップ
    console.log(`  🧹 クリーンアップ...`);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    result.success = true;
    result.fileToken = fileToken;
    console.log(`  ✅ アーカイブ完了: ${fileToken}`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ エラー: ${result.error}`);
  }

  return result;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const hoursIndex = args.indexOf('--hours');
  const hours = hoursIndex >= 0 ? parseInt(args[hoursIndex + 1], 10) : 1;

  console.log('🎬 YouTube → Lark Drive 自動アーカイブ');
  console.log('='.repeat(60));
  console.log(`📅 対象: 過去${hours}時間以内に終了したイベント`);
  if (dryRun) {
    console.log('🔍 ドライラン: 実際のアーカイブは行いません');
  }
  console.log('');

  // アーカイブ対象のイベントを取得
  let events: Event[];
  if (hours === 1) {
    events = await getEventsToArchive();
  } else {
    events = await getRecentlyEndedEvents(hours);
  }

  if (events.length === 0) {
    console.log('📭 アーカイブ対象のイベントはありません');
    return;
  }

  console.log(`📋 アーカイブ対象: ${events.length}件`);
  console.log('');

  // イベント一覧表示
  events.forEach((event, index) => {
    const endTime = new Date(getEventEndTime(event));
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   終了時刻: ${endTime.toLocaleString('ja-JP')}`);
    console.log(`   YouTube: ${event.youtube_url}`);
    console.log('');
  });

  if (dryRun) {
    console.log('🔍 ドライラン終了');
    return;
  }

  // アーカイブ実行
  console.log('='.repeat(60));
  console.log('🚀 アーカイブ処理開始');
  console.log('');

  const results: ArchiveResult[] = [];

  for (const event of events) {
    console.log(`\n📦 [${event.title}]`);
    const result = await archiveEvent(event);
    results.push(result);
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 処理結果サマリー');
  console.log('');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${failCount}件`);

  if (failCount > 0) {
    console.log('\n失敗したイベント:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.eventTitle}: ${r.error}`);
    });
  }

  console.log('\n🎉 処理完了');
}

main().catch(error => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});
