# ADreamFactory Portal

LarkBaseエコシステム統合型営業ポータルプラットフォーム

## 概要

LarkBase多元表をデータベースとして活用し、Lark Driveで動画・資料を管理する営業支援ポータルシステムです。

### 主要機能

- 📋 コンテンツ管理（LarkBase連携）
- 🎥 動画再生（Lark Drive統合）
- 📁 資料閲覧・ダウンロード
- 🔐 認証・権限管理（Discord OAuth2）
- 📱 PWA対応（モバイル/デスクトップ）
- 🔔 Push通知

## 技術スタック

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- HLS.js / Video.js

### Backend
- Next.js API Routes
- Cloudflare Workers (OpenNext)

### Storage & Database
- LarkBase 多元表（データベース）
- Lark Drive（ファイルストレージ）

### Auth
- NextAuth.js
- Discord OAuth2

## クイックスタート

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集して必要な値を設定

# 開発サーバー起動
npm run dev

# ブラウザで開く
open http://localhost:3000
```

## プロジェクト構造

```
ADreamFactoryPortal/
├── app/                    # Next.js App Router
│   ├── events/            # コンテンツ一覧・詳細
│   ├── admin/             # 管理画面
│   ├── auth/              # 認証
│   └── api/               # API Routes
├── components/            # Reactコンポーネント
│   ├── portal/           # ポータルUI
│   ├── admin/            # 管理画面UI
│   └── stream/           # 動画プレイヤー
├── lib/                   # ライブラリ
│   ├── larkbase-client.ts # LarkBase API
│   ├── lark-drive-http.ts # Lark Drive API
│   └── auth-options.ts    # NextAuth設定
├── public/                # 静的ファイル
└── scripts/               # ユーティリティスクリプト
```

## 環境変数

`.env.example` を参照してください。主な設定：

- `LARK_APP_ID` / `LARK_APP_SECRET` - Lark API認証
- `LARKBASE_APP_TOKEN` / `LARKBASE_TABLE_ID` - LarkBase設定
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` - Discord認証
- `NEXTAUTH_SECRET` - セッション暗号化キー

## デプロイ

### Cloudflare Workers

```bash
# ビルド
npm run build:cloudflare

# デプロイ
npm run deploy
```

### 開発コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # 本番ビルド
npm test             # テスト実行
npm run lint         # Lint実行
npm run type-check   # 型チェック
```

## カスタマイズ

### LarkBase設定変更

1. `lib/larkbase-client.ts` でフィールドマッピングを調整
2. 環境変数で新しいテーブルIDを設定

### ブランディング変更

1. `public/manifest.json` - アプリ名・アイコン
2. `app/layout.tsx` - サイトタイトル
3. `components/SplashScreen.tsx` - ロゴ

## ライセンス

MIT

---

Built with Miyabi Framework
