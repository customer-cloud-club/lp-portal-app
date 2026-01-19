/**
 * VAPID鍵生成スクリプト
 * Web Push通知に必要な公開鍵と秘密鍵を生成します
 *
 * 使用方法: npx tsx scripts/generate-vapid-keys.ts
 */

import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('='.repeat(60));
console.log('VAPID Keys Generated Successfully!');
console.log('='.repeat(60));
console.log('');
console.log('以下の値を .env.local に追加してください:');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:contact@skillfreak.app`);
console.log('');
console.log('='.repeat(60));
console.log('');
console.log('注意:');
console.log('- 秘密鍵（VAPID_PRIVATE_KEY）は絶対に公開しないでください');
console.log('- 公開鍵（NEXT_PUBLIC_VAPID_PUBLIC_KEY）はクライアントで使用します');
console.log('- 一度生成した鍵は変更しないでください（既存の購読が無効になります）');
console.log('');
