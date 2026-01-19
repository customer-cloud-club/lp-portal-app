# SkillFreak ストリーミングシステム 仕様書

**Version 0.0.5** | 最終更新: 2025年12月14日

---

## 目次

1. [システム概要](#システム概要)
2. [主要機能一覧](#主要機能一覧)
3. [技術スタック](#技術スタック)
4. [決済・会員管理システム](#決済会員管理システム)
5. [認証システム](#認証システム)
6. [コンテンツ管理](#コンテンツ管理)
7. [UI/UXコンポーネント](#uiuxコンポーネント)
8. [API仕様](#api仕様)
9. [デプロイ環境](#デプロイ環境)
10. [セキュリティ](#セキュリティ)

---

## システム概要

### SkillFreak とは

**SkillFreak**は、オンラインセミナー・教育コンテンツを提供する会員制ストリーミングプラットフォームです。

```
┌─────────────────────────────────────────────────────────────┐
│                    SkillFreak システム                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ユーザー                                                   │
│      │                                                      │
│      ▼                                                      │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐               │
│   │   LP    │───▶│ Discord │───▶│ Stripe  │               │
│   │  ページ  │    │  認証   │    │  決済   │               │
│   └─────────┘    └─────────┘    └─────────┘               │
│                        │              │                     │
│                        ▼              ▼                     │
│                  ┌─────────────────────┐                   │
│                  │   Webhook処理        │                   │
│                  │  ・ロール自動付与    │                   │
│                  │  ・会員データ管理    │                   │
│                  └─────────────────────┘                   │
│                        │                                    │
│                        ▼                                    │
│   ┌─────────────────────────────────────────┐             │
│   │           会員限定コンテンツ              │             │
│   │  ・100本以上のセミナーアーカイブ         │             │
│   │  ・24時間ライブ配信                      │             │
│   │  ・お気に入り・プレイリスト機能          │             │
│   └─────────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ターゲットユーザー

| ペルソナ | ニーズ |
|---------|--------|
| スキルアップしたい社会人 | 隙間時間で学習したい |
| フリーランサー | 最新のスキルを身につけたい |
| 起業家・経営者 | ビジネスノウハウを学びたい |
| クリエイター | デザイン・技術を磨きたい |

---

## 主要機能一覧

### 1. 決済・課金システム

| 機能 | 説明 | 状態 |
|------|------|------|
| Stripe決済 | クレジットカード決済（月額¥5,980） | ✅ |
| サブスクリプション管理 | 自動更新・解約処理 | ✅ |
| Webhook自動処理 | 決済完了時の自動ロール付与 | ✅ |
| テスト決済環境 | 開発・検証用の決済テスト | ✅ |

### 2. 認証・会員管理

| 機能 | 説明 | 状態 |
|------|------|------|
| Discord OAuth2 | DiscordアカウントでSSO | ✅ |
| ロールベースアクセス | 会員/非会員でコンテンツ制御 | ✅ |
| 自動ロール付与 | 決済完了で「支払いOK」ロール自動付与 | ✅ |
| セッション管理 | JWT/NextAuth統合 | ✅ |

### 3. コンテンツ配信

| 機能 | 説明 | 状態 |
|------|------|------|
| セミナーアーカイブ | 100本以上の動画コンテンツ | ✅ |
| 24時間ライブ配信 | VODリピート配信 | ✅ |
| 会員限定表示 | ブラー・ロック機能 | ✅ |
| カテゴリ分類 | ジャンル別セミナー検索 | ✅ |

### 4. ユーザー機能

| 機能 | 説明 | 状態 |
|------|------|------|
| お気に入り登録 | セミナーをブックマーク | ✅ |
| カスタムプレイリスト | 自分だけの再生リスト作成 | ✅ |
| 視聴履歴 | 途中から再開可能 | ✅ |
| PWAプッシュ通知 | 新着セミナー通知 | ✅ |

### 5. 管理機能

| 機能 | 説明 | 状態 |
|------|------|------|
| LarkBase連携 | イベント・会員データ管理 | ✅ |
| ログイン履歴記録 | アクセス分析 | ✅ |
| 通知ブロードキャスト | 全会員への一斉通知 | ✅ |

---

## 技術スタック

### フロントエンド

```
┌────────────────────────────────────────┐
│            フロントエンド               │
├────────────────────────────────────────┤
│  Next.js 15        App Router          │
│  React 19          最新の並行機能       │
│  TypeScript 5      型安全な開発         │
│  Tailwind CSS 4    ユーティリティCSS    │
│  next-auth         認証ライブラリ       │
└────────────────────────────────────────┘
```

### バックエンド

```
┌────────────────────────────────────────┐
│            バックエンド                 │
├────────────────────────────────────────┤
│  Next.js API Routes  サーバーレスAPI    │
│  Cloudflare Workers  エッジコンピュート │
│  LarkBase            データベース       │
│  Lark Drive          動画ストレージ     │
└────────────────────────────────────────┘
```

### 外部サービス連携

| サービス | 用途 |
|---------|------|
| **Stripe** | 決済処理 |
| **Discord** | OAuth認証・コミュニティ |
| **Lark/Feishu** | データ管理・ストレージ |
| **Cloudflare** | ホスティング・CDN |

---

## 決済・会員管理システム

### 決済フロー

```
┌──────────────────────────────────────────────────────────┐
│                     決済フロー                           │
└──────────────────────────────────────────────────────────┘

  ① ユーザーがLPページで「メンバーになる」をクリック
                    │
                    ▼
  ② Discord未ログイン → Discordログイン画面へリダイレクト
                    │
                    ▼
  ③ ログイン完了 → LPページに戻る（checkout=true）
                    │
                    ▼
  ④ /api/checkout が Stripe Checkout Session を作成
     • Discord ID をメタデータに含める
     • 価格: ¥5,980/月（サブスクリプション）
                    │
                    ▼
  ⑤ Stripeチェックアウト画面でカード情報入力
                    │
                    ▼
  ⑥ 決済完了 → Stripe Webhook が発火
                    │
                    ▼
  ⑦ /api/webhooks/stripe が受信
     • メタデータから Discord ID を取得
     • Discord Bot API でロール付与
     • LarkBase に会員データ保存
                    │
                    ▼
  ⑧ ユーザーに「支払いOK」ロール付与 → 会員コンテンツ解放
```

### Stripe設定

| 項目 | 本番環境 | テスト環境 |
|------|---------|-----------|
| API キー | `sk_live_***` | `sk_test_***` |
| 価格ID | `price_1SWcxB***` | `price_1Se6nt***` |
| Webhook | `whsec_***` | テストモード |
| 金額 | ¥5,980/月 | ¥5,980/月 |

### Webhook イベント処理

| イベント | 処理内容 |
|---------|---------|
| `checkout.session.completed` | Discordロール付与、会員登録 |
| `customer.subscription.updated` | サブスクリプション状態更新 |
| `customer.subscription.deleted` | ロール削除、会員解除 |
| `invoice.payment_succeeded` | 支払い成功記録 |
| `invoice.payment_failed` | 支払い失敗通知 |

---

## 認証システム

### Discord OAuth2 フロー

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   ユーザー   │      │  SkillFreak │      │   Discord   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  ログインクリック   │                    │
       │───────────────────▶│                    │
       │                    │                    │
       │                    │  OAuth2リクエスト   │
       │                    │───────────────────▶│
       │                    │                    │
       │  認証画面表示       │◀───────────────────│
       │◀───────────────────│                    │
       │                    │                    │
       │  認証許可           │                    │
       │───────────────────▶│                    │
       │                    │                    │
       │                    │  アクセストークン   │
       │                    │◀───────────────────│
       │                    │                    │
       │                    │  ユーザー情報取得   │
       │                    │───────────────────▶│
       │                    │                    │
       │                    │  プロフィール       │
       │                    │◀───────────────────│
       │                    │                    │
       │  JWTセッション発行  │                    │
       │◀───────────────────│                    │
       │                    │                    │
```

### セッション情報

```typescript
interface Session {
  user: {
    id: string;              // Discord ID
    name: string;            // Discord ユーザー名
    email: string;           // メールアドレス
    image: string;           // アバター URL
    isMember: boolean;       // Discordサーバーメンバーか
    isPaidMember: boolean;   // 有料会員か
    stripeCustomerId?: string; // Stripe顧客ID
    discordUsername?: string;  // Discord表示名
  }
}
```

### ロール管理

| ロール | 権限 |
|--------|------|
| 非会員 | LP閲覧、イベント一覧（ブラー表示） |
| サーバーメンバー | コミュニティアクセス |
| **支払いOK** | 全コンテンツ閲覧、アーカイブ視聴 |

---

## コンテンツ管理

### LarkBase データ構造

#### イベントテーブル

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | Text | イベントID |
| title | Text | タイトル |
| description | Text | 説明文 |
| date | DateTime | 開催日時 |
| category | Select | カテゴリ |
| speakerName | Text | 講師名 |
| thumbnail | URL | サムネイル画像 |
| archiveUrl | URL | アーカイブ動画URL |
| isMemberOnly | Boolean | 会員限定フラグ |

#### 会員テーブル

| フィールド | 型 | 説明 |
|-----------|-----|------|
| discordId | Text | Discord ID |
| stripeCustomerId | Text | Stripe顧客ID |
| subscriptionId | Text | サブスクリプションID |
| status | Select | active/canceled/past_due |
| createdAt | DateTime | 登録日 |
| updatedAt | DateTime | 更新日 |

### 動画配信

| 機能 | 実装 |
|------|------|
| ストレージ | Lark Drive |
| 配信形式 | HLS / MP4 |
| 再生プレイヤー | カスタムプレイヤー |
| アクセス制御 | 会員認証必須 |

---

## UI/UXコンポーネント

### ページ構成

| パス | 説明 | アクセス |
|------|------|---------|
| `/` | ホーム | 全員 |
| `/lp` | ランディングページ | 全員 |
| `/lptest` | テスト決済LP | 開発者 |
| `/events` | イベント一覧 | 全員（会員限定はブラー） |
| `/events/[id]` | イベント詳細 | 会員のみフル表示 |
| `/live` | ライブ配信 | 会員のみ |
| `/playlist` | プレイリスト | 会員のみ |
| `/favorites` | お気に入り | 会員のみ |
| `/auth/signin` | ログイン | 全員 |
| `/checkout/success` | 決済完了 | 会員 |

### コンポーネント

```
components/
├── MemberOnlyBlur.tsx      # 会員限定コンテンツのブラー表示
├── MemberOnlyWrapper.tsx   # 会員認証ラッパー
├── UserMenu.tsx            # ユーザーメニュー（ログイン状態表示）
├── FavoriteButton.tsx      # お気に入りボタン
├── PWANotificationPrompt.tsx # プッシュ通知許可プロンプト
└── portal/
    ├── BottomNavigation.tsx  # モバイルナビゲーション
    ├── EventCard.tsx         # イベントカード
    └── EventCardCompact.tsx  # コンパクトイベントカード
```

### レスポンシブ対応

| ブレークポイント | デザイン |
|----------------|---------|
| Mobile (< 640px) | ボトムナビゲーション、カード縦並び |
| Tablet (640-1024px) | 2カラムグリッド |
| Desktop (> 1024px) | サイドバー、3カラムグリッド |

---

## API仕様

### 認証API

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/auth/[...nextauth]` | ALL | NextAuth認証 |
| `/api/auth/refresh-role` | POST | ロール状態更新 |

### 決済API

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/checkout` | POST | 本番チェックアウト |
| `/api/checkout` | GET | セッション状態取得 |
| `/api/checkout/test` | POST | テストチェックアウト |
| `/api/webhooks/stripe` | POST | Stripeイベント処理 |

### コンテンツAPI

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/events` | GET | イベント一覧取得 |
| `/api/events/[id]` | GET | イベント詳細取得 |
| `/api/lark-image` | GET | 画像プロキシ |

### 通知API

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/push/subscribe` | POST | プッシュ通知登録 |
| `/api/push/broadcast` | POST | 一斉通知送信 |
| `/api/push/test` | POST | テスト通知 |

---

## デプロイ環境

### Cloudflare Workers

```yaml
# wrangler.toml
name = "skillfreak-streaming"
compatibility_date = "2024-12-01"

[vars]
NODE_ENV = "production"
NEXTAUTH_URL = "https://skillfreak-streaming.ivygain.workers.dev"
NEXT_PUBLIC_APP_URL = "https://skillfreak-streaming.ivygain.workers.dev"
```

### 環境変数（Secrets）

| 変数名 | 説明 |
|--------|------|
| `NEXTAUTH_SECRET` | NextAuth暗号化キー |
| `DISCORD_CLIENT_ID` | Discord OAuth クライアントID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth シークレット |
| `DISCORD_GUILD_ID` | SkillFreakサーバーID |
| `DISCORD_MEMBER_ROLE_ID` | 「支払いOK」ロールID |
| `DISCORD_BOT_TOKEN` | Discord Bot トークン |
| `STRIPE_SECRET_KEY` | Stripe本番シークレットキー |
| `STRIPE_PRICE_ID` | Stripe本番価格ID |
| `STRIPE_WEBHOOK_SECRET` | Stripeウェブフックシークレット |
| `STRIPE_TEST_SECRET_KEY` | Stripeテストシークレットキー |
| `STRIPE_TEST_PRICE_ID` | Stripeテスト価格ID |
| `LARK_APP_ID` | Lark App ID |
| `LARK_APP_SECRET` | Lark App シークレット |
| `LARKBASE_APP_TOKEN` | LarkBase アプリトークン |
| `LARKBASE_TABLE_ID` | イベントテーブルID |

### デプロイURL

| 環境 | URL |
|------|-----|
| 本番 | https://skillfreak-streaming.ivygain.workers.dev |
| LP | https://skillfreak-streaming.ivygain.workers.dev/lp |
| テストLP | https://skillfreak-streaming.ivygain.workers.dev/lptest |

---

## セキュリティ

### 認証セキュリティ

- **JWT暗号化**: NEXTAUTH_SECRETによる署名
- **HTTPOnly Cookie**: XSS対策
- **CSRF保護**: NextAuth標準機能

### 決済セキュリティ

- **Webhook署名検証**: Stripe署名によるリクエスト検証
- **PCI DSS準拠**: Stripeによるカード情報処理
- **シークレット管理**: Cloudflare Secretsで暗号化保存

### アクセス制御

```typescript
// 会員限定コンテンツの保護
if (!session?.user?.isPaidMember) {
  return <MemberOnlyBlur />;  // ブラー表示
}
return <FullContent />;  // フルコンテンツ表示
```

### API保護

- **認証必須エンドポイント**: JWTトークン検証
- **レート制限**: Cloudflare標準保護
- **CORS設定**: 許可オリジンのみ

---

## まとめ

### 実装済み機能サマリー

| カテゴリ | 機能数 | 状態 |
|---------|-------|------|
| 決済システム | 4 | ✅ 完成 |
| 認証システム | 4 | ✅ 完成 |
| コンテンツ配信 | 4 | ✅ 完成 |
| ユーザー機能 | 5 | ✅ 完成 |
| 管理機能 | 3 | ✅ 完成 |
| **合計** | **20** | **100%** |

### 技術的特徴

1. **エッジコンピューティング**: Cloudflare Workersによる高速レスポンス
2. **サーバーレス**: インフラ管理不要
3. **自動スケーリング**: トラフィック増加に自動対応
4. **グローバルCDN**: 世界中から高速アクセス

### ビジネス価値

- **即座の収益化**: 決済システム完備
- **自動化**: 会員登録・解約の自動処理
- **スケーラブル**: 会員数増加に対応
- **低運用コスト**: サーバーレスアーキテクチャ

---

**SkillFreak ストリーミングシステム v0.0.5**

© 2025 SkillFreak. All rights reserved.
