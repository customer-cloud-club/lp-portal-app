# SkillFreak Streaming System - YouTube自動アーカイブロードマップ

## 概要

YouTube Liveアーカイブを自動でLark Driveに保存し、LarkBaseで管理、Portal（Next.js）で24時間リピート配信するシステム

**目指すアーキテクチャ:**
```
YouTube Live 終了
      ↓ [自動検知・自動ダウンロード]
yt-dlp でダウンロード
      ↓
Lark Drive にアップロード → file_token 取得
      ↓
LarkBase に メタデータ + file_token を登録
      ↓
Portal で Lark Drive 動画を再生
```

## 現在の状態（2025-01-25）

### 実装済みコンポーネント

| コンポーネント | 状態 | 問題点 |
|--------------|------|--------|
| `youtube-to-lark-drive.ts` | 部分完成 | 手動実行のみ、自動トリガーなし |
| `lark-drive-http.ts` | コード完成 | **API権限エラー(403)** - 要設定 |
| `larkbase-client.ts` | 完成 | 動作確認済み |
| `LarkVideoPlayer.tsx` | 完成 | iframe埋め込みで再生可能 |
| イベント詳細ページ | ✅ **Phase 1完了** | **Lark Drive最優先で再生** |
| 24時間VOD | 部分完成 | プレイリスト再生は動くが、終了検知がダミー |

---

## 実装ロードマップ

### ✅ Phase 1: Lark Drive動画再生を有効化（完了！）

- [x] イベント詳細ページで `archive_file_token` がある場合は `LarkVideoPlayer` を使用
- [x] 優先順位: **Lark Drive → YouTube → 直接URL → プレースホルダー**
- [ ] テスト用にLarkBaseに既存動画のfile_tokenを登録

**実装内容:**
- `app/events/[id]/page.tsx:280-340` - 動画再生優先順位を変更
- Lark Driveのfile_tokenがある場合、最優先で`LarkVideoPlayer`を使用
- プレイヤー下部に再生ソース表示（Lark Drive / YouTube / 直接URL）

**確認方法:**
```bash
# 開発サーバー起動（既に起動中）
npm run dev

# イベント詳細ページで確認
# http://localhost:3001/events/[id]
```

### Phase 2: Lark Drive API権限修正（設定作業）

- [ ] Lark Admin で「ファイルアップロード」権限を有効化
  - 管理画面: https://open.larksuite.com/app
  - アプリID: `cli_a85cf9e496f8de1c`
  - 必要な権限: `drive:drive:readonly`, `drive:drive:write`, `bitable:app:all`
- [ ] アップロードテスト実行・確認
  ```bash
  npx ts-node scripts/youtube-to-lark-drive.ts "https://www.youtube.com/watch?v=xxxxx"
  ```
- [ ] エラーハンドリング改善

### Phase 3: YouTube Live 自動アーカイブ（メイン機能）

#### 3.1 YouTube Data API v3 連携
- [ ] Google Cloud Consoleでプロジェクト作成
- [ ] YouTube Data API v3を有効化
- [ ] API Key取得・環境変数設定

#### 3.2 ライブ配信終了検知
- [ ] ライブ配信終了を定期ポーリングで検知（5分間隔）
- [ ] Webhook対応（PubSubHubbub）※オプション
- [ ] 検知スクリプト作成: `scripts/youtube-live-monitor.ts`

#### 3.3 自動アーカイブパイプライン
- [ ] 終了検知 → ダウンロード → アップロード → LarkBase登録の一連フロー
- [ ] Next.js API Route: `app/api/youtube-archive/route.ts`
- [ ] Cron job設定（Vercel Cron or GitHub Actions）

#### 3.4 通知機能
- [ ] Slack/Discord/Lark Bot連携
- [ ] アーカイブ完了通知
- [ ] エラー通知

### Phase 4: 24時間VOD配信の改善

- [ ] Lark Drive動画の実際の再生終了を検知
- [ ] プレイリスト自動ローテーション
- [ ] 視聴者数カウント・アナリティクス
- [ ] リアルタイム同期機能（WebSocket）

### Phase 5: 運用・管理機能

- [ ] 管理画面（アーカイブ一覧、手動登録、削除）
- [ ] Discord認証連携（会員限定コンテンツ）
- [ ] エラー監視・アラート
- [ ] ログ集計・可視化

---

## データマッピング

### LarkBase → PortalApp Event

```typescript
// LarkBase（現在）
interface LarkEvent {
  id: string;
  title: string;                    // イベントタイトル
  description: string;              // 告知用文章
  scheduled_at: string;             // イベント開始日時
  youtube_url?: string;             // YouTube URL
  archive_url?: string;             // セミナーURL.link
  archive_file_token?: string;      // Lark Drive token
}

// PortalApp Event（目標）
interface Event {
  id: string;
  title: string;
  description: string;
  speaker: {
    name: string;                   // 登壇者
    title: string;                  // 登壇者(セレクト)
    avatar?: string;
  };
  date: string;                     // scheduled_at
  duration: number;                 // 分
  category: string;                 // カテゴリ（要追加）
  tags: string[];
  thumbnail?: string;
  videoUrl?: string;                // youtube_url || archive_url
  isArchived: boolean;              // archive_url存在時true
}
```

---

## API エンドポイント

### このプロジェクト（Next.js）

| エンドポイント | 説明 |
|---------------|------|
| `GET /api/stream/sync` | 現在の再生状態を取得 |
| `POST /api/stream/sync` | プレイリスト更新 |
| `GET /api/stream/status` | 配信ステータス |
| `GET /api/archives` | アーカイブ一覧 |

### PortalApp用API（作成予定）

| エンドポイント | 説明 |
|---------------|------|
| `GET /api/events` | 全イベント取得 |
| `GET /api/events/:id` | イベント詳細 |
| `GET /api/events/upcoming` | 今後のイベント |
| `GET /api/events/archived` | アーカイブ済み |

---

## 環境変数

```bash
# LarkBase（共通）
LARK_APP_ID=cli_a85cf9e496f8de1c
LARK_APP_SECRET=dVj86A5gl12OBQl0tX5FDfR5FoDvsJLq
LARKBASE_APP_TOKEN=SU35bfdM4aa9emsMOZfjIpxdpCf
LARKBASE_TABLE_ID=tblnPssJqIBXNi6a

# API URL（PortalApp用）
NEXT_PUBLIC_API_URL=https://skillfreak.vercel.app
```

---

## 並列作業計画

### tmux セッション

```bash
# セッション1: Next.js開発サーバー
PORT=3001 npm run dev

# セッション2: PortalApp開発
cd /Users/mashimaro/SkillFreak-PortalApp && bun start

# セッション3: Git操作
# コミット・プッシュ・PR作成
```

---

## 最終更新

**2025-01-25 - Phase 1完了**
- Lark Drive動画再生を最優先で使用するように実装
- イベント詳細ページ (`app/events/[id]/page.tsx`) を修正
- 優先順位: Lark Drive → YouTube → 直接URL → プレースホルダー
