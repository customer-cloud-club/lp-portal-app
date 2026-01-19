# Lark Drive動画配信 PoC実装ガイド

## 概要

Lark Drive（15TB）を活用した動画配信システムのPoC実装

## システムアーキテクチャ

```
YouTube Live終了
    ↓
Lark Drive（15TB）保存
    ↓
Next.js API（中間層）
    ├─ Lark API: 一時URL取得
    ├─ Discord OAuth: 認証確認
    └─ LarkBase: メタデータ管理
    ↓
PortalApp（フロントエンド）
    └─ Video.js: ストリーミング再生
```

---

## Step 1: Lark SDK インストール

```bash
npm install @larksuiteoapi/node-sdk
npm install video.js
```

---

## Step 2: Lark認証設定

### 環境変数（.env.local）

```bash
# Lark App認証情報
LARK_APP_ID=cli_xxxxxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxx

# Lark Tenant情報
LARK_TENANT_ACCESS_TOKEN=t-xxxxxxxxxxxxx

# Discord OAuth
DISCORD_CLIENT_ID=xxxxxxxxxxxxx
DISCORD_CLIENT_SECRET=xxxxxxxxxxxxx
DISCORD_GUILD_ID=xxxxxxxxxxxxx
```

### Lark App作成手順

1. https://open.larksuite.com/app にアクセス
2. 新しいアプリを作成
3. 権限スコープを設定:
   - `drive:drive.readonly` - ファイル読み取り
   - `drive:drive.file.download` - ファイルダウンロード
   - `bitable:bitable.readonly` - LarkBase読み取り

---

## Step 3: Lark API実装

### lib/lark.ts

```typescript
import * as lark from '@larksuiteoapi/node-sdk';

// Larkクライアント初期化
const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Lark,
});

/**
 * ファイルトークンから一時ダウンロードURLを取得（24時間有効）
 */
export async function getTemporaryDownloadUrl(fileToken: string): Promise<string> {
  try {
    const res = await client.drive.media.batchGetTmpDownloadUrl({
      data: {
        file_tokens: [fileToken],
        extra: {
          // ストリーミング用のRange指定
          range: 'bytes=0-',
        },
      },
    });

    if (res.code !== 0) {
      throw new Error(`Lark API Error: ${res.msg}`);
    }

    return res.data.tmp_download_urls[0].tmp_download_url;
  } catch (error) {
    console.error('Failed to get temporary download URL:', error);
    throw error;
  }
}

/**
 * Lark Driveにファイルをアップロード
 */
export async function uploadVideoToLarkDrive(
  filePath: string,
  folderToken: string
): Promise<string> {
  const fs = require('fs');
  const fileStream = fs.createReadStream(filePath);

  const res = await client.drive.file.uploadAll({
    data: {
      file_name: path.basename(filePath),
      parent_type: 'explorer',
      parent_node: folderToken,
      size: fs.statSync(filePath).size,
      file: fileStream,
    },
  });

  if (res.code !== 0) {
    throw new Error(`Upload failed: ${res.msg}`);
  }

  return res.data.file_token;
}

/**
 * LarkBaseからイベント情報を取得
 */
export async function getEventFromLarkBase(eventId: string) {
  const res = await client.bitable.appTableRecord.get({
    path: {
      app_token: process.env.LARKBASE_APP_TOKEN!,
      table_id: process.env.LARKBASE_TABLE_ID!,
      record_id: eventId,
    },
  });

  if (res.code !== 0) {
    throw new Error(`Failed to get event: ${res.msg}`);
  }

  return res.data.record;
}

export default client;
```

---

## Step 4: Next.js API実装

### app/api/video/[eventId]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTemporaryDownloadUrl, getEventFromLarkBase } from '@/lib/lark';
import { checkDiscordRole } from '@/lib/discord';

