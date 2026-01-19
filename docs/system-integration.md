# SkillFreak Streaming System - 統合設計

## システム全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                   LarkBase イベント管理DB                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ イベントテーブル                                        │  │
│  │ ├─ イベントID                                          │  │
│  │ ├─ イベント名                                          │  │
│  │ ├─ 開催日時                                            │  │
│  │ ├─ YouTube Live URL                                   │  │
│  │ ├─ アーカイブFile Token (Lark Drive)                  │  │
│  │ ├─ アーカイブURL                                       │  │
│  │ ├─ 公開ステータス (draft/published/archived)          │  │
│  │ └─ 視聴権限 (public/members-only)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ API連携
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               SkillFreak Portal App (Next.js)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /events - イベント一覧ページ                           │  │
│  │   ├─ 開催予定イベント                                  │  │
│  │   ├─ 過去イベント（アーカイブあり）                     │  │
│  │   └─ 24時間ライブ配信                                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ /events/[id] - イベント詳細ページ                      │  │
│  │   ├─ イベント情報                                      │  │
│  │   ├─ アーカイブ動画プレイヤー                          │  │
│  │   └─ Discord認証（会員のみ視聴可能）                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ /live - 24時間ライブ配信ページ                         │  │
│  │   ├─ プレイリスト自動再生                              │  │
│  │   ├─ 現在再生中のイベント情報                          │  │
│  │   └─ 次の動画情報                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                Lark Drive (15TB) + 自動化                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ YouTube Live終了検知                                    │  │
│  │   ↓                                                     │  │
│  │ yt-dlp 自動ダウンロード                                 │  │
│  │   ↓                                                     │  │
│  │ Lark Drive保存 (/SkillFreak/Archives/)                │  │
│  │   ↓                                                     │  │
│  │ File Token取得                                          │  │
│  │   ↓                                                     │  │
│  │ LarkBaseに自動登録                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: イベント一覧表示（LarkBase連携）

### 実装内容

**app/events/page.tsx**
```typescript
// LarkBaseからイベント一覧を取得
// - 開催予定イベント
// - アーカイブありイベント
// - カード形式で表示
```

**app/api/events/route.ts**
```typescript
// LarkBase API経由でイベント取得
// フィルタリング: published, members-only
```

---

## Phase 2: イベント詳細ページ（動画再生）

### 実装内容

**app/events/[id]/page.tsx**
```typescript
// イベント詳細情報表示
// LarkVideoPlayer統合
// Discord認証チェック
```

**使用コンポーネント**
- `<LarkVideoPlayer fileToken={event.archiveFileToken} />`

---

## Phase 3: 24時間ライブ配信（プレイリスト再生）

### 機能仕様

**動作フロー**:
1. Lark Drive `/SkillFreak/Archives/` フォルダ内の全動画を取得
2. 公開日時順にソート
3. Video.js Playlistで連続再生
4. 最後の動画が終わったら最初に戻る（無限ループ）

**実装**:

**app/live/page.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function LivePage() {
  // プレイリスト管理
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // LarkBaseから全アーカイブ取得
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    const res = await fetch('/api/playlist');
    const data = await res.json();
    setPlaylist(data.videos);
  };

  return (
    <div>
      <h1>24時間ライブ配信</h1>
      {/* プレイリストプレイヤー */}
    </div>
  );
}
```

**app/api/playlist/route.ts**
```typescript
// LarkBaseから全アーカイブ取得
// Lark共有URLをリスト化
export async function GET() {
  const videos = await getAllArchives();
  return Response.json({ videos });
}
```

---

## Phase 4: 自動化（YouTube → Lark Drive）

### Webhook実装

**app/api/youtube/webhook/route.ts**
```typescript
// YouTube Live終了通知を受信
// yt-dlpでダウンロード
// Lark Driveにアップロード
// LarkBaseに登録
```

### Cron Job（代替案）

**cron/check-youtube-live.ts**
```bash
# 5分ごとにチェック
*/5 * * * * node cron/check-youtube-live.js
```

---

## データフロー

### イベント作成フロー

```
1. LarkBaseにイベント手動作成
   - イベント名、日時、YouTube URL

2. YouTube Live開催
   - 配信実施

3. YouTube Live終了（自動）
   ↓
4. Webhook/Cron検知（自動）
   ↓
5. yt-dlpダウンロード（自動）
   ↓
6. Lark Driveアップロード（自動）
   ↓
7. LarkBase更新（自動）
   - File Token保存
   - ステータス: published

8. Portal Appで自動表示
   - /events に表示
   - 24時間配信に追加
```

---

## LarkBase テーブル設計

### イベント管理テーブル

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| event_id | ID | 自動生成 |
| title | テキスト | イベント名 |
| description | 長文テキスト | 説明 |
| scheduled_at | 日時 | 開催日時 |
| youtube_url | URL | YouTube Live URL |
| archive_file_token | テキスト | Lark Drive File Token |
| archive_url | URL | 共有URL |
| status | 選択 | draft/published/archived |
| visibility | 選択 | public/members-only |
| published_at | 日時 | 公開日時 |
| created_at | 日時 | 作成日時 |

---

## 実装スケジュール

### Week 1: 基盤構築
- [x] Lark Drive動画埋め込み
- [x] LarkVideoPlayerコンポーネント
- [ ] LarkBase API統合

### Week 2: イベント表示
- [ ] /events 一覧ページ
- [ ] /events/[id] 詳細ページ
- [ ] Discord認証統合

### Week 3: 24時間配信
- [ ] /live プレイリストページ
- [ ] 自動再生機能
- [ ] プレイリストAPI

### Week 4: 自動化
- [ ] YouTube終了検知
- [ ] 自動ダウンロード
- [ ] 自動LarkBase登録

---

## コスト試算

| 項目 | 月額 | 備考 |
|------|------|------|
| Lark Pro Plan | 既存 | 15TB利用 |
| Vercel Hosting | $0 | Hobby Plan |
| LarkBase | $0 | Proプランに含む |
| Discord Bot | $0 | 無料 |
| **合計** | **$0** | 追加コストなし |

---

## セキュリティ

1. **Discord OAuth認証**
   - 会員のみ視聴可能
   - ロール確認

2. **Lark一時URL**
   - 24時間有効
   - ダウンロード抑止

3. **環境変数管理**
   - `.env.local`で機密情報管理
   - GitHub Secretsで本番環境管理

---

## 次のステップ

1. ✅ LarkVideoPlayerコンポーネント完成
2. ⏳ LarkBase API統合
3. ⏳ イベント一覧ページ実装
4. ⏳ 24時間ライブ配信実装
5. ⏳ 自動化スクリプト実装
