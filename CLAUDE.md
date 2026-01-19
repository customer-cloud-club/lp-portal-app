# LP Portal - Claude Code Context (SSOT)

## プロジェクト概要

**LP Portal** - LarkBase LPテーブル連携型ランディングページ一覧ポータル

LarkBase多元表の「LP」テーブルからレコードを取得し、ランディングページ一覧を表示するポータルシステム。

## 公開URL

**https://lp-portal-app.ivygain.workers.dev**

## システムフロー

```
LarkBase (多元表 - DB)
  └─ LPテーブル (tbleuPP6QtZt3Dm8)
       ↓ API取得
Portal (Next.js 15)
  └─ LP一覧ページ
       ├─ カード形式でLP表示
       ├─ タイトル・説明・ステータス
       └─ LPへのリンク
```

## 技術スタック

- **フロントエンド**: Next.js 15 + React 19 + Tailwind CSS 4
- **データベース**: LarkBase多元表
- **デプロイ**: Cloudflare Workers（OpenNext経由）

## LarkBase設定

### 接続情報

```bash
# Lark/Feishu API
LARK_APP_ID=cli_a9da5d0d8af8de1a
LARK_APP_SECRET=PZhfO1sv3vwLRsQQeDbdPbtJZWTz4Wgd

# Bitable設定
# Wiki URL: https://customer-cloud.jp.larksuite.com/wiki/VCCNwfe2Birpd8kus00jUDD1ppc
# Bitable Name: 【CCリリース情報まとめ】LP・プロダクト開発・デモ動画・議事録・セミナー
LARKBASE_APP_TOKEN=EG7kb49Sqaijy7seo2vjYxIdp3f
LARKBASE_TABLE_ID=tbleuPP6QtZt3Dm8  # LPテーブル
```

### LPテーブル フィールドマッピング（12件）

| フィールド名 | Field ID | 型 | 用途 |
|-------------|----------|-----|------|
| LPタイトル | fld7UBgkaI | Text | LP名 |
| プロダクト | fldpSOE2yF | SingleSelect | 関連プロダクト |
| 公開URL | fldpe4GH5K | URL | LPのURL |
| Status | fldEsYRWlS | SingleSelect | ステータス |
| 紹介文 | fldPf4oTcc | Text | LP説明文 |
| ポータルで公開 | fldPCt8RhZ | Checkbox | 表示フラグ |
| 開発リポジトリパス | fld6CT85g5 | URL | GitHubリポジトリ |
| Priority | fldFdDurcf | SingleSelect | 優先度 |
| タスクリスト | fldSHtyD0b | URL | タスクリストURL |
| 締切日 | fldcJnAlU5 | DateTime | 締切日 |
| 担当者 | fldck1MQlv | SingleSelect | 担当者 |
| 作成日 | fldeIdyTE8 | CreatedTime | 作成日 |

## プロジェクト構造

```
LPPortalApp/
├── app/                      # Next.js App Router
│   ├── page.tsx             # LP一覧ページ（メイン）
│   ├── layout.tsx           # レイアウト
│   ├── globals.css          # グローバルスタイル
│   ├── api/                 # API Routes
│   │   └── lp/
│   │       └── route.ts     # LP一覧取得API
│   └── components/          # コンポーネント
│       ├── LPCard.tsx       # LPカードコンポーネント
│       └── LPList.tsx       # LP一覧コンポーネント
├── lib/                     # ライブラリ
│   └── larkbase-client.ts   # LarkBase API クライアント
├── scripts/                 # ユーティリティスクリプト
│   ├── get-wiki-table-fields.ts  # フィールド取得
│   └── add-sample-record.ts      # サンプルレコード追加
├── wrangler.toml            # Cloudflare設定
└── .env                     # 環境変数（ローカル）
```

## 開発コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# Cloudflareビルド
npm run build:cloudflare

# Cloudflareデプロイ
npm run deploy

# フィールド情報取得
npx tsx scripts/get-wiki-table-fields.ts
```

## 実装済み機能

- [x] LarkBase LPテーブル接続
- [x] LP一覧API（`/api/lp`）
- [x] LP一覧ページ（カード形式）
- [x] 「ポータルで公開」フラグによるフィルタリング
- [x] ステータス・優先度バッジ表示
- [x] LPへのリンクボタン
- [x] GitHubリポジトリへのリンク
- [x] Cloudflare Workersへのデプロイ

## Bitable権限について

### 権限の仕組み

1. **Developer Console** で `bitable:app` 権限を付与
2. **Bitable側の「閲覧権限」** でアクセス可能なテーブルを設定
3. 「閲覧権限」はアプリに対しても読み書き両方の権限として機能

### 新しいテーブルを追加する場合

外部ユーザーが作成したテーブルはデフォルトでアプリにアクセス権がない。
Bitableの「高度な権限管理」→「閲覧権限」で新しいテーブルを追加する必要がある。

## 注意事項

- LarkBase APIはCloudflare Workers互換（native fetch使用）
- Wiki形式のBitableはobj_tokenを使用してアクセス
- 認証不要（公開ポータル）
- wrangler.tomlに環境変数を設定（本番用）

---

*このファイルはClaude Codeが自動的に参照するSSOT（Single Source of Truth）です。*
*プロジェクトの変更に応じて常に最新の状態に更新してください。*