/**
 * 動画ストリーミングURL取得API
 *
 * Discord認証 → ロール確認 → Lark一時URL発行
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // 1. Discord認証確認
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. LarkBaseからイベント情報取得
    const event = await getEventFromLarkBase(params.eventId);
    const fileToken = event.fields['archive_file_token'];

    if (!fileToken) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // 3. Discordロール確認（会員のみ再生可能）
    const hasAccess = await checkDiscordRole(
      session.user.id,
      process.env.DISCORD_GUILD_ID!
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: 'SkillFreak会員のみ視聴可能です',
          joinUrl: 'https://skillfreak.ivygain.jp/join'
        },
        { status: 403 }
      );
    }

    // 4. Lark一時URL取得（24時間有効）
    const videoUrl = await getTemporaryDownloadUrl(fileToken);

    return NextResponse.json({
      url: videoUrl,
      expiresIn: 86400, // 24時間
      eventTitle: event.fields['title'],
    });

  } catch (error) {
    console.error('Video API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Discord認証実装

### lib/discord.ts

```typescript
/**
 * DiscordユーザーがSkillFreakサーバーのメンバーか確認
 */
export async function checkDiscordRole(
  userId: string,
  guildId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      return false; // メンバーでない
    }

    const member = await res.json();

    // 特定のロールIDを確認（例: "SkillFreak会員"ロール）
    const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID!;
    return member.roles.includes(memberRoleId);

  } catch (error) {
    console.error('Discord API error:', error);
    return false;
  }
}
```

---

## Step 6: フロントエンド実装

### components/VideoPlayer.tsx

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  eventId: string;
}

export default function VideoPlayer({ eventId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 動画URL取得
    const fetchVideoUrl = async () => {
      try {
        const res = await fetch(`/api/video/${eventId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'アクセスが拒否されました');
          return;
        }

        // Video.js初期化
        if (videoRef.current && !playerRef.current) {
          playerRef.current = videojs(videoRef.current, {
            controls: true,
            fluid: true,
            preload: 'auto',
            sources: [{
              src: data.url,
              type: 'video/mp4',
            }],
            // ダウンロード防止設定
            controlBar: {
              pictureInPictureToggle: false,
            },
          });

          // 右クリック無効化
          videoRef.current.addEventListener('contextmenu', (e) => {
            e.preventDefault();
          });
        }

        setLoading(false);

      } catch (err) {
        setError('動画の読み込みに失敗しました');
        setLoading(false);
      }
    };

    fetchVideoUrl();

    // クリーンアップ
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [eventId]);

  if (loading) {
    return <div className="text-center">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 p-4 rounded">
        <p className="text-red-700">{error}</p>
        <a href="/join" className="text-blue-600 underline">
          SkillFreakに入会する
        </a>
      </div>
    );
  }

  return (
    <div data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered"
      />
    </div>
  );
}
```

---

## Step 7: テスト手順

### 7.1 テスト用動画準備

```bash
# YouTubeから短い動画をダウンロード（テスト用）
yt-dlp -f "best[height<=720]" -o "test-video.mp4" \
  "https://www.youtube.com/watch?v=TEST_VIDEO_ID"
```

### 7.2 Lark Driveにアップロード

Lark Webアプリで手動アップロード、またはCLI:

```bash
# Node.jsスクリプトでアップロード
node scripts/upload-to-lark.js test-video.mp4
```

### 7.3 パフォーマンス測定

```typescript
// ブラウザコンソールで実行
performance.mark('video-start');
video.addEventListener('loadeddata', () => {
  performance.mark('video-loaded');
  performance.measure('video-load-time', 'video-start', 'video-loaded');
  console.log(performance.getEntriesByName('video-load-time')[0].duration);
});
```

---

## 評価基準

### ✅ 成功条件

1. **再生開始時間**: 3秒以内
2. **バッファリング**: 最小限（1080pで安定）
3. **ダウンロード抑止**: 一時URL（24h）で一定の抑止
4. **コスト**: $0（Larkプラン内）

### ❌ 失敗条件（B2移行を検討）

1. 再生開始に5秒以上かかる
2. 頻繁なバッファリング
3. 同時視聴10人で問題発生

---

## 次のステップ

PoCで問題なければ：

1. **LarkBase統合**: イベント情報と動画を紐付け
2. **自動化**: YouTube Live終了 → 自動アップロード
3. **監視**: ストレージ使用量、再生パフォーマンス

PoCで問題があれば：

1. **ハイブリッド**: Lark（マスター） + B2（配信）
2. **BytePlus検討**: 大規模化を見据えた検討

---

## 参考リンク

- [Lark Open API](https://open.larksuite.com/document)
- [Drive API](https://open.larksuite.com/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/files/guide/introduction)
- [Video.js Documentation](https://videojs.com/guides/)
