#!/usr/bin/env ts-node
/**
 * LarkBase統合テスト
 * イベント一覧・作成・更新・アーカイブURL登録
 */

import {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  registerArchiveUrl,
} from '../lib/portalapp-sync';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🧪 LarkBase統合テスト開始');
  console.log('='.repeat(60));

  try {
    // 1. 全イベント取得テスト
    console.log('\n📋 Test 1: 全イベント取得');
    const events = await getAllEvents();
    console.log(`✅ 取得成功: ${events.length}件のイベント`);
    console.log('イベント一覧:');
    events.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.title} (${e.status})`);
    });

    // 2. 特定イベント取得テスト
    if (events.length > 0) {
      console.log(`\n📖 Test 2: 特定イベント取得 (ID: ${events[0].id})`);
      const event = await getEvent(events[0].id);
      console.log('✅ 取得成功:');
      console.log(JSON.stringify(event, null, 2));
    }

    // 3. イベント作成テスト
    console.log('\n✏️ Test 3: イベント作成');
    const newEventId = await createEvent({
      title: '[テスト] 統合テストイベント',
      description: 'LarkBase統合テストで作成されたイベントです',
      scheduled_at: new Date().toISOString(),
      youtube_url: 'https://youtube.com/watch?v=test',
      status: 'draft',
      visibility: 'public',
    });
    console.log(`✅ 作成成功: Record ID = ${newEventId}`);

    // 4. イベント更新テスト
    console.log('\n🔄 Test 4: イベント更新');
    await updateEvent(newEventId, {
      status: 'scheduled',
      description: '更新されました',
    });
    console.log('✅ 更新成功');

    // 5. アーカイブURL登録テスト
    console.log('\n📎 Test 5: アーカイブURL登録');
    await registerArchiveUrl(newEventId, 'FAKE_FILE_TOKEN_FOR_TEST');
    console.log('✅ 登録成功');

    // 6. 更新後の確認
    console.log('\n🔍 Test 6: 更新後の確認');
    const updatedEvent = await getEvent(newEventId);
    console.log('✅ 確認成功:');
    console.log(`  Status: ${updatedEvent.status}`);
    console.log(`  File Token: ${updatedEvent.archive_file_token}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 全テスト成功！');
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    process.exit(1);
  }
}

main();
