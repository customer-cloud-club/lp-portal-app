# KHK公開機能 実装手順書

## 1. 前提条件

### 1.1 環境要件
- Node.js 18+
- Next.js 15
- LarkBase APIアクセス権限

### 1.2 LarkBaseフィールド準備（完了済み）
- [x] KHKで公開（Checkbox）
- [x] YouTubeLink（URL）
- [ ] 放送開始日時（DateTime）※Phase 2で必要

---

## 2. 実装フェーズ

## Phase 1: KHK公開フィルタリングと動画優先表示

### Step 1: LarkBaseフィールドIDの確認

LarkBase APIを使用して新規フィールドのIDを確認する。

```bash
# フィールドメタデータ取得コマンド（開発時のみ）
curl -X GET "https://open.larksuite.com/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/fields" \
  -H "Authorization: Bearer {TOKEN}"
```

確認するフィールド:
- KHKで公開
- YouTubeLink

### Step 2: Product型定義の更新

`lib/product-client.ts` に新フィールドを追加。

```typescript
// 追加するフィールドID
export const FIELD_IDS = {
  // ... 既存フィールド
  khkPublish: 'fldXXXXXXXX',      // KHKで公開 - Checkbox
  youtubeLink: 'fldYYYYYYYY',     // YouTubeLink - URL
  broadcastStartTime: 'fldZZZZZZZZ', // 放送開始日時 - DateTime (Phase 2)
} as const;

// Product型を拡張
export interface Product {
  // ... 既存プロパティ
  khkPublish: boolean;           // KHKで公開フラグ
  youtubeLink?: string;          // YouTube URL
  broadcastStartTime?: string;   // 放送開始日時 (Phase 2)
}
```

### Step 3: recordToProduct関数の更新

```typescript
function recordToProduct(item: Record<string, unknown>): Product {
  const fields = (item.fields || {}) as Record<string, unknown>;

  return {
    // ... 既存のフィールド変換
    khkPublish: extractCheckbox(fields['KHKで公開']),
    youtubeLink: extractUrl(fields['YouTubeLink']),
    broadcastStartTime: extractDateTime(fields['放送開始日時']), // Phase 2
  };
}
```

### Step 4: getKHKProducts関数の追加

```typescript
/**
 * KHKで公開フラグがtrueのプロダクトを取得
 */
export async function getKHKProducts(): Promise<Product[]> {
  const allProducts = await getAllProducts({ includeHidden: true });

  // KHKで公開 = true のプロダクトをフィルタリング
  const khkProducts = allProducts.filter(p => p.khkPublish === true);

  // 作成日時の新しい順にソート
  return khkProducts.sort((a, b) =>
    new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  );
}
```

### Step 5: KHK API エンドポイント作成

`app/api/products/khk/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getKHKProducts } from '@/lib/product-client';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const products = await getKHKProducts();

    return NextResponse.json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error) {
    console.error('Failed to fetch KHK products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KHK products' },
      { status: 500 }
    );
  }
}
```

### Step 6: YouTubeEmbed コンポーネント作成

`components/portal/YouTubeEmbed.tsx`:

```typescript
'use client';

import { useMemo } from 'react';

interface YouTubeEmbedProps {
  url: string;
  className?: string;
}

/**
 * YouTube URLからvideo IDを抽出
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,          // 通常URL
    /youtu\.be\/([^?]+)/,                       // 短縮URL
    /youtube\.com\/live\/([^?]+)/,              // ライブURL
    /youtube\.com\/embed\/([^?]+)/,             // 埋め込みURL
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export default function YouTubeEmbed({ url, className = '' }: YouTubeEmbedProps) {
  const videoId = useMemo(() => extractYouTubeId(url), [url]);

  if (!videoId) {
    return (
      <div className={`aspect-video bg-gray-200 flex items-center justify-center ${className}`}>
        <p className="text-gray-500">無効なYouTube URL</p>
      </div>
    );
  }

  return (
    <div className={`aspect-video ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        className="w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
```

### Step 7: FeaturedKHKProduct コンポーネント作成

`components/portal/FeaturedKHKProduct.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, getVideoProxyUrl } from '@/lib/product-client';
import YouTubeEmbed from './YouTubeEmbed';

interface FeaturedKHKProductProps {
  product: Product;
}

