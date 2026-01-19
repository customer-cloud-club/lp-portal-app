# AI Dream Factory Portal - 設計書

## 1. プロジェクト概要

**AI Dream Factory Sales Portal** - LarkBaseエコシステム統合型プロダクトショーケースポータル

様々なAIプロダクトのデモ動画を一覧表示し、プロダクトの魅力を伝えるポータルサイト。

### 1.1 コンセプト

- **目的**: AI Dream Factoryが開発する各種AIプロダクトのデモ動画を集約・展示
- **ターゲット**: 潜在顧客、投資家、パートナー企業
- **差別化**: 15秒プレビュー再生によるインタラクティブな体験

### 1.2 SkillFreakAppからの変更点

| 機能 | SkillFreak | AI Dream Factory |
|------|------------|------------------|
| コンテンツ | セミナー動画 | プロダクトデモ動画 |
| 認証 | Discord OAuth | なし（将来Lark OAuth） |
| 決済 | Stripe連携 | なし |
| ライブ配信 | あり | なし |
| プレビュー | なし | 15秒自動再生 |
| 管理画面 | フル機能 | ロジックのみ（UI非表示） |

---

## 2. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Dream Factory Portal                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15 + React 19)                           │
│  ├── /                    ホーム（プロダクト一覧）            │
│  ├── /products            プロダクトギャラリー               │
│  ├── /products/[id]       プロダクト詳細                     │
│  └── /showcase            一気見モード（プレイリスト）        │
├─────────────────────────────────────────────────────────────┤
│  API Routes (Edge Runtime)                                   │
│  ├── /api/products        プロダクト一覧取得                  │
│  ├── /api/products/[id]   プロダクト詳細取得                  │
│  └── /api/lark/video/[token]  動画ストリーミング             │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  ├── LarkBase API         プロダクト情報（多元表）            │
│  └── Lark Drive           動画ファイル                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. データモデル

### 3.1 LarkBase テーブル構造（開発テーブル）

| フィールド名 | Field ID | 型 | ポータル用途 |
|-------------|----------|-----|-------------|
| Project Name | fld7UBgkaI | Text | プロダクト名 |
| 紹介動画 | fld5nHsAZ3 | Attachment | メイン動画 |
| ポータルで公開 | fldPCt8RhZ | Checkbox | 表示フラグ（trueのみ表示） |
| Status | fldEsYRWlS | SingleSelect | ステータスバッジ |
| 製品デプロイURL | fldpe4GH5K | URL | 製品リンク |
| Assignee | fldck1MQlv | SingleSelect | 開発者名 |
| Notes | fldPTmpwQa | Text | プロダクト説明 |
| Created Date | fldeIdyTE8 | CreatedTime | 作成日 |

### 3.2 TypeScript型定義

```typescript
interface Product {
  id: string;                    // record_id
  name: string;                  // Project Name
  description: string;           // Notes
  videoUrl: string;              // 紹介動画（Lark Drive URL）
  videoToken: string;            // 紹介動画のfile_token
  thumbnailUrl?: string;         // 動画サムネイル（自動生成）
  status: ProductStatus;         // Status
  deployUrl?: string;            // 製品デプロイURL
  developer: string;             // Assignee
  createdAt: string;             // Created Date
  isPublic: boolean;             // ポータルで公開
}

type ProductStatus =
  | 'not_started'      // 1.未着手
  | 'in_progress'      // 2.進行中
  | 'review_pending'   // 3.レビュー待ち
  | 'fixing'           // 4.修正中
  | 'deploy_pending'   // 5.デプロイ待ち
  | 'deployed'         // 6.デプロイ済み
  | 'done';            // 7.完了
```

---

## 4. ページ構成

### 4.1 ホーム / プロダクト一覧 (`/`)

**レイアウト**: グリッドギャラリー（2-4列レスポンシブ）

**機能**:
- プロダクトカードのグリッド表示
- ホバー時に15秒プレビュー自動再生
- ステータスバッジ表示
- 無限スクロール

**コンポーネント構成**:
```
HomePage
├── Header (ロゴ、ナビゲーション)
├── ProductGrid
│   └── ProductCard[] (15秒プレビュー付き)
└── Footer
```

