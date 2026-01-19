/**
 * LarkBase通知システム テストスクリプト
 *
 * 使用方法: npx tsx scripts/test-notification-larkbase.ts
 */

import 'dotenv/config';
import {
  saveNotificationSubscription,
  findNotificationSubscription,
  getRegisteredEventIds,
  getAllNotificationSubscriptions,
  markNotificationSent,
  deleteNotificationSubscription,
  cleanupCompletedSubscriptions,
} from '../lib/notification-larkbase';

async function main() {
  console.log('🧪 LarkBase通知システムテスト開始\n');

  try {
    // 1. テストデータの作成
    console.log('1️⃣ テスト通知登録を作成...');
    const testSubscription = {
      endpoint: 'https://test.example.com/push/abc123',
      keys_p256dh: 'test-p256dh-key',
      keys_auth: 'test-auth-key',
      event_id: 'test-event-001',
      event_title: 'テストイベント',
      event_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明日
      notify_morning: true,
      notify_before15: true,
      notify_before5: true,
      sent_morning: false,
      sent_before15: false,
      sent_before5: false,
      created_at: new Date().toISOString(),
    };

    const recordId = await saveNotificationSubscription(testSubscription);
    console.log('   ✅ 作成成功! recordId:', recordId);

    // 2. 検索テスト
    console.log('\n2️⃣ 通知登録を検索...');
    const found = await findNotificationSubscription(
      testSubscription.endpoint,
      testSubscription.event_id
    );
    if (found) {
      console.log('   ✅ 検索成功!');
      console.log('   📋 イベント名:', found.event_title);
      console.log('   📅 イベント日時:', found.event_date);
    } else {
      console.log('   ❌ 検索失敗');
    }

    // 3. エンドポイントで登録済みイベントID取得
    console.log('\n3️⃣ 登録済みイベントID取得...');
    const eventIds = await getRegisteredEventIds(testSubscription.endpoint);
    console.log('   ✅ イベントID一覧:', eventIds);

    // 4. 全通知登録取得
    console.log('\n4️⃣ 全通知登録取得...');
    const all = await getAllNotificationSubscriptions();
    console.log('   ✅ 総登録数:', all.length);

    // 5. 送信済みフラグ更新
    console.log('\n5️⃣ 送信済みフラグを更新...');
    if (found?.record_id) {
      const updated = await markNotificationSent(found.record_id, 'morning');
      console.log('   ✅ 朝通知済みフラグ更新:', updated);
    }

    // 6. 削除テスト
    console.log('\n6️⃣ テストデータを削除...');
    if (found?.record_id) {
      const deleted = await deleteNotificationSubscription(found.record_id);
      console.log('   ✅ 削除:', deleted);
    }

    // 7. クリーンアップテスト（期限切れデータの削除）
    console.log('\n7️⃣ 期限切れデータのクリーンアップ...');
    const cleanedUp = await cleanupCompletedSubscriptions();
    console.log('   ✅ 削除件数:', cleanedUp);

    console.log('\n🎉 全テスト完了!');
  } catch (error) {
    console.error('❌ テストエラー:', error);
    process.exit(1);
  }
}

main();
