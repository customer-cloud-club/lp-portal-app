# 24時間配信サーバーシステム - 完全ガイド

## 概要

このシステムは、全ユーザーが同じ動画を同じ位置で視聴できる24時間VOD配信を実現します。

### 主要機能

- **完全同期**: 全クライアントが同じ動画・同じ位置で視聴
- **24時間ループ**: プレイリストを自動リピート再生
- **Redis永続化**: Upstash Redisで状態を永続化（サーバーレス対応）
- **ネットワーク遅延補正**: クライアント側で遅延を自動補正
- **スムーズな動画切り替え**: 次の動画への自然な遷移

## アーキテクチャ

```
┌─────────────────┐
│  Upstash Redis  │ ← 同期状態を永続化
└────────┬────────┘
         │
    ┌────▼────┐
    │  Vercel │ ← Next.js API Routes
    └────┬────┘
         │
    ┌────▼────────────────┐
    │ 複数クライアント     │ ← 全員が同期視聴
    └─────────────────────┘
```

### コンポーネント構成

1. **lib/streaming/sync-server.ts** - Redis同期サーバー
2. **lib/streaming/playlist-scheduler.ts** - プレイリスト管理
3. **app/api/stream/sync/route.ts** - 同期API
4. **components/stream/SyncLivePlayer.tsx** - 同期プレイヤー

## セットアップ

### 1. Upstash Redis作成

1. [Upstash](https://upstash.com) でアカウント作成
2. 新しいRedis DBを作成
3. REST APIの認証情報を取得:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. 環境変数設定

`.env.local` に以下を追加:

```bash
# Upstash Redis（24時間配信同期用）
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 3. プレイリスト初期化

```bash
# APIを呼び出してプレイリストを初期化
curl -X POST http://localhost:3000/api/stream/sync \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh"}'
```

## 使用方法

### ユーザー側

1. `/live` ページにアクセス
2. 自動的にサーバーと同期された動画が再生される
3. 全ユーザーが同じ位置で視聴

### 管理者側

#### プレイリスト更新

```bash
curl -X POST http://localhost:3000/api/stream/sync \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh"}'
```

#### 動画の長さを設定

```bash
curl -X POST http://localhost:3000/api/stream/sync \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set-duration",
    "videoId": "video123",
    "duration": 3600
  }'
```

#### 強制同期（管理者用）

```bash
curl -X POST http://localhost:3000/api/stream/sync \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync-force",
    "videoId": "video123",
    "position": 0
  }'
```

## API仕様

### GET /api/stream/sync

現在の再生状態を取得

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "currentVideo": {
      "id": "video123",
      "title": "Sample Video",
      "url": "https://youtube.com/watch?v=..."
    },
    "currentIndex": 0,
    "position": 123,
    "isPlaying": true,
    "totalVideos": 10,
    "serverTime": "2025-01-20T12:00:00.000Z",
    "syncedFromRedis": true
  }
}
```

### POST /api/stream/sync

プレイリストを更新・管理

**アクション:**

- `refresh` - プレイリストを再読み込み
- `set-duration` - 動画の長さを設定
- `sync-force` - 強制同期（管理者用）

## 技術仕様

### 同期精度

- **基本同期間隔**: 15秒
- **ネットワーク遅延補正**: 自動計算
- **誤差**: ±1秒以内

### Redis TTL

- **同期状態**: 24時間
- **プレイリスト**: 24時間
- **動画メタデータ**: 24時間

### フォールバック

Redis が利用できない場合は、インメモリスケジューラーにフォールバック。

## トラブルシューティング

### Redis接続エラー

```bash
# Redis接続テスト
curl http://localhost:3000/api/stream/sync
```

レスポンスに `"syncedFromRedis": false` が含まれる場合、Redis接続に失敗しています。

**解決方法:**

1. 環境変数が正しいか確認
2. Upstash Redisが有効か確認
3. ネットワーク接続を確認

### 同期がずれる

**原因:**

- ネットワーク遅延が大きい
- 動画の長さが正しく設定されていない

**解決方法:**

```bash
# 動画の長さを正確に設定
curl -X POST http://localhost:3000/api/stream/sync \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set-duration",
    "videoId": "video123",
    "duration": 3600
  }'
```

### プレイリストが表示されない

**解決方法:**

```bash
# プレイリストを再初期化
curl -X POST http://localhost:3000/api/stream/sync \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh"}'
```

## パフォーマンス最適化

### 推奨設定

- **Upstash Redis**: 無料プランで十分（1日10,000リクエスト）
- **Vercel**: Hobby/Pro プラン
- **同期間隔**: 15秒（デフォルト）

### コスト削減

- Redis TTL を適切に設定（24時間）
- 不要な同期リクエストを削減
- プレイリスト更新は必要時のみ

## セキュリティ

### 推奨事項

- 管理者APIに認証を追加
- Redis接続情報を環境変数で管理
- Vercel環境変数で本番設定

### 実装例（管理者認証）

```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (req.nextUrl.pathname.startsWith('/api/stream/sync')) {
    if (req.method === 'POST' && !isAdmin(authHeader)) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
}
```

## デプロイ

### Vercel デプロイ

1. Upstash Redis作成
2. Vercel環境変数設定:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
3. デプロイ実行:
   ```bash
   vercel --prod
   ```
4. プレイリスト初期化:
   ```bash
   curl -X POST https://your-app.vercel.app/api/stream/sync \
     -d '{"action": "refresh"}'
   ```

## モニタリング

### Upstash ダッシュボード

- リクエスト数
- レイテンシー
- エラー率

### Vercel Analytics

- API呼び出し回数
- レスポンスタイム
- エラーログ

## ロードマップ

### Phase 1 (完了)
- ✅ Redis統合
- ✅ ネットワーク遅延補正
- ✅ スムーズな動画切り替え

### Phase 2 (予定)
- [ ] チャット機能（みんなで視聴）
- [ ] リアクション機能
- [ ] 視聴者数表示

### Phase 3 (予定)
- [ ] 複数チャンネル対応
- [ ] スケジュール機能
- [ ] 分析ダッシュボード

## サポート

問題が発生した場合:

1. [GitHub Issues](https://github.com/IvyGain/skillfreak-streaming-system/issues)
2. [Discord Community](https://discord.gg/skillfreak)

---

**最終更新**: 2025-01-20
**バージョン**: 1.0.0
**ステータス**: Production Ready
