# API ドキュメント

SkillFreak Streaming System の API リファレンス

## 目次

1. [REST API エンドポイント](#rest-api-エンドポイント)
2. [認証](#認証)
3. [エラーハンドリング](#エラーハンドリング)
4. [ライブラリAPI](#ライブラリapi)

---

## REST API エンドポイント

### 認証 API

#### `GET/POST /api/auth/[...nextauth]/route.ts`

NextAuth.js による Discord OAuth2 認証エンドポイント

**認証プロバイダー:**
- Discord OAuth2

**スコープ:**
- `identify` - ユーザー情報取得
- `email` - メールアドレス取得
- `guilds` - サーバー一覧取得
- `guilds.members.read` - サーバーメンバー情報取得

**環境変数:**
```bash
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_guild_id
DISCORD_MEMBER_ROLE_ID=your_member_role_id
```

**レスポンス:**
```typescript
{
  user: {
    id: string;
    name: string;
    email?: string;
    isMember: boolean; // SkillFreak会員かどうか
  }
}
```

---

### イベント API

#### `GET /api/archives`

アーカイブ動画付きイベント一覧を取得

**クエリパラメータ:**
- `page` (number, optional) - ページ番号（デフォルト: 1）
- `limit` (number, optional) - 1ページあたりの件数（デフォルト: 20）
- `sort` (string, optional) - ソート基準（`date` | `title`、デフォルト: `date`）
- `order` (string, optional) - ソート順（`asc` | `desc`、デフォルト: `desc`）

**リクエスト例:**
```bash
GET /api/archives?page=1&limit=10&sort=date&order=desc
```

**レスポンス:**
```json
{
  "archives": [
    {
      "id": "rec123",
      "title": "イベントタイトル",
      "description": "イベント説明",
      "event_date": "2025-01-20T10:00:00Z",
      "archive_url": "https://open.larksuite.com/drive/file/xxx",
      "thumbnail_url": null,
      "view_count": 0,
      "status": "ready",
      "created_at": "2025-01-20T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

#### `GET /api/archive/[eventId]`

特定イベントのアーカイブ動画ストリーミングURLを取得

**認証:** 必須（NextAuth セッション）

**パスパラメータ:**
- `eventId` (string) - LarkBase レコードID

**リクエスト例:**
```bash
GET /api/archive/rec123
Authorization: Bearer <session_token>
```

**レスポンス:**
```json
{
  "url": "https://example.larksuite.com/video/temp/xxx",
  "title": "イベントタイトル",
  "description": "説明",
  "expiresIn": 86400,
  "publishedAt": "2025-01-20T10:00:00Z"
}
```

**エラーレスポンス:**
```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "ログインが必要です"
}

// 404 Not Found
{
  "error": "Not Found",
  "message": "アーカイブ動画が見つかりません"
}

// 403 Forbidden (会員限定の場合)
{
  "error": "Forbidden",
  "message": "SkillFreak会員のみ視聴可能です",
  "joinUrl": "https://skillfreak.ivygain.jp/join"
}
```

---

#### `POST /api/archive/auto`

終了したイベントを自動でアーカイブ（Cron用）

**認証:** Bearer トークン（`CRON_SECRET`）

**リクエストボディ:**
```json
{
  "hours": 1,
  "dryRun": false
}
```

**ヘッダー:**
```
Authorization: Bearer <CRON_SECRET>
```

**リクエスト例:**
```bash
POST /api/archive/auto
Authorization: Bearer secret123
Content-Type: application/json

{
  "hours": 24,
  "dryRun": true
}
```

**レスポンス:**
```json
{
  "message": "Processed 3 events",
  "events": [
    {
      "eventId": "rec123",
      "eventTitle": "イベント名",
      "status": "success",
      "message": "Archive complete",
      "fileToken": "file_token_xxx"
    }
  ],
  "processed": 3,
  "success": 2,
  "failed": 1,
  "note": "サーバーレス環境ではダウンロード不可。GitHub ActionsまたはCLIで実行してください。"
}
```

**GET版（確認用）:**
```bash
GET /api/archive/auto?hours=24
```

---

### 配信 API

#### `GET /api/stream/status`

配信ステータスとリアルタイム統計を取得

**リクエスト例:**
```bash
GET /api/stream/status
```

**レスポンス:**
```json
{
  "is_live": true,
  "viewer_count": 42,
  "uptime": 86400,
  "bandwidth_used": 0,
  "last_update": "2025-01-20T10:30:00Z"
}
```

**フィールド説明:**
- `is_live` - 配信中かどうか（24時間配信のため常に `true`）
- `viewer_count` - 現在の視聴者数（簡易実装）
- `uptime` - システム起動時間（秒）
- `bandwidth_used` - 帯域使用量（未実装）
- `last_update` - 最終更新日時

---

#### `POST /api/stream/status`

配信統計を記録

**リクエストボディ:**
```json
{
  "viewer_count": 42,
  "current_video_id": "rec123",
  "bandwidth_used": 1024
}
```

**レスポンス:**
```json
{
  "success": true
}
```

注: 現在の実装では統計データの永続化を行っていません。必要に応じてLarkBaseテーブルを作成してください。

---

#### `GET /api/stream/sync`

24時間VOD配信の同期再生状態を取得

**リクエスト例:**
```bash
GET /api/stream/sync
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "currentVideo": {
      "id": "rec123",
      "title": "イベントタイトル",
      "url": "https://youtube.com/watch?v=xxx",
      "duration": 3600
    },
    "currentIndex": 2,
    "position": 1234,
    "isPlaying": true,
    "totalVideos": 10,
    "serverTime": "2025-01-20T10:30:00Z"
  }
}
```

---

#### `POST /api/stream/sync`

プレイリストを更新

**リクエストボディ:**
```json
{
  "action": "refresh"
}
```

または

```json
{
  "action": "set-duration",
  "videoId": "rec123",
  "duration": 3600
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Playlist refreshed",
  "totalVideos": 10
}
```

---

### Lark 統合 API

#### `GET /api/lark-image`

LarkBase添付ファイル画像をプロキシ経由で取得

**クエリパラメータ:**
- `token` (string) - Lark Drive ファイルトークン
- `url` (string) - LarkBase 一時ダウンロードURL（tmp_url）

**リクエスト例:**
```bash
GET /api/lark-image?token=file_token_xxx
# または
GET /api/lark-image?url=https%3A%2F%2Fopen.larksuite.com%2Fapi%2Fxxx
```

**レスポンス:**
画像バイナリデータ（Content-Type: image/png, image/jpeg, etc.）

**ヘッダー:**
```
Content-Type: image/png
Cache-Control: public, max-age=3600
```

---

#### `GET /api/test-lark`

Lark API接続テスト（開発用）

**クエリパラメータ:**
- `fileToken` (string) - テスト用ファイルトークン

**リクエスト例:**
```bash
GET /api/test-lark?fileToken=U5MtbbETooJlMkxq7jwjsCWGpHb
```

**レスポンス:**
```json
{
  "success": true,
  "fileToken": "U5MtbbETooJlMkxq7jwjsCWGpHb",
  "url": "https://example.larksuite.com/temp/xxx",
  "expiresIn": 86400,
  "message": "Lark API接続成功！"
}
```

---

#### `GET /api/video-direct`

Lark Drive動画の直接URLを取得

**クエリパラメータ:**
- `token` (string) - Lark Drive ファイルトークン

**リクエスト例:**
```bash
GET /api/video-direct?token=U5MtbbETooJlMkxq7jwjsCWGpHb
```

**レスポンス:**
```json
{
  "success": true,
  "videoUrl": "https://example.larksuite.com/video/xxx",
  "fileInfo": {
    "name": "video.mp4",
    "size": 1024000,
    "type": "video/mp4"
  },
  "expiresIn": 86400
}
```

---

## 認証

### NextAuth セッション

API経由でのセッション確認:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const session = await getServerSession(authOptions);

if (!session?.user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

// 会員チェック
const isMember = session.user.isMember;
```

### Discord OAuth2 フロー

1. **認証URL取得**
```typescript
import { getDiscordAuthUrl } from '@/lib/discord-auth';

const authUrl = getDiscordAuthUrl('http://localhost:3000/api/auth/callback/discord');
// => https://discord.com/oauth2/authorize?client_id=...
```

2. **コールバック処理**（NextAuthが自動処理）

3. **セッション情報取得**
```typescript
const session = await getServerSession();
console.log(session.user.isMember); // true/false
```

---

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "error": "Error Type",
  "message": "エラーメッセージ",
  "details": "詳細情報（開発環境のみ）"
}
```

### HTTPステータスコード

| コード | 意味 | 説明 |
|--------|------|------|
| 200 | OK | 正常に処理完了 |
| 400 | Bad Request | リクエストパラメータ不正 |
| 401 | Unauthorized | 認証が必要 |
| 403 | Forbidden | アクセス権限なし（非会員） |
| 404 | Not Found | リソースが見つからない |
| 500 | Internal Server Error | サーバーエラー |

---

## ライブラリAPI

### LarkBase Client (`lib/larkbase-client.ts`)

#### `getAllEvents(options?)`

全イベントを取得

```typescript
import { getAllEvents } from '@/lib/larkbase-client';

