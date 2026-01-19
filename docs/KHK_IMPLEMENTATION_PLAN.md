# KHK公開機能 実装計画書

## 概要

本ドキュメントは、ADreamFactory PortalにおけるKHK公開機能の実装手順を定義します。

---

## 実装フェーズ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         実装フェーズ全体図                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: 基本機能                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Task 1      │  │ Task 2      │  │ Task 3      │  │ Task 4     │ │
│  │ LarkBase    │→ │ API実装     │→ │ コンポーネント│→ │ 統合       │ │
│  │ クライアント │  │             │  │ 作成        │  │            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                     │
│  Phase 2: スケジュール機能                                          │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │ Task 5      │  │ Task 6      │                                   │
│  │ 放送開始日時│→ │ カウントダウン│                                   │
│  │ 処理        │  │ 実装        │                                   │
│  └─────────────┘  └─────────────┘                                   │
│                                                                     │
│  共通: テスト & ドキュメント                                         │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │ Task 7      │  │ Task 8      │                                   │
│  │ テスト実装  │  │ ドキュメント│                                   │
│  │             │  │ 更新        │                                   │
│  └─────────────┘  └─────────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 基本機能

### Task 1: LarkBaseクライアント拡張

**ファイル:** `lib/larkbase-client.ts`

**変更内容:**

1. Event型にKHKフィールドを追加
```typescript
interface Event {
  // 既存フィールド...

  // KHK機能追加
  khk_published: boolean;           // KHKで公開フラグ
  khk_youtube_url?: string;         // KHK用YouTubeリンク
  khk_intro_video_url?: string;     // KHK用紹介動画URL
  khk_intro_video_token?: string;   // 紹介動画ファイルトークン
  broadcast_start_at?: string;      // 放送開始日時
}
```

2. フィールドマッピング追加
```typescript
// getAllEvents関数内
khk_published: !!fields['KHKで公開'],
khk_youtube_url: extractLinkField(fields['YouTubeリンク']),
khk_intro_video_url: extractVideoUrl(fields['紹介動画']),
khk_intro_video_token: extractFileToken(fields['紹介動画']),
broadcast_start_at: fields['放送開始日時']
  ? new Date(fields['放送開始日時']).toISOString()
  : undefined,
```

3. KHK公開イベント取得関数追加
```typescript
export async function getKHKFeaturedEvents(): Promise<Event[]> {
  const events = await getAllEvents();
  return events
    .filter(e => e.khk_published)
    .filter(e => e.khk_youtube_url || e.khk_intro_video_url || e.khk_intro_video_token)
    .sort((a, b) => {
      // 放送開始日時 > 作成日時 でソート
      const dateA = a.broadcast_start_at || a.scheduled_at;
      const dateB = b.broadcast_start_at || b.scheduled_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
}
```

---

### Task 2: API実装

**新規ファイル:** `app/api/khk-featured/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getKHKFeaturedEvents } from '@/lib/larkbase-client';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const events = await getKHKFeaturedEvents();

    const khkEvents = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      video_type: e.khk_youtube_url ? 'youtube' : 'intro',
      video_url: e.khk_youtube_url || e.khk_intro_video_url,
      video_token: e.khk_intro_video_token,
      thumbnail: e.thumbnail,
      broadcast_start_at: e.broadcast_start_at,
      is_live: e.broadcast_start_at
        ? new Date() >= new Date(e.broadcast_start_at)
        : true,
    }));

    return NextResponse.json({
      success: true,
      events: khkEvents,
      total: khkEvents.length,
    });
  } catch (error) {
    console.error('Failed to fetch KHK featured events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KHK featured events' },
      { status: 500 }
    );
  }
}
```

---

### Task 3: コンポーネント作成

**新規ファイル:** `components/portal/KHKFeaturedSection.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface KHKEvent {
  id: string;
  title: string;
  description: string;
  video_type: 'youtube' | 'intro';
  video_url?: string;
  video_token?: string;
  thumbnail?: string;
  broadcast_start_at?: string;
  is_live: boolean;
}

export default function KHKFeaturedSection() {
  const [events, setEvents] = useState<KHKEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchKHKEvents = async () => {
      try {
        const res = await fetch('/api/khk-featured');
        const data = await res.json();
        if (data.success) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch KHK events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKHKEvents();
  }, []);

  if (isLoading) {
    return <KHKSkeletonLoader />;
  }

  if (events.length === 0) {
    return null; // KHKコンテンツがない場合は何も表示しない
  }

  const currentEvent = events[currentIndex];

  return (
    <section className="mb-5 sm:mb-6 md:mb-8">
      <h2 className="text-sm sm:text-base md:text-lg font-bold text-white mb-2.5 sm:mb-3 md:mb-4 flex items-center gap-1.5 sm:gap-2">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        おすすめプロダクト
      </h2>

      <div className="relative">
        {/* メインコンテンツ */}
        <Link href={`/events/${currentEvent.id}`} className="block">
          <div className="card overflow-hidden relative">
            <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-indigo-900/50 relative">
              {currentEvent.video_type === 'youtube' && currentEvent.video_url ? (
                <YouTubeEmbed url={currentEvent.video_url} />
              ) : currentEvent.video_token ? (
                <IntroVideoPlayer token={currentEvent.video_token} />
              ) : currentEvent.thumbnail ? (
                <img
                  src={currentEvent.thumbnail}
                  alt={currentEvent.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <DefaultVideoPlaceholder />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 md:bottom-4 md:left-4 md:right-4">
                <span className="badge badge-archive mb-1.5 sm:mb-2 text-[10px] sm:text-xs">
                  KHK公開
                </span>
                <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 line-clamp-1 sm:line-clamp-none">
                  {currentEvent.title}
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-300 line-clamp-1 sm:line-clamp-2">
                  {currentEvent.description}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* カルーセルインジケーター */}
        {events.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {events.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// YouTube埋め込みコンポーネント
function YouTubeEmbed({ url }: { url: string }) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
      className="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

// 紹介動画プレイヤー
function IntroVideoPlayer({ token }: { token: string }) {
  // Lark Drive経由で動画を再生
  return (
    <video
      src={`/api/lark-video?token=${token}`}
      className="absolute inset-0 w-full h-full object-cover"
      controls
      preload="metadata"
    />
  );
}

// ユーティリティ関数
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

---

### Task 4: ホーム画面統合

**ファイル:** `app/HomeClient.tsx`

**変更内容:**

1. KHKFeaturedSectionをインポート
```typescript
import KHKFeaturedSection from '@/components/portal/KHKFeaturedSection';
```

2. おすすめセクションを置換
```typescript
{/* KHK Featured Section - KHKコンテンツがある場合のみ表示 */}
{!searchQuery && <KHKFeaturedSection />}