### 4.2 プロダクト詳細 (`/products/[id]`)

**レイアウト**: 動画プレイヤー + 情報パネル

**機能**:
- フル動画再生
- プロダクト説明
- 開発者情報
- 製品リンク（デプロイURL）
- ステータス表示

**コンポーネント構成**:
```
ProductDetailPage
├── Header
├── VideoPlayer (フルサイズ)
├── ProductInfo
│   ├── Title
│   ├── Description
│   ├── Developer
│   ├── Status Badge
│   └── Deploy Link
└── RelatedProducts (関連プロダクト)
```

### 4.3 ショーケース / 一気見 (`/showcase`)

**レイアウト**: 連続再生プレイヤー + サイドバープレイリスト

**機能**:
- 全プロダクト動画の連続再生
- 前へ/次へナビゲーション
- プレイリストサイドバー
- 自動次再生

**コンポーネント構成**:
```
ShowcasePage
├── Header
├── MainPlayer
│   ├── VideoPlayer
│   ├── NowPlaying Info
│   └── Controls (前/次)
└── Playlist Sidebar
    └── PlaylistItem[]
```

---

## 5. コンポーネント設計

### 5.1 ProductCard（15秒プレビュー付き）

```typescript
interface ProductCardProps {
  product: Product;
  onHover?: () => void;
}

// 状態管理
- isHovering: boolean
- videoRef: RefObject<HTMLVideoElement>
- previewTimeout: number (15秒タイマー)

// 動作
1. マウスホバー → 動画再生開始
2. 15秒経過 → 動画停止、最初に戻る
3. マウスアウト → 動画停止
4. クリック → 詳細ページへ遷移
```

### 5.2 VideoPlayer

```typescript
interface VideoPlayerProps {
  videoToken: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  previewMode?: boolean;      // 15秒制限モード
  previewDuration?: number;   // デフォルト15秒
}
```

### 5.3 StatusBadge

```typescript
const statusConfig = {
  not_started: { label: '未着手', color: 'gray' },
  in_progress: { label: '開発中', color: 'blue' },
  review_pending: { label: 'レビュー待ち', color: 'yellow' },
  fixing: { label: '修正中', color: 'orange' },
  deploy_pending: { label: 'デプロイ待ち', color: 'purple' },
  deployed: { label: '公開中', color: 'green' },
  done: { label: '完了', color: 'green' },
};
```

---

## 6. API設計

### 6.1 プロダクト一覧取得

```
GET /api/products
Query: ?status=deployed&limit=20

Response:
{
  success: true,
  products: Product[],
  total: number,
  hasMore: boolean
}
```

### 6.2 プロダクト詳細取得

```
GET /api/products/[id]

Response:
{
  success: true,
  product: Product
}
```

### 6.3 動画ストリーミング（既存流用）

```
GET /api/lark/video/[token]
Headers: Range (optional)

Response: video/mp4 stream
```

---

## 7. デザインシステム

### 7.1 カラーパレット（ダークテーマ）

```css
:root {
  --bg-primary: #0F0F23;      /* 背景 */
  --bg-secondary: #1A1A2E;    /* カード背景 */
  --bg-tertiary: #2D1B69;     /* ホバー/アクセント背景 */

  --text-primary: #FFFFFF;    /* メインテキスト */
  --text-secondary: #9CA3AF;  /* サブテキスト */
  --text-muted: #6B7280;      /* ミュートテキスト */

  --accent-primary: #8B5CF6;  /* パープル（メインアクセント） */
  --accent-secondary: #06B6D4;/* シアン（サブアクセント） */
  --accent-gradient: linear-gradient(135deg, #8B5CF6, #06B6D4);

  --status-deployed: #10B981; /* 公開中 */
  --status-progress: #3B82F6; /* 開発中 */
  --status-pending: #F59E0B;  /* 待機中 */
}
```

### 7.2 タイポグラフィ

