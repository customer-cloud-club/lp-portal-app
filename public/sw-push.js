/**
 * シンプルなPush通知用Service Worker
 * 開発・テスト用 - Workbox依存なし
 */

// Push通知受信時
self.addEventListener('push', function(event) {
  console.log('[SW-Push] Push received');

  if (!event.data) {
    console.log('[SW-Push] No data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'SkillFreak',
      body: event.data.text(),
    };
  }

  const title = data.title || 'SkillFreak';
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'skillfreak',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時
self.addEventListener('notificationclick', function(event) {
  console.log('[SW-Push] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.openWindow(url)
  );
});

// インストール時
self.addEventListener('install', function(event) {
  console.log('[SW-Push] Installed');
  self.skipWaiting();
});

// アクティベート時
self.addEventListener('activate', function(event) {
  console.log('[SW-Push] Activated');
  event.waitUntil(clients.claim());
});

console.log('[SW-Push] Loaded');