const events = await getAllEvents({
  status: 'published',
  visibility: 'public',
  limit: 50
});
```

**オプション:**
- `status` - イベントステータス（`draft` | `published` | `archived`）
- `visibility` - 公開設定（`public` | `members-only`）
- `limit` - 取得件数上限

**戻り値:** `Promise<Event[]>`

---

#### `getEventById(id)`

イベント詳細を取得

```typescript
import { getEventById } from '@/lib/larkbase-client';

const event = await getEventById('rec123');
```

**戻り値:** `Promise<Event | null>`

---

#### `getArchivedEvents()`

アーカイブ動画付きイベントのみ取得

```typescript
import { getArchivedEvents } from '@/lib/larkbase-client';

const archives = await getArchivedEvents();
```

**戻り値:** `Promise<Event[]>`

---

#### `getVODEvents()`

VOD配信用イベント取得（YouTube URLまたはアーカイブ付き）

```typescript
import { getVODEvents } from '@/lib/larkbase-client';

const vodEvents = await getVODEvents();
```

**戻り値:** `Promise<Event[]>`

---

### Lark Drive Client (`lib/lark-client.ts`)

#### `getTemporaryVideoUrl(fileToken)`

Lark Drive動画の一時URL取得（24時間有効）

```typescript
import { getTemporaryVideoUrl } from '@/lib/lark-client';