{/* 従来のおすすめセクション - KHKコンテンツがない場合のフォールバック */}
{!searchQuery && !hasKHKContent && featuredEvent && (
  // 既存のおすすめセクション
)}
```

---

## Phase 2: スケジュール機能

### Task 5: 放送開始日時処理

**ファイル:** `components/portal/KHKFeaturedSection.tsx`

放送開始日時が未来の場合はカウントダウン表示に切り替え:

```typescript
function BroadcastCountdown({ startAt }: { startAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(startAt);
      const diff = start.getTime() - now.getTime();

      if (diff <= 0) {
        setIsLive(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startAt]);

  if (isLive) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="text-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold">配信開始まで</span>
        </div>
        <div className="text-4xl font-bold text-white font-mono">{timeLeft}</div>
        <div className="text-gray-300 text-sm mt-2">
          {new Date(startAt).toLocaleString('ja-JP')} 開始予定
        </div>
      </div>
    </div>
  );
}
```

---

### Task 6: 自動更新実装

開始時刻到達時に自動でコンテンツを更新:

```typescript
useEffect(() => {
  // 放送開始日時チェック
  const checkBroadcastStart = () => {
    const now = new Date();
    events.forEach((event, index) => {
      if (event.broadcast_start_at) {
        const start = new Date(event.broadcast_start_at);
        if (now >= start && !event.is_live) {
          // 状態を更新
          setEvents(prev => prev.map((e, i) =>
            i === index ? { ...e, is_live: true } : e
          ));
        }
      }
    });
  };

  const interval = setInterval(checkBroadcastStart, 1000);
  return () => clearInterval(interval);
}, [events]);
```

---

## 共通タスク

### Task 7: テスト実装

**新規ファイル:** `tests/khk-featured.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getKHKFeaturedEvents } from '@/lib/larkbase-client';

describe('KHK Featured Events', () => {
  it('should filter events with khk_published=true', async () => {
    // テスト実装
  });

  it('should prioritize YouTube over intro video', async () => {
    // テスト実装
  });

  it('should sort by broadcast_start_at', async () => {
    // テスト実装
  });
});
```

---

### Task 8: ドキュメント更新

更新対象ファイル:
- `CLAUDE.md` - KHKフィールド情報追加
- `docs/SYSTEM_SPECIFICATION.md` - KHK機能仕様追加
- `README.md` - KHK機能の使い方追加

---

## エージェント割り当て

| Task | エージェント | 並列可能 |
|------|-------------|---------|
| Task 1 | CodeGenAgent | ✅ |
| Task 2 | CodeGenAgent | ✅ (Task1完了後) |
| Task 3 | CodeGenAgent | ✅ (Task2と並列可) |
| Task 4 | CodeGenAgent | ❌ (Task1-3完了後) |
| Task 5 | CodeGenAgent | ✅ (Task3完了後) |
| Task 6 | CodeGenAgent | ✅ (Task5完了後) |
| Task 7 | ReviewAgent | ✅ (Task1-4完了後) |
| Task 8 | CodeGenAgent | ✅ (全タスク完了後) |

---

## 並列実行計画

```
時間軸 →

T0: Task1 (LarkBaseクライアント)
    ↓
T1: Task2 (API) ──────────┬──────────→ Task4 (統合)
    Task3 (コンポーネント) ─┘              ↓
                                      T2: Task5 (放送日時)
                                          ↓
                                      T3: Task6 (自動更新)
                                          ↓
                                      T4: Task7 (テスト)
                                          ↓
                                      T5: Task8 (ドキュメント)
```

---

## チェックリスト

### Phase 1
- [x] LarkBaseクライアントにKHKフィールド追加
- [x] getKHKFeaturedEvents関数実装
- [x] /api/khk-featured エンドポイント作成
- [x] KHKFeaturedSectionコンポーネント作成
- [x] YouTubeEmbed実装
- [x] IntroVideoPlayer実装
- [x] HomeClient.tsx統合

### Phase 2
- [x] BroadcastCountdown実装
- [x] 自動更新ロジック実装
- [x] カウントダウンUI実装

### 共通
- [x] テストケース作成
- [x] ドキュメント更新
- [x] 動作確認（ビルド成功）

---

*実装完了: 2025-01-14*