export default function FeaturedKHKProduct({ product }: FeaturedKHKProductProps) {
  const videoUrl = getVideoProxyUrl(product);

  // 動画表示の優先順位: YouTube > 紹介動画 > プレースホルダー
  const renderVideo = () => {
    // YouTubeリンクがある場合
    if (product.youtubeLink) {
      return <YouTubeEmbed url={product.youtubeLink} className="rounded-t-xl" />;
    }

    // 紹介動画がある場合
    if (videoUrl) {
      return (
        <video
          src={videoUrl}
          className="w-full aspect-video object-cover rounded-t-xl"
          controls
          preload="metadata"
        />
      );
    }

    // どちらもない場合
    return (
      <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center rounded-t-xl">
        <svg className="w-20 h-20 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        おすすめプロダクト
      </h2>

      <Link href={`/products/${product.id}`} className="block">
        <div className="rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-blue-400/50 transition-all duration-300 shadow-sm hover:shadow-lg">
          {renderVideo()}

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                神回確定
              </span>
              {product.status === 'deployed' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                  公開中
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-1">
              {product.projectName}
            </h3>

            <p className="text-sm text-gray-600 line-clamp-2">
              {product.description || product.notes || 'プロダクト説明なし'}
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
}
```

### Step 8: HomeClient.tsx への統合

```typescript
// 追加インポート
import FeaturedKHKProduct from '@/components/portal/FeaturedKHKProduct';

// 新しいstate追加
const [khkProducts, setKhkProducts] = useState<Product[]>([]);

// useEffect内でKHKプロダクトを取得
useEffect(() => {
  const fetchProducts = async () => {
    try {
      // 通常のプロダクト取得
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }

      // KHKプロダクト取得
      const khkRes = await fetch('/api/products/khk');
      const khkData = await khkRes.json();
      if (khkData.success) {
        setKhkProducts(khkData.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };
  fetchProducts();
}, []);

// レンダリング部分
{!searchQuery && khkProducts.length > 0 && (
  <FeaturedKHKProduct product={khkProducts[0]} />
)}
```

---

## Phase 2: 放送開始日時による動画切り替え

### Step 1: 放送開始日時フィールドの追加

`lib/product-client.ts`:

```typescript
// DateTime抽出関数
function extractDateTime(field: unknown): string | undefined {
  if (!field) return undefined;

  // LarkBaseのDateTimeはミリ秒タイムスタンプ
  if (typeof field === 'number') {
    return new Date(field).toISOString();
  }

  if (typeof field === 'string') {
    return field;
  }

  return undefined;
}
```

### Step 2: カウントダウンコンポーネント

`components/portal/BroadcastCountdown.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface BroadcastCountdownProps {
  startTime: string;
  onStart: () => void;
}

export default function BroadcastCountdown({ startTime, onStart }: BroadcastCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const diff = start - now;

      if (diff <= 0) {
        setHasStarted(true);
        onStart();
        return null;
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeRemaining(calculateTimeRemaining());

    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, onStart]);

  if (hasStarted || !timeRemaining) {
    return null;
  }

  const formatTime = (value: number) => String(value).padStart(2, '0');

  return (
    <div className="aspect-video bg-gradient-to-br from-purple-900 to-indigo-900 flex flex-col items-center justify-center rounded-t-xl text-white">
      <p className="text-sm mb-2">放送開始まで</p>
      <div className="text-4xl font-bold font-mono">
        {timeRemaining.days > 0 && `${timeRemaining.days}日 `}
        {formatTime(timeRemaining.hours)}:{formatTime(timeRemaining.minutes)}:{formatTime(timeRemaining.seconds)}
      </div>
      <p className="text-sm mt-3 text-gray-300">
        {new Date(startTime).toLocaleString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
```

### Step 3: FeaturedKHKProduct コンポーネントの更新

```typescript
// Phase 2: 放送開始日時対応を追加

const [isBroadcastStarted, setIsBroadcastStarted] = useState(false);

// 放送開始判定
const shouldShowVideo = useMemo(() => {
  if (!product.broadcastStartTime) return true; // 日時未設定なら常に表示

  const now = new Date().getTime();
  const startTime = new Date(product.broadcastStartTime).getTime();
  return now >= startTime || isBroadcastStarted;
}, [product.broadcastStartTime, isBroadcastStarted]);

const renderVideo = () => {
  // 放送開始前はカウントダウン表示
  if (product.broadcastStartTime && !shouldShowVideo) {
    return (
      <BroadcastCountdown
        startTime={product.broadcastStartTime}
        onStart={() => setIsBroadcastStarted(true)}
      />
    );
  }

  // ... 既存のYouTube/紹介動画表示ロジック
};
```

---

## 3. テスト方法

### 3.1 手動テスト

1. **KHKフィルタリング**
   - LarkBaseで「KHKで公開」をtrueに設定
   - ホーム画面でおすすめプロダクトとして表示されることを確認

2. **YouTube優先表示**
   - YouTubeLinkを設定 → YouTube埋め込み表示確認
   - YouTubeLinkを空にして紹介動画を設定 → Lark Drive動画表示確認

3. **放送開始日時（Phase 2）**
   - 未来の日時を設定 → カウントダウン表示確認
   - 時刻経過後 → 動画表示への切り替え確認

### 3.2 自動テスト

```typescript
// __tests__/lib/product-client.test.ts
describe('extractYouTubeId', () => {
  it('should extract ID from standard YouTube URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('should extract ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('should extract ID from live URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });
});
```

---

## 4. デプロイ手順

1. 開発環境でのテスト完了
2. `npm run build` でビルド確認
3. `npm run build:cloudflare` でCloudflareビルド
4. `npm run deploy` でデプロイ

---

## 5. トラブルシューティング

### Q: KHKプロダクトが表示されない
- LarkBaseで「KHKで公開」フィールドにチェックが入っているか確認
- フィールドIDが正しいか確認
- APIレスポンスをブラウザのDevToolsで確認

### Q: YouTube動画が表示されない
- URLの形式が正しいか確認
- iframe sandboxポリシーを確認

### Q: カウントダウンが正しく動作しない
- タイムゾーンの設定を確認
- ブラウザのDateオブジェクトの挙動を確認

---

## 6. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2026-01-14 | 1.0 | 初版作成 |