const url = await getTemporaryVideoUrl('file_token_xxx');
// => https://example.larksuite.com/temp/video_xxx
```

**戻り値:** `Promise<string>`

---

#### `uploadVideoToLark(filePath, folderToken)`

動画をLark Driveにアップロード（10MB未満推奨）

```typescript
import { uploadVideoToLark } from '@/lib/lark-client';

const fileToken = await uploadVideoToLark(
  '/path/to/video.mp4',
  'folder_token_xxx'
);
```

**戻り値:** `Promise<string>` - ファイルトークン

---

### Lark Drive HTTP Client (`lib/lark-drive-http.ts`)

#### `uploadVideoToLarkHTTP(filePath, folderToken)`

大容量動画をLark Driveにアップロード（分割アップロード対応）

```typescript
import { uploadVideoToLarkHTTP } from '@/lib/lark-drive-http';

const fileToken = await uploadVideoToLarkHTTP(
  '/path/to/large-video.mp4',
  'folder_token_xxx'
);
```

**戻り値:** `Promise<string>` - ファイルトークン

---

### Discord Auth (`lib/discord-auth.ts`)

#### `getDiscordAuthUrl(redirectUri)`

Discord OAuth2認証URLを生成

```typescript
import { getDiscordAuthUrl } from '@/lib/discord-auth';

const url = getDiscordAuthUrl('http://localhost:3000/callback');
```

**戻り値:** `string` - 認証URL

---

#### `authenticateUser(code, redirectUri)`

認証コードからユーザー情報と会員ステータスを取得

```typescript
import { authenticateUser } from '@/lib/discord-auth';

const { user, isMember } = await authenticateUser(
  'oauth_code_xxx',
  'http://localhost:3000/callback'
);
```

**戻り値:** `Promise<{ user: DiscordUser, isMember: boolean }>`

---

#### `isSkillFreakMember(accessToken, guildId, memberRoleId)`

ユーザーがSkillFreak会員かチェック

```typescript
import { isSkillFreakMember } from '@/lib/discord-auth';

const isMember = await isSkillFreakMember(
  'access_token',
  'guild_id',
  'role_id'
);
```

**戻り値:** `Promise<boolean>`

---

### 型定義

#### Event型

```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  scheduled_at: string; // ISO 8601
  youtube_url?: string;
  archive_file_token?: string;
  archive_url?: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'members-only';
  published_at?: string;
  created_at: string;

  // 拡張フィールド
  category?: string;
  tags?: string[];
  speaker?: Speaker;
  duration?: number; // 分
  attendees?: number;
  rating?: number;
  thumbnail?: string;
  benefits?: Benefit[];
  survey_url?: string;
  location?: string;
}
```

#### Speaker型

```typescript
interface Speaker {
  name: string;
  title: string;
  avatar?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}
```

#### Benefit型

```typescript
interface Benefit {
  id: string;
  type: 'url' | 'prompt' | 'text';
  title: string;
  content: string;
  description?: string;
}
```

#### DiscordUser型

```typescript
interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}
```

---

## レート制限

### Lark API

- **一時URL取得**: 1000リクエスト/分（推奨: キャッシュ利用）
- **ファイルアップロード**: 100リクエスト/時
- **LarkBase読み取り**: 1000リクエスト/分

### Discord API

- **OAuth2**: 10リクエスト/秒
- **ギルドメンバー確認**: 5リクエスト/秒

注: Discord会員チェックはNextAuth初回認証時のみ実行され、セッションにキャッシュされます。

---

## 開発者向けTips

### 環境変数の設定

`.env.local` に必要な環境変数を設定:

```bash
# Lark
LARK_APP_ID=cli_xxxxx
LARK_APP_SECRET=xxxxx
LARKBASE_APP_TOKEN=xxxxx
LARKBASE_TABLE_ID=xxxxx
LARK_DRIVE_FOLDER_ID=xxxxx

# Discord
DISCORD_CLIENT_ID=xxxxx
DISCORD_CLIENT_SECRET=xxxxx
DISCORD_GUILD_ID=xxxxx
DISCORD_MEMBER_ROLE_ID=xxxxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Cron
CRON_SECRET=your-cron-secret
```

### ローカルテスト

```bash
# 開発サーバー起動
npm run dev

# Lark API接続テスト
curl http://localhost:3000/api/test-lark?fileToken=xxx

# アーカイブ一覧取得
curl http://localhost:3000/api/archives

# 配信ステータス取得
curl http://localhost:3000/api/stream/status
```

---

## サポート

問題や質問がある場合は GitHub Issues を利用してください。

- GitHub: https://github.com/IvyGain/skillfreak-streaming-system
- Discord: SkillFreak サーバー
