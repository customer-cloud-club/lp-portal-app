/**
 * LarkBase API権限テストスクリプト
 */

import 'dotenv/config';
import { getVODEvents, updateEventArchiveUrl } from '../lib/larkbase-client';

async function testLarkBaseAccess() {
  console.log('🔍 LarkBase API権限テスト開始...\n');

  // Test 1: Read events
  console.log('📖 Test 1: イベント一覧取得...');
  try {
    const events = await getVODEvents();
    console.log(`✅ イベント取得成功: ${events.length}件`);

    // Show first 3 events
    events.slice(0, 3).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.title}`);
      console.log(`      - ID: ${e.id}`);
      console.log(`      - YouTube: ${e.youtube_url || '(なし)'}`);
      console.log(`      - Archive: ${e.archive_url || '(なし)'}`);
      console.log(`      - Lark Token: ${e.archive_file_token || '(なし)'}`);
    });

    // Find event without youtube_url
    const eventWithoutArchive = events.find((e) => e.youtube_url && !e.archive_url);
    if (eventWithoutArchive) {
      console.log(`\n🎯 アーカイブURL未設定のイベント発見: ${eventWithoutArchive.title}`);
      console.log(`   YouTube URL: ${eventWithoutArchive.youtube_url}`);
    }
  } catch (error: any) {
    console.log('❌ イベント取得エラー:', error.message);
  }

  // Test 2: Update archive URL (if updateEventArchiveUrl exists)
  console.log('\n📝 Test 2: アーカイブURL更新テスト...');
  try {
    // Get events with youtube_url
    const events = await getVODEvents();
    const eventWithYoutube = events.find((e) => e.youtube_url);

    if (eventWithYoutube && typeof updateEventArchiveUrl === 'function') {
      console.log(`   対象イベント: ${eventWithYoutube.title}`);
      console.log(`   YouTube URL: ${eventWithYoutube.youtube_url}`);
      console.log('   ※ 実際の更新はスキップ（テストのみ）');
    } else {
      console.log('   updateEventArchiveUrl関数が存在しないか、YouTube URL付きイベントがありません');
    }
  } catch (error: any) {
    console.log('❌ 更新テストエラー:', error.message);
  }

  console.log('\n✅ テスト完了');
}

testLarkBaseAccess().catch(console.error);