```css
--font-heading: 'Inter', -apple-system, sans-serif;
--font-body: 'Inter', -apple-system, sans-serif;

--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

### 7.3 スペーシング（4pxグリッド）

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

---

## 8. 削除対象コンポーネント

SkillFreakAppから以下を削除/無効化：

### 8.1 認証関連
- `/app/auth/` - 認証ページ
- `/app/api/auth/` - 認証API
- `components/UserMenu.tsx`
- `components/MemberOnly*.tsx`
- `lib/auth-options.ts`

### 8.2 決済関連
- `/app/checkout/` - 決済ページ
- `/app/api/checkout/` - 決済API
- `/app/api/subscription/` - サブスクAPI
- `/app/api/webhooks/stripe/` - Stripe Webhook

### 8.3 ライブ配信関連
- `/app/live/` - ライブページ
- `/app/stream/` - ストリームページ
- `/app/api/stream/` - ストリームAPI

### 8.4 その他
- `/app/calendar/` - カレンダー
- `/app/favorites/` - お気に入り
- `/app/settings/` - 設定
- `/app/account/` - アカウント

---

## 9. 環境変数

```bash
# Lark App認証
LARK_APP_ID=cli_a9da5d0d8af8de1a
LARK_APP_SECRET=PZhfO1sv3vwLRsQQeDbdPbtJZWTz4Wgd

# LarkBase（多元表）
LARKBASE_APP_TOKEN=EG7kb49Sqaijy7seo2vjYxIdp3f
LARKBASE_TABLE_ID=tblFzJmX4eRb4vof

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. 実装フェーズ

### Phase 1: 基盤構築
1. 不要コンポーネントの削除
2. LarkBase APIクライアント修正（新テーブル対応）
3. 型定義作成

### Phase 2: コア機能
4. プロダクト一覧ページ（ギャラリービュー）
5. 15秒プレビュー機能
6. プロダクト詳細ページ

### Phase 3: 拡張機能
7. ショーケース（一気見）ページ
8. レスポンシブ対応
9. パフォーマンス最適化

### Phase 4: KHK公開機能（2026-01-14 実装完了）
10. KHK公開フィルタリング機能
11. YouTube/紹介動画優先表示
12. 放送開始日時によるカウントダウン・動画切り替え

### Phase 5: 仕上げ
13. デザインエージェント原則に基づくUI/UX改善
14. ビルド・テスト
15. デプロイ

---

## 11. KHK公開機能

### 11.1 概要

ホーム画面上部の「おすすめプロダクト」枠にて、LarkBase開発テーブルの「KHKで公開」フラグが有効なプロダクトを特別表示する機能。

### 11.2 追加フィールド（LarkBase）

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| KHKで公開 | Checkbox | おすすめプロダクト表示フラグ |
| YouTubeLink | URL | YouTube動画リンク |
| 放送開始日時 | DateTime | 配信開始予定時刻 |

### 11.3 動画表示優先順位

1. **放送開始前**: カウントダウン表示
2. **YouTubeリンクあり**: YouTube埋め込みプレイヤー
3. **紹介動画あり**: Lark Drive動画
4. **どちらもなし**: プレースホルダー

### 11.4 追加API

```
GET /api/products/khk
Response:
{
  success: true,
  products: Product[],  // KHKで公開=trueのプロダクト
  total: number
}
```

### 11.5 追加コンポーネント

- `FeaturedKHKProduct.tsx` - おすすめKHKプロダクト表示
- `YouTubeEmbed.tsx` - YouTube埋め込みプレイヤー
- `BroadcastCountdown` - 放送開始カウントダウン（内部）

---

## 12. デザインエージェント原則の適用

### 12.1 シンプルが先（Simplicity First）
- 初回表示は最小限の情報
- ホバーで詳細情報を段階的に開示
- 設定画面なし

### 12.2 即時フィードバック（Instant Feedback）
- ホバー即座にプレビュー開始（100ms以内）
- ローディングスケルトン表示
- スムーズなトランジション

### 12.3 認知負荷の最小化
- 1画面の情報量を制限
- 明確な視覚階層
- 直感的なナビゲーション

### 12.4 品質スコア目標
- Clarity: 95/100
- Consistency: 98/100
- Accessibility: AA準拠
- Performance: LCP < 2.5s

---

*作成日: 2025-12-28*
*最終更新: 2026-01-14* - KHK公開機能追加
