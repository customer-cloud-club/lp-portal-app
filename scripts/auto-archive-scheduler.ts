#!/usr/bin/env tsx
/**
 * 自動アーカイブスケジューラ
 *
 * イベント終了1時間後にYouTubeアーカイブを自動でLark Driveに保存
 *
 * 使用方法:
 *   npx tsx scripts/auto-archive-scheduler.ts          # 一度だけ実行
 *   npx tsx scripts/auto-archive-scheduler.ts --daemon # デーモンモード（常駐）
 *   npx tsx scripts/auto-archive-scheduler.ts --dry-run # ドライラン（実行せず確認のみ）
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getAllEvents, Event } from '../lib/larkbase-client.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 設定
const ARCHIVE_DELAY_HOURS = 1; // イベント終了後の待機時間
const DEFAULT_EVENT_DURATION_MINUTES = 90; // デフォルトイベント時間
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // デーモンモードでのチェック間隔（15分）
const LOG_DIR = './logs';
const LOG_FILE = path.join(LOG_DIR, 'auto-archive.log');

// ログ出力
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  // ファイルにも書き込み
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

/**
 * イベントの終了時刻を計算
 */
function getEventEndTime(event: Event): Date {
  const startTime = new Date(event.scheduled_at);
  const durationMinutes = event.duration || DEFAULT_EVENT_DURATION_MINUTES;
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000);
}

/**
 * アーカイブ対象のイベントを取得
 * 条件: YouTube URLあり、アーカイブなし、終了後1時間以上経過
 */
async function getEventsToArchive(dryRun: boolean = false): Promise<Event[]> {
  const events = await getAllEvents();
  const now = new Date();

  const targetEvents = events.filter(event => {
    // YouTube URLが必要
    if (!event.youtube_url) return false;

    // 既にアーカイブ済みはスキップ
    if (event.archive_file_token || event.archive_url) return false;

    // イベント終了時刻を計算
    const endTime = getEventEndTime(event);
    const archiveTime = new Date(endTime.getTime() + ARCHIVE_DELAY_HOURS * 60 * 60 * 1000);

    // 現在時刻がアーカイブ開始時刻を過ぎているか
    return now >= archiveTime;
  });

  if (dryRun && targetEvents.length > 0) {
    log('📋 ドライラン: 以下のイベントがアーカイブ対象です');
    targetEvents.forEach((event, i) => {
      const endTime = getEventEndTime(event);
      log(`  ${i + 1}. [${event.id}] ${event.title}`);
      log(`      終了: ${endTime.toLocaleString('ja-JP')}`);
      log(`      YouTube: ${event.youtube_url}`);
    });
  }

  return targetEvents;
}

/**
 * 単一イベントをアーカイブ
 */
async function archiveEvent(event: Event): Promise<boolean> {
  log(`🎬 アーカイブ開始: ${event.title} (${event.id})`);

  try {
    // batch-archive-youtube.ts を特定IDで実行
    const cmd = `npx tsx scripts/batch-archive-youtube.ts --id=${event.id}`;
    log(`📦 実行: ${cmd}`);

    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    log(`✅ アーカイブ完了: ${event.title}`);
    return true;
  } catch (error) {
    log(`❌ アーカイブ失敗: ${event.title} - ${error}`, 'ERROR');
    return false;
  }
}

/**
 * 全対象イベントをアーカイブ
 */
async function archiveAllPending(): Promise<{ success: number; failed: number }> {
  const events = await getEventsToArchive();

  if (events.length === 0) {
    log('📭 アーカイブ対象のイベントはありません');
    return { success: 0, failed: 0 };
  }

  log(`📊 アーカイブ対象: ${events.length}件`);

  let success = 0;
  let failed = 0;

  for (const event of events) {
    const result = await archiveEvent(event);
    if (result) {
      success++;
    } else {
      failed++;
    }

    // 連続リクエスト防止
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  log(`📊 処理完了 - 成功: ${success}件, 失敗: ${failed}件`);
  return { success, failed };
}

/**
 * デーモンモード - 定期的にチェック
 */
async function runDaemon() {
  log('🔄 デーモンモード開始 - 15分間隔でチェック');

  const check = async () => {
    log('🔍 アーカイブ対象をチェック中...');
    await archiveAllPending();
  };

  // 初回実行
  await check();

  // 定期実行
  setInterval(check, CHECK_INTERVAL_MS);

  // プロセスを維持
  process.on('SIGINT', () => {
    log('🛑 デーモン停止');
    process.exit(0);
  });
}

/**
 * 次回アーカイブ予定を表示
 */
async function showUpcoming() {
  const events = await getAllEvents();
  const now = new Date();

  log('📅 今後のアーカイブ予定:');

  const upcoming = events
    .filter(e => e.youtube_url && !e.archive_file_token && !e.archive_url)
    .map(event => {
      const endTime = getEventEndTime(event);
      const archiveTime = new Date(endTime.getTime() + ARCHIVE_DELAY_HOURS * 60 * 60 * 1000);
      return { event, endTime, archiveTime };
    })
    .filter(({ archiveTime }) => archiveTime > now)
    .sort((a, b) => a.archiveTime.getTime() - b.archiveTime.getTime())
    .slice(0, 10);

  if (upcoming.length === 0) {
    log('  予定なし（全てアーカイブ済みまたはYouTube URLなし）');
    return;
  }

  upcoming.forEach(({ event, endTime, archiveTime }, i) => {
    const timeUntil = Math.round((archiveTime.getTime() - now.getTime()) / (60 * 1000));
    log(`  ${i + 1}. ${event.title}`);
    log(`     終了予定: ${endTime.toLocaleString('ja-JP')}`);
    log(`     アーカイブ開始: ${archiveTime.toLocaleString('ja-JP')} (${timeUntil}分後)`);
  });
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon');
  const isDryRun = args.includes('--dry-run');
  const showSchedule = args.includes('--schedule');

  log('🚀 自動アーカイブスケジューラ起動');

  if (showSchedule) {
    await showUpcoming();
    return;
  }

  if (isDryRun) {
    log('📋 ドライランモード（実行せず確認のみ）');
    await getEventsToArchive(true);
    await showUpcoming();
    return;
  }

  if (isDaemon) {
    await runDaemon();
  } else {
    // 一度だけ実行
    await archiveAllPending();
  }
}

main().catch(error => {
  log(`❌ エラー: ${error}`, 'ERROR');
  process.exit(1);
});
