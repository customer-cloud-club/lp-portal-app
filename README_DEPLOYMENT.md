# 🚀 SkillFreak Streaming System - デプロイメントガイド

## 実装完了機能一覧

### ✅ コア機能（100%完成）

1. **Lark Drive HTTP APIアップロード**
   - 分割アップロード対応（大容量ファイル対応）
   - 直接HTTP API呼び出し（SDK問題回避）
   - プログレス表示機能
   - ファイル: `lib/lark-drive-http.ts`

2. **LarkBase統合**
   - イベント一覧取得
   - イベント作成・更新
   - アーカイブURL自動登録
   - ファイル: `lib/portalapp-sync.ts`

3. **Discord OAuth2認証**
   - NextAuth統合
   - SkillFreakサーバー連携
   - 会員ロール確認
   - ファイル: `lib/discord-auth.ts`, `app/api/auth/[...nextauth]/route.ts`

4. **会員権限管理システム**
   - 会員/非会員判定
   - コンテンツアクセス制御
   - ファイル: `lib/auth-middleware.ts`, `components/MemberOnly.tsx`

5. **Portal UI（会員制対応）**
   - イベント一覧ページ（会員ステータス表示）
   - イベント詳細ページ（会員限定動画）
   - サインインページ
   - ファイル: `app/events/`, `app/auth/signin/`

6. **YouTube自動アーカイブ**
   - yt-dlpダウンロード
   - Lark Driveアップロード
   - LarkBase自動登録
   - ファイル: `scripts/youtube-to-lark-drive.ts`

## 環境変数設定

```bash
# .env に以下を設定

# Lark/Feishu API
LARK_APP_ID=cli_a85cf9e496f8de1c
LARK_APP_SECRET=dVj86A5gl12OBQl0tX5FDfR5FoDvsJLq
LARKBASE_APP_TOKEN=PxvIwd2fniGE5pkiC0YjHCNEpad
LARKBASE_TABLE_ID=tblnPssJqIBXNi6a
LARKBASE_VIEW_ID=vewdrMdlvD
LARK_DRIVE_FOLDER_ID=R2oWfpO5wlLEwBd5dMIjGRwvp2g

# Discord OAuth2
DISCORD_CLIENT_ID=<your_client_id>
DISCORD_CLIENT_SECRET=<your_client_secret>
DISCORD_GUILD_ID=<skillfreak_guild_id>
DISCORD_MEMBER_ROLE_ID=<member_role_id>

# NextAuth
NEXTAUTH_URL=http://localhost:3000  # 本番環境では変更
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# GitHub (Miyabi Agents)
GITHUB_TOKEN=<your_token>

# Anthropic (Miyabi Agents)
ANTHROPIC_API_KEY=<your_api_key>
```

## デプロイ手順

### 1. 依存関係インストール

```bash
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. 開発サーバー起動

```bash
npm run dev
```

### 4. 本番環境デプロイ

#### Vercel デプロイ

```bash
# Vercel CLI インストール
npm install -g vercel

# デプロイ
vercel --prod
```

#### 環境変数設定（Vercel）

Vercelダッシュボードで環境変数を設定:

- Settings → Environment Variables
- 上記の環境変数をすべて追加

## テスト実行

### HTTPアップロードテスト

```bash
npx tsx scripts/test-upload.ts
```

### LarkBase統合テスト

```bash
npx tsx scripts/test-larkbase-integration.ts
```

### Jest統合テスト

```bash
npm test
```

## 使い方

### YouTube動画をアーカイブ

```bash
npx tsx scripts/youtube-to-lark-drive.ts "https://youtube.com/watch?v=xxxxx"
```

### Portal アクセス

1. http://localhost:3000/events - イベント一覧
2. http://localhost:3000/auth/signin - ログイン
3. http://localhost:3000/live - 24時間配信

## アーキテクチャ

```
YouTube Live
    ↓ yt-dlp
Lark Drive（アーカイブストレージ）
    ↓ HTTP API
LarkBase（イベント管理DB）
    ↓ API
Portal（Next.js）
    ↓ Discord OAuth
会員認証・コンテンツ制御
```

## セキュリティ

- ✅ 環境変数で機密情報管理
- ✅ Discord OAuth2認証
- ✅ 会員/非会員権限分離
- ✅ NextAuth セッション管理
- ✅ HTTPS必須（本番環境）

## パフォーマンス

- ✅ 分割アップロード（大容量対応）
- ✅ ISR（60秒キャッシュ）
- ✅ 動的ページ最適化
- ✅ Lark CDN活用

## モニタリング

- Vercel Analytics
- LarkBase管理画面
- Lark Drive容量確認

## トラブルシューティング

### アップロード失敗

→ `lib/lark-drive-http.ts` を確認
→ アクセストークンをチェック

### 会員判定エラー

→ Discord GUILD_ID, ROLE_ID を確認
→ NextAuth設定をチェック

### LarkBase接続エラー

→ APP_TOKEN, TABLE_ID を確認
→ Lark SDK バージョン確認

## サポート

- GitHub Issues: https://github.com/IvyGain/skillfreak-streaming-system/issues
- Miyabi Framework: https://github.com/ShunsukeHayashi/Autonomous-Operations
