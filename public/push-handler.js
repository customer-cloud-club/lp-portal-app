/**
 * Push通知ハンドラー (Service Worker拡張)
 * このファイルはsw.jsから読み込まれます
 */

// Push通知受信時のハンドラー
self.addEventListener('push', function(event) {
  console.log('[Push] Received push notification');

  if (!event.data) {
    console.log('[Push] No data in push event');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[Push] Failed to parse push data:', e);
    data = {
      title: 'SkillFreak',
      body: event.data.text(),
      icon: '/skillfreak-icon.png',
      badge: '/skillfreak-icon.png',
    };
  }

  const title = data.title || 'SkillFreak';
  const options = {
    body: data.body || '',
    icon: data.icon || '/skillfreak-icon.png',
    badge: data.badge || '/skillfreak-icon.png',
    image: data.image, // 大きな画像（オプション）
    tag: data.tag || 'skillfreak-notification',
    renotify: true, // 同じtagでも再通知
    requireInteraction: data.requireInteraction || false, // 自動で消えない
    vibrate: [200, 100, 200], // バイブレーションパターン（Android）
    data: {
      url: data.url || '/',
      eventId: data.eventId,
      type: data.type, // 'morning', 'before15', 'before5'
      timestamp: Date.now(),
    },
    actions: data.actions || [
      {
        action: 'open',
        title: '開く',
        icon: '/skillfreak-icon.png',
      },
      {
        action: 'dismiss',
        title: '閉じる',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時のハンドラー
self.addEventListener('notificationclick', function(event) {
  console.log('[Push] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // 通知データからURLを取得
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // 既に開いているウィンドウがあればフォーカス
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(function(focusedClient) {
              // 該当ページに遷移
              if (focusedClient && 'navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        // 開いているウィンドウがなければ新しく開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// 通知を閉じた時のハンドラー（分析用）
self.addEventListener('notificationclose', function(event) {
  console.log('[Push] Notification closed');
  // ここで分析データを送信することも可能
});

// Push Subscription変更時のハンドラー
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[Push] Subscription changed');

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY, // グローバルから取得
    }).then(function(subscription) {
      // 新しいsubscriptionをサーバーに送信
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    })
  );
});

console.log('[Push Handler] Loaded successfully');
