# デプロイメントガイド

SkillFreak Streaming System の本番環境デプロイ手順

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [環境変数一覧](#環境変数一覧)
4. [Vercelデプロイ](#vercelデプロイ)
5. [外部サービス設定](#外部サービス設定)
6. [デプロイ後の確認](#デプロイ後の確認)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このシステムは以下のプラットフォームで動作します:

- **フロントエンド/API**: Vercel（Next.js 15 App Router）
- **ストレージ**: Lark Drive
- **データベース**: LarkBase多元表
- **認証**: Discord OAuth2（NextAuth.js）

### アーキテクチャ図

```
┌─────────────────────────────────────────────┐
│         Vercel (Next.js 15)                 │
│  ┌──────────────┐  ┌──────────────┐         │
│  │  Frontend    │  │  API Routes  │         │
│  │  (React 19)  │  │  (Serverless)│         │
│  └──────────────┘  └──────────────┘         │
└──────────┬──────────────┬───────────────────┘
           │              │
           ▼              ▼
    ┌─────────────┐  ┌─────────────┐
    │   Discord   │  │    Lark     │
    │   OAuth2    │  │  Ecosystem  │
    └─────────────┘  └──────┬──────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │Lark Drive│ │ LarkBase │ │ Lark API │
         │(Storage) │ │   (DB)   │ │          │
         └──────────┘ └──────────┘ └──────────┘
```

---

## 前提条件

### 必要なアカウント

1. **Vercel アカウント**
   - URL: https://vercel.com
   - GitHubと連携済み

2. **Lark/Feishu アカウント**
   - URL: https://www.larksuite.com/ (International)
   - URL: https://www.feishu.cn/ (China)
   - テナント管理者権限が必要

3. **Discord Developer アカウント**
   - URL: https://discord.com/developers/applications
   - SkillFreakサーバーの管理者権限が必要

### ローカル開発環境

- Node.js 20+ (推奨: 20.x LTS)
- npm または yarn
- Git
- Vercel CLI（オプション）

```bash
# Vercel CLI インストール
npm install -g vercel
```

---

## 環境変数一覧

### 必須環境変数

以下の環境変数を `.env.local`（ローカル）または Vercel Dashboard（本番）で設定します。

#### 1. Lark/Feishu API

```bash
# Lark App認証情報
# 取得方法: https://open.larksuite.com/app → アプリを作成 → 認証情報
LARK_APP_ID=cli_a85cf9e496f8de1c
LARK_APP_SECRET=dVj86A5gl12OBQl0tX5FDfR5FoDvsJLq

# LarkBase 多元表設定
# 取得方法: LarkBaseを開く → URLから取得
# URL例: https://xxx.larksuite.com/base/{APP_TOKEN}?table={TABLE_ID}
LARKBASE_APP_TOKEN=PxvIwd2fniGE5pkiC0YjHCNEpad
LARKBASE_TABLE_ID=tblnPssJqIBXNi6a

# LarkBase ビューID（オプション）
LARKBASE_VIEW_ID=vewdrMdlvD

# Lark Drive アーカイブフォルダ
# 取得方法: Lark Drive → フォルダ右クリック → "リンクをコピー"
# URL例: https://xxx.larksuite.com/drive/folder/{FOLDER_ID}
LARK_DRIVE_FOLDER_ID=R2oWfpO5wlLEwBd5dMIjGRwvp2g
```

#### 2. Discord OAuth2

```bash
# Discord Application設定
# 取得方法: https://discord.com/developers/applications
DISCORD_CLIENT_ID=1421044988170473564
DISCORD_CLIENT_SECRET=your_discord_client_secret

# SkillFreak Discord サーバー
DISCORD_GUILD_ID=1189478304424656906

# 会員ロールID（例: "支払いOK" ロール）
DISCORD_MEMBER_ROLE_ID=1440689861844795422
```

#### 3. NextAuth.js

```bash
# NextAuth設定
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-random-secret-32-chars-minimum

# 生成方法:
# openssl rand -base64 32
```

#### 4. オプション環境変数

```bash
# Cron Job認証用シークレット
CRON_SECRET=your-cron-secret

# 配信開始時刻（24時間VOD用）
STREAM_START_TIME=2025-01-20T00:00:00Z

# テスト用ファイルトークン
TEST_FILE_TOKEN=U5MtbbETooJlMkxq7jwjsCWGpHb
```

---

## Vercelデプロイ

### 方法1: Vercel CLI（推奨）

```bash
# 1. プロジェクトディレクトリに移動
cd skillfreak-streaming-system

# 2. Vercelにログイン
vercel login

# 3. プロジェクトをリンク（初回のみ）
vercel link

# 4. 環境変数を設定（コマンドまたはDashboard）
vercel env add LARK_APP_ID production
vercel env add LARK_APP_SECRET production
# ... 他の環境変数も同様に追加

# 5. プロダクションデプロイ
vercel --prod
```

### 方法2: GitHub連携（自動デプロイ）

1. **GitHubリポジトリをVercelにインポート**
   - Vercel Dashboard → "Add New..." → "Project"
   - GitHubリポジトリを選択: `IvyGain/skillfreak-streaming-system`

2. **環境変数を設定**
   - Project Settings → Environment Variables
   - 上記の必須環境変数をすべて追加

3. **ビルド設定（自動検出されます）**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **デプロイ実行**
   - "Deploy" ボタンをクリック
   - または `git push` で自動デプロイ

### デプロイ設定

`vercel.json` の推奨設定:

```json
{
  "version": 2,
  "framework": "nextjs",
  "regions": ["hnd1"],
  "env": {
    "NODE_VERSION": "20"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    },
    "app/api/archive/auto/route.ts": {
      "maxDuration": 300
    }
  }
}
```

注: `vercel.json` は既にプロジェクトに含まれている場合があります。

---

## 外部サービス設定

### 1. Lark/Feishu App設定

#### アプリを作成

1. **Lark Open Platformにアクセス**
   - URL: https://open.larksuite.com/app
   - "Create App" → "Custom App"

2. **権限を設定**
   - 「権限管理」→ 以下の権限を追加:

   **必須権限:**
   - `drive:drive` - Driveアクセス
   - `drive:file:readonly` - ファイル読み取り
   - `drive:file:write` - ファイル書き込み
   - `bitable:app` - LarkBaseアクセス
   - `bitable:record` - レコード読み書き

3. **アプリを公開**
   - 「バージョン管理」→ 「新バージョンを作成」
   - 組織管理者に承認依頼

#### LarkBase 多元表を作成

1. **新規Baseを作成**
   - Lark → "Base" → "新規作成"
   - テーブル名: "イベント管理"

2. **フィールドを設定**

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| イベントタイトル | テキスト | イベント名 |
| 告知用文章 | 複数行テキスト | 説明文 |
| イベント開始日時 | 日時 | 開催日時 |
| セミナーURL | URL | YouTube URL |
| アーカイブ動画 | 添付ファイル/URL | Lark Drive動画 |
| アーカイブファイルトークン | テキスト | ファイルトークン |
| サムネイル | 添付ファイル | サムネイル画像 |
| 登壇者 | ユーザー | 登壇者情報 |
| 時間（分） | 数値 | 動画の長さ |

3. **App TokenとTable IDを取得**
   - URL: `https://xxx.larksuite.com/base/{APP_TOKEN}?table={TABLE_ID}`

#### Lark Drive フォルダを作成

1. **アーカイブ保存用フォルダを作成**
   - Lark Drive → 新規フォルダ → "SkillFreak アーカイブ"

2. **フォルダIDを取得**
   - フォルダ右クリック → "リンクをコピー"
   - URL: `https://xxx.larksuite.com/drive/folder/{FOLDER_ID}`

3. **フォルダ権限を設定**
   - アプリに「編集」権限を付与

---

### 2. Discord OAuth2設定

#### Discord Applicationを作成

1. **Discord Developer Portalにアクセス**
   - URL: https://discord.com/developers/applications
   - "New Application" をクリック

2. **OAuth2設定**
   - "OAuth2" → "General"
   - Redirect URIs に以下を追加:
     ```
     https://your-domain.vercel.app/api/auth/callback/discord
     http://localhost:3000/api/auth/callback/discord (開発用)
     ```

3. **Client IDとClient Secretを取得**
   - "OAuth2" → "Client information"
   - Client Secret は「Reset Secret」で再発行可能

#### Discord サーバー設定

1. **Guild IDを取得**
   - Discord → サーバー設定 → ウィジェット
   - または開発者モードで右クリック → "IDをコピー"

2. **会員ロールIDを取得**
   - サーバー設定 → ロール → "支払いOK"
   - 開発者モードで右クリック → "IDをコピー"

3. **ロール権限を確認**
   - 会員ロールが正しく設定されているか確認

---

### 3. YouTube API（オプション）

現在の実装では `yt-dlp` を使用しているため、YouTube APIキーは不要です。

将来的にAPI統合が必要な場合:

1. **Google Cloud Consoleでプロジェクト作成**
   - URL: https://console.cloud.google.com

2. **YouTube Data API v3 を有効化**

3. **APIキーを取得**
   ```bash
   YOUTUBE_API_KEY=your_youtube_api_key
   ```

---

## デプロイ後の確認

### 1. ヘルスチェック

```bash
# 基本的な接続確認
curl https://your-domain.vercel.app/api/test-lark?fileToken=xxx

# 配信ステータス確認
curl https://your-domain.vercel.app/api/stream/status

# アーカイブ一覧確認
curl https://your-domain.vercel.app/api/archives
```

### 2. 認証フロー確認

1. **Discord OAuth2テスト**
   - `https://your-domain.vercel.app/auth/signin` にアクセス
   - Discordでログイン
   - 会員ステータスが正しく表示されるか確認

2. **セッション確認**
   ```javascript
   // ブラウザのコンソールで実行
   fetch('/api/auth/session').then(r => r.json()).then(console.log)
   ```

### 3. LarkBase統合確認

```bash
# イベント一覧取得
curl https://your-domain.vercel.app/api/archives

# 特定イベント取得（要認証）
curl -H "Authorization: Bearer <token>" \
  https://your-domain.vercel.app/api/archive/rec123
```

### 4. Vercel Analyticsで監視

- Vercel Dashboard → Analytics
- リクエスト数、エラー率、レスポンスタイムを確認

---

## Cron Jobの設定（自動アーカイブ）

### Vercel Cronの設定

`vercel.json` に追加:

```json
{
  "crons": [
    {
      "path": "/api/archive/auto",
      "schedule": "0 * * * *"
    }
  ]
}
```

スケジュール例:
- `0 * * * *` - 毎時0分
- `0 0 * * *` - 毎日0時
- `0 */6 * * *` - 6時間ごと

### Cron Secret の設定

```bash
# ランダムな秘密鍵を生成
openssl rand -hex 32

# Vercelに環境変数として追加
vercel env add CRON_SECRET production
```

### 手動実行（テスト）

```bash
curl -X POST https://your-domain.vercel.app/api/archive/auto \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"hours": 24, "dryRun": true}'
```

---

## トラブルシューティング

### よくある問題

#### 1. Lark API 403 Forbidden

**原因:** アプリ権限が不足

**解決方法:**
1. Lark Open Platform → アプリ → 権限管理
2. 以下の権限を追加:
   - `drive:drive`
   - `drive:file:readonly`
   - `drive:file:write`
   - `bitable:app`
   - `bitable:record`
3. アプリを再公開 → 管理者承認

---

#### 2. Discord OAuth2エラー

**原因:** Redirect URIが一致しない

**解決方法:**
1. Discord Developer Portal → OAuth2 → Redirects
2. 正確なURLを追加:
   ```
   https://your-domain.vercel.app/api/auth/callback/discord
   ```
3. プロトコル（https）とパスが完全一致していることを確認

---

#### 3. NextAuth セッションエラー

**原因:** `NEXTAUTH_SECRET` が設定されていない

**解決方法:**
```bash
# 秘密鍵を生成
openssl rand -base64 32

# Vercelに追加
vercel env add NEXTAUTH_SECRET production
```

---

#### 4. ビルドエラー

**原因:** 環境変数がビルド時に設定されていない

**解決方法:**
1. Vercel Dashboard → Project Settings → Environment Variables
2. すべての必須環境変数が "Production" に設定されているか確認
3. 再デプロイ:
   ```bash
   vercel --prod --force
   ```

---

#### 5. Vercel Function Timeout

**原因:** API処理時間が上限（10秒/30秒）を超える

**解決方法:**
1. `vercel.json` でタイムアウトを延長:
   ```json
   {
     "functions": {
       "app/api/archive/auto/route.ts": {
         "maxDuration": 300
       }
     }
   }
   ```
2. Vercel Pro プランにアップグレード（最大300秒）

---

### デバッグ方法

#### Vercelログ確認

```bash
# リアルタイムログ
vercel logs --follow

# 特定のデプロイメントログ
vercel logs <deployment-url>
```

#### ローカルで本番環境をシミュレート

```bash
# 本番ビルドをローカルで実行
npm run build
npm run start

# または Vercel CLI
vercel dev
```

#### 環境変数の確認

```bash
# Vercelに設定された環境変数を確認
vercel env ls
vercel env pull .env.local
```

---

## セキュリティベストプラクティス

### 1. 環境変数の管理

- `.env.local` は `.gitignore` に含める
- GitHub Secretsではなく Vercel Environment Variables を使用
- 開発/ステージング/本番で異なる値を設定

### 2. API認証

```typescript
// APIルートで認証チェック
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 処理続行...
}
```

### 3. Cron Job保護

```typescript
// Cron Secret検証
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### 4. レート制限

Vercel Edge Middleware でレート制限を実装（オプション）:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // レート制限ロジック
  // ...

  return NextResponse.next();
}
```

---

## パフォーマンス最適化

### 1. Edge Runtime使用

```typescript
// app/api/archives/route.ts
export const runtime = 'edge'; // デフォルトは 'nodejs'
```

### 2. キャッシング戦略

```typescript
// Lark Drive URL キャッシュ（24時間）
export async function GET(req: NextRequest) {
  const res = NextResponse.json(data);
  res.headers.set('Cache-Control', 'public, max-age=86400');
  return res;
}
```

### 3. Image Optimization

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ivygain-project.jp.larksuite.com',
      },
    ],
  },
};
```

---

## バックアップ戦略

### LarkBase データバックアップ

1. **手動エクスポート**
   - LarkBase → "..." メニュー → "エクスポート" → Excel/CSV

2. **API経由でバックアップ**
   ```bash
   # 全イベントをJSON保存
   curl https://your-domain.vercel.app/api/archives?limit=1000 > backup.json
   ```

### Lark Drive バックアップ

- Lark Drive は自動的にバックアップされます（Lark側で管理）
- 重要な動画は追加のクラウドストレージにもコピー推奨

---

## 本番チェックリスト

デプロイ前に確認:

- [ ] すべての環境変数が Vercel に設定済み
- [ ] Lark App 権限が承認済み
- [ ] Discord OAuth2 Redirect URIs が正しい
- [ ] LarkBase テーブルにテストデータが存在
- [ ] Lark Drive フォルダがアプリから書き込み可能
- [ ] `NEXTAUTH_SECRET` が本番用の強固な値
- [ ] `vercel.json` の設定が正しい
- [ ] カスタムドメインを設定（オプション）
- [ ] Vercel Analytics が有効
- [ ] エラー監視（Sentry等）を設定（オプション）

---

## サポート

問題が解決しない場合:

1. **Vercel サポート**
   - https://vercel.com/support

2. **Lark サポート**
   - https://open.larksuite.com/support

3. **プロジェクト GitHub Issues**
   - https://github.com/IvyGain/skillfreak-streaming-system/issues

---

以上でデプロイメント完了です。
