#!/usr/bin/env ts-node
/**
 * スケジューラーテストスクリプト
 */

import dotenv from 'dotenv';
dotenv.config();

import { getEventsToArchive, getRecentlyEndedEvents, getUpcomingEndEvents, getEventEndTime } from '../lib/larkbase-scheduler.js';
import { getAllEvents } from '../lib/larkbase-client.js';

async function main() {
  console.log('🔍 アーカイブシステムテスト');
  console.log('='.repeat(60));

  // 全イベント取得
  console.log('\n📋 全イベント:');
  const allEvents = await getAllEvents();
  console.log(`   件数: ${allEvents.length}`);

  allEvents.slice(0, 5).forEach(e => {
    const endTime = new Date(getEventEndTime(e));
    console.log(`   - ${e.title}`);
    console.log(`     開始: ${e.scheduled_at}`);
    console.log(`     終了: ${endTime.toISOString()}`);
    console.log(`     YouTube: ${e.youtube_url || '(なし)'}`);
    console.log(`     アーカイブ: ${e.archive_file_token || e.archive_url || '(なし)'}`);
  });

  // 過去1時間以内に終了
  console.log('\n⏱️  過去1時間以内に終了したイベント（アーカイブ対象）:');
  const events1h = await getEventsToArchive();
  console.log(`   件数: ${events1h.length}`);
  events1h.forEach(e => {
    console.log(`   - ${e.title}`);
    console.log(`     YouTube: ${e.youtube_url}`);
  });

  // 過去24時間以内に終了
  console.log('\n📅 過去24時間以内に終了したイベント:');
  const events24h = await getRecentlyEndedEvents(24);
  console.log(`   件数: ${events24h.length}`);
  events24h.forEach(e => console.log(`   - ${e.title}`));

  // 今後24時間以内に終了予定
  console.log('\n🔜 今後24時間以内に終了予定のイベント:');
  const upcomingEnd = await getUpcomingEndEvents();
  console.log(`   件数: ${upcomingEnd.length}`);
  upcomingEnd.forEach(e => {
    const endTime = new Date(getEventEndTime(e));
    console.log(`   - ${e.title} (終了: ${endTime.toLocaleString('ja-JP')})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ テスト完了');
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
