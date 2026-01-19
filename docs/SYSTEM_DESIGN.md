# SkillFreak 24時間アーカイブ配信システム 詳細設計書

**Version:** 1.0  
**作成日:** 2025年11月15日  
**対象:** SkillFreak-PortalApp統合版

---

## 目次

1. [システム概要](#1-システム概要)
2. [アーキテクチャ設計](#2-アーキテクチャ設計)
3. [コンポーネント詳細仕様](#3-コンポーネント詳細仕様)
4. [データベース設計](#4-データベース設計)
5. [API設計](#5-api設計)
6. [インフラ構成](#6-インフラ構成)
7. [セキュリティ設計](#7-セキュリティ設計)
8. [実装手順](#8-実装手順)
9. [デプロイ・運用](#9-デプロイ運用)
10. [コスト試算](#10-コスト試算)

---

## 1. システム概要

### 1.1 目的

YouTubeライブのアーカイブを24時間連続で自動配信し、SkillFreak会員専用のストリーミングチャンネルを提供する。

### 1.2 主要機能

| 機能 | 説明 |
|------|------|
| 自動アーカイブ収集 | YouTubeライブ終了後、自動でダウンロード・保存 |
| 24時間連続配信 | アーカイブをループ再生で配信 |
| 会員認証 | ログインユーザーのみ視聴可能 |
| PWA統合 | 既存PortalAppに配信画面を統合 |
| 管理画面 | プレイリスト管理、配信状態監視 |

### 1.3 技術スタック

```yaml
Frontend:
  - Next.js 14+ (App Router)
  - TypeScript
  - Tailwind CSS
  - HLS.js / Video.js

Backend:
  - Vercel Functions (Webhook受信)
  - Hetzner VPS (配信サーバー)
  - FFmpeg (動画処理)

Storage:
  - Backblaze B2 (アーカイブ保管)
  
Database:
  - Supabase (PostgreSQL)
  
Automation:
  - Lark Automation (トリガー)
  - GitHub Actions (補助タスク)

Auth:
  - Supabase Auth / Clerk
```

---

## 2. アーキテクチャ設計

### 2.1 システム全体図

```
┌─────────────────────────────────────────────────────────────────┐
│                        SkillFreak Ecosystem                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   YouTube    │      │     Lark     │      │  PortalApp   │
│     Live     │──┐   │  Automation  │──┐   │   (PWA)      │
└──────────────┘  │   └──────────────┘  │   └──────────────┘
                  │                     │            │
                  ▼                     ▼            │
         ┌─────────────────┐   ┌──────────────┐    │
         │  YouTube API    │   │   Webhook    │    │
         │   (終了検知)     │   │  (Trigger)   │    │
         └─────────────────┘   └──────────────┘    │
                  │                     │            │
                  └──────────┬──────────┘            │
                             ▼                       │
                  ┌─────────────────────┐            │
                  │  Vercel Functions   │            │
                  │  (Download Service) │            │
                  └─────────────────────┘            │
                             │                       │
                             ▼                       │
                  ┌─────────────────────┐            │
                  │   Backblaze B2      │            │
                  │  (Archive Storage)  │            │
                  └─────────────────────┘            │
                             │                       │
                             ▼                       │
                  ┌─────────────────────┐            │
                  │   Hetzner VPS       │            │
                  │  (Streaming Server) │            │
                  │  ┌───────────────┐  │            │
                  │  │    FFmpeg     │  │            │
                  │  │  HLS Encoder  │  │            │
                  │  └───────────────┘  │            │
                  │  ┌───────────────┐  │            │
                  │  │     Nginx     │  │            │
                  │  │   (HTTP/HLS)  │  │            │
                  │  └───────────────┘  │            │
                  └─────────────────────┘            │
                             │                       │
                             ▼                       │
                  ┌─────────────────────┐            │
                  │   HLS Stream CDN    │◄───────────┘
                  │  (playlist.m3u8)    │
                  └─────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   User's Browser    │
                  │   (HLS.js Player)   │
                  └─────────────────────┘
```

### 2.2 データフロー

```
[YouTubeライブ終了] 
    ↓
[Lark: 終了時刻+1時間後にWebhook送信]
    ↓
[Vercel Function: Webhook受信]
    ↓
[yt-dlp: 動画ダウンロード (一時保存)]
    ↓
[Backblaze B2: アップロード]
    ↓
[Supabase: メタデータ記録]
    ↓
[VPS: プレイリスト更新通知]
    ↓
[FFmpeg: 新規動画をプレイリストに追加]
    ↓
[24時間配信継続]
```

---

## 3. コンポーネント詳細仕様

### 3.1 自動ダウンロードサービス (Vercel Functions)

#### 3.1.1 ファイル構成

```
/api
  /youtube-archive
    route.ts          # Webhook受信エンドポイント
  /playlist-update
    route.ts          # プレイリスト更新API
  /stream-status
    route.ts          # 配信ステータス取得
```

#### 3.1.2 Webhook受信エンドポイント

**Endpoint:** `POST /api/youtube-archive`

**Request Body:**
```typescript
interface ArchiveWebhookPayload {
  youtube_url: string;        // YouTube動画URL
  video_id: string;          // YouTube Video ID
  title: string;             // 動画タイトル
  speaker: string;           // 講師名
  event_date: string;        // 開催日 (ISO8601)
  lark_record_id: string;    // Lark Record ID
  signature: string;         // HMAC署名（検証用）
}
```

**Response:**
```typescript
interface ArchiveResponse {
  success: boolean;
  job_id: string;           // 処理ジョブID
  message: string;
  estimated_time: number;   // 推定完了時間（秒）
}
```

**実装例:**

```typescript
// /api/youtube-archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { spawn } from 'child_process';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: 'us-west-004',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

// HMAC署名検証
function verifySignature(payload: any, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!);
  const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const signature = req.headers.get('x-lark-signature') || '';

    // 署名検証
    if (!verifySignature(payload, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const { youtube_url, video_id, title, speaker, event_date, lark_record_id } = payload;

    // ジョブID生成
    const job_id = `job_${Date.now()}_${video_id}`;

    // Supabaseにジョブ登録
    const { error: jobError } = await supabase.from('download_jobs').insert({
      job_id,
      youtube_url,
      video_id,
      title,
      speaker,
      event_date,
      lark_record_id,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (jobError) throw jobError;

    // 非同期でダウンロード開始（バックグラウンド処理）
    processDownload(job_id, youtube_url, video_id, title, speaker).catch(console.error);

    return NextResponse.json({
      success: true,
      job_id,
      message: 'Download job started',
      estimated_time: 300, // 5分
    });

  } catch (error) {
    console.error('Archive webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processDownload(
  job_id: string,
  youtube_url: string,
  video_id: string,
  title: string,
  speaker: string
) {
  try {
    // ステータス更新: downloading
    await supabase.from('download_jobs').update({
      status: 'downloading',
      updated_at: new Date().toISOString(),
    }).eq('job_id', job_id);

    // yt-dlpでダウンロード
    const outputPath = `/tmp/${video_id}.mp4`;
    
    await new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--cookies', '/tmp/cookies.txt',
        '--format', 'bestvideo[height<=1080]+bestaudio/best',
        '-o', outputPath,
        youtube_url
      ]);

      ytdlp.on('close', (code) => {
        if (code === 0) resolve(null);
        else reject(new Error(`yt-dlp exited with code ${code}`));
      });
    });

    // ステータス更新: uploading
    await supabase.from('download_jobs').update({
      status: 'uploading',
      updated_at: new Date().toISOString(),
    }).eq('job_id', job_id);

    // Backblaze B2にアップロード
    const fs = require('fs');
    const fileStream = fs.createReadStream(outputPath);
    const stats = fs.statSync(outputPath);

    await s3Client.send(new PutObjectCommand({
      Bucket: 'skillfreak-archives',
      Key: `videos/${video_id}.mp4`,
      Body: fileStream,
      ContentType: 'video/mp4',
      ContentLength: stats.size,
    }));

    // メタデータをSupabaseに保存
    const { error: metadataError } = await supabase.from('archives').insert({
      video_id,
      title,
      speaker,
      event_date: new Date(event_date).toISOString(),
      file_path: `videos/${video_id}.mp4`,
      file_size: stats.size,
      duration: await getVideoDuration(outputPath), // FFprobeで取得
      status: 'ready',
      created_at: new Date().toISOString(),
    });

    if (metadataError) throw metadataError;

    // ステータス更新: completed
    await supabase.from('download_jobs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('job_id', job_id);

    // VPSにプレイリスト更新通知
    await fetch(process.env.VPS_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_playlist',
        video_id,
        file_path: `videos/${video_id}.mp4`,
      }),
    });

    // 一時ファイル削除
    fs.unlinkSync(outputPath);

  } catch (error) {
    console.error('Download process error:', error);
    await supabase.from('download_jobs').update({
      status: 'failed',
      error_message: error.message,
      updated_at: new Date().toISOString(),
    }).eq('job_id', job_id);
  }
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => output += data);
    ffprobe.on('close', () => resolve(parseFloat(output)));
  });
}
```

### 3.2 配信サーバー (Hetzner VPS)

#### 3.2.1 サーバー構成

**スペック:** Hetzner CPX11
- CPU: 2 vCPU
- RAM: 2GB
- Storage: 40GB SSD
- Bandwidth: 20TB/月
- OS: Ubuntu 24.04 LTS

#### 3.2.2 ディレクトリ構造

```
/opt/skillfreak-stream/
├── config/
│   ├── nginx.conf          # Nginx設定
│   └── stream.conf         # 配信設定
├── scripts/
│   ├── stream-manager.sh   # 配信管理スクリプト
│   ├── playlist-updater.sh # プレイリスト更新
│   └── monitor.sh          # 監視スクリプト
├── playlists/
│   ├── current.txt         # 現在のプレイリスト
│   └── archive/            # 過去のプレイリスト
├── stream/
│   ├── playlist.m3u8       # HLSプレイリスト
│   └── segments/           # TSセグメント
└── logs/
    ├── ffmpeg.log
    ├── nginx.log
    └── stream.log
```

#### 3.2.3 配信スクリプト

**ファイル:** `/opt/skillfreak-stream/scripts/stream-manager.sh`

```bash
#!/bin/bash

# 設定
B2_BUCKET="skillfreak-archives"
B2_PREFIX="videos/"
STREAM_DIR="/opt/skillfreak-stream/stream"
PLAYLIST_FILE="/opt/skillfreak-stream/playlists/current.txt"
LOG_FILE="/opt/skillfreak-stream/logs/stream.log"

# Backblaze B2から動画リスト取得
update_playlist() {
    echo "[$(date)] Updating playlist..." >> $LOG_FILE
    
    # rcloneでB2から動画一覧取得
    rclone lsf b2:${B2_BUCKET}/${B2_PREFIX} | sort -R > $PLAYLIST_FILE
    
    # FFmpeg用にフルパス変換
    while IFS= read -r video; do
        echo "https://f004.backblazeb2.com/file/${B2_BUCKET}/${B2_PREFIX}${video}"
    done < $PLAYLIST_FILE > ${PLAYLIST_FILE}.urls
    
    echo "[$(date)] Playlist updated: $(wc -l < $PLAYLIST_FILE) videos" >> $LOG_FILE
}

# 24時間配信開始
start_streaming() {
    echo "[$(date)] Starting 24/7 stream..." >> $LOG_FILE
    
    while true; do
        # プレイリストを読み込んで配信
        while IFS= read -r video_url; do
            echo "[$(date)] Now streaming: $video_url" >> $LOG_FILE
            
            ffmpeg \
                -re \
                -i "$video_url" \
                -c:v libx264 \
                -preset veryfast \
                -b:v 2500k \
                -maxrate 3000k \
                -bufsize 6000k \
                -g 60 \
                -keyint_min 60 \
                -sc_threshold 0 \
                -c:a aac \
                -b:a 128k \
                -ar 48000 \
                -f hls \
                -hls_time 6 \
                -hls_list_size 10 \
                -hls_flags delete_segments+append_list \
                -hls_segment_filename "${STREAM_DIR}/segments/segment_%d.ts" \
                "${STREAM_DIR}/playlist.m3u8" \
                >> $LOG_FILE 2>&1
            
            # エラー時は次の動画へ
            if [ $? -ne 0 ]; then
                echo "[$(date)] Error streaming $video_url, skipping..." >> $LOG_FILE
                sleep 2
            fi
        done < ${PLAYLIST_FILE}.urls
        
        # プレイリストの最後まで到達したらループ
        echo "[$(date)] Playlist completed, restarting..." >> $LOG_FILE
    done
}

# プレイリスト定期更新（1時間ごと）
schedule_playlist_update() {
    while true; do
        sleep 3600
        update_playlist
        # 配信中のFFmpegプロセスに新しいプレイリストを通知
        # (実装は配信の再起動ではなく、動的プレイリスト更新が理想)
    done
}

# メイン処理
case "$1" in
    start)
        update_playlist
        start_streaming &
        schedule_playlist_update &
        ;;
    stop)
        pkill -f ffmpeg
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    update-playlist)
        update_playlist
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|update-playlist}"
        exit 1
        ;;
esac
```

#### 3.2.4 Nginx設定

**ファイル:** `/etc/nginx/sites-available/skillfreak-stream`

```nginx
server {
    listen 80;
    server_name stream.skillfreak.com;

    # HLSストリーミング配信
    location /live/ {
        alias /opt/skillfreak-stream/stream/;
        
        # CORS設定
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range';
        
        # HLS設定
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        
        # キャッシュ制御
        add_header Cache-Control 'no-cache';
        
        # セキュリティ（トークン認証）
        # auth_request /auth/verify;
    }

    # ステータスAPI
    location /api/status {
        proxy_pass http://localhost:3001/status;
        proxy_set_header Host $host;
    }

    # Let's Encrypt証明書用
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# HTTPS設定（Let's Encryptで証明書取得後）
server {
    listen 443 ssl http2;
    server_name stream.skillfreak.com;

    ssl_certificate /etc/letsencrypt/live/stream.skillfreak.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stream.skillfreak.com/privkey.pem;

    # 上記location設定と同じ
    location /live/ {
        # ... (同上)
    }
}
```

### 3.3 PortalApp統合（フロントエンド）

#### 3.3.1 コンポーネント構成

```
/components
  /stream
    LivePlayer.tsx           # メインプレイヤー
    StreamControls.tsx       # 再生コントロール
    NowPlaying.tsx          # 現在再生中情報
    UpcomingVideos.tsx      # 次の動画リスト
    StreamStats.tsx         # 視聴統計
  /admin
    StreamDashboard.tsx     # 管理画面
    PlaylistManager.tsx     # プレイリスト管理
```

#### 3.3.2 LivePlayerコンポーネント

**ファイル:** `/components/stream/LivePlayer.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NowPlaying {
  video_id: string;
  title: string;
  speaker: string;
  thumbnail_url?: string;
  duration: number;
}

export default function LivePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = `${process.env.NEXT_PUBLIC_STREAM_URL}/live/playlist.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, destroying HLS instance');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = streamUrl;
    }
  }, []);

  useEffect(() => {
    // 現在再生中の動画情報を取得
    const fetchNowPlaying = async () => {
      const { data, error } = await fetch('/api/stream/now-playing').then(r => r.json());
      if (data) setNowPlaying(data);
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000); // 30秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Supabase Realtimeで視聴者数をリアルタイム取得
    const channel = supabase.channel('stream-viewers')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* 動画プレイヤー */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          playsInline
        />
        
        {/* ライブバッジ */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE 24/7
        </div>

        {/* 視聴者数 */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <span>👥</span>
          <span>{viewerCount} 視聴中</span>
        </div>
      </div>

      {/* 現在再生中情報 */}
      {nowPlaying && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            {nowPlaying.thumbnail_url && (
              <img
                src={nowPlaying.thumbnail_url}
                alt={nowPlaying.title}
                className="w-32 h-24 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {nowPlaying.title}
              </h3>
              <p className="text-gray-600 mt-1">
                講師: {nowPlaying.speaker}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. データベース設計

### 4.1 Supabase テーブル定義

#### 4.1.1 archives テーブル

```sql
CREATE TABLE archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(100),
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    duration INTEGER, -- 秒
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ready', -- ready, processing, error
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_archives_status ON archives(status);
CREATE INDEX idx_archives_event_date ON archives(event_date DESC);
CREATE INDEX idx_archives_created_at ON archives(created_at DESC);
```

#### 4.1.2 download_jobs テーブル

```sql
CREATE TABLE download_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) UNIQUE NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    video_id VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    speaker VARCHAR(100),
    event_date TIMESTAMP WITH TIME ZONE,
    lark_record_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- pending, downloading, uploading, completed, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_download_jobs_status ON download_jobs(status);
CREATE INDEX idx_download_jobs_created_at ON download_jobs(created_at DESC);
```

#### 4.1.3 playlists テーブル

```sql
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    video_order JSONB, -- [{"video_id": "xxx", "position": 1}, ...]
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.4 stream_stats テーブル

```sql
CREATE TABLE stream_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewer_count INTEGER DEFAULT 0,
    current_video_id VARCHAR(50),
    bandwidth_used BIGINT, -- bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パーティショニング（日次）
CREATE INDEX idx_stream_stats_timestamp ON stream_stats(timestamp DESC);
```

#### 4.1.5 viewer_sessions テーブル

```sql
CREATE TABLE viewer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 秒
    videos_watched JSONB, -- [{"video_id": "xxx", "watched_duration": 120}, ...]
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 Row Level Security (RLS) ポリシー

```sql
-- archives: 認証済みユーザーのみ読み取り可
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view archives"
ON archives FOR SELECT
TO authenticated
USING (true);

-- download_jobs: 管理者のみアクセス可
ALTER TABLE download_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view download jobs"
ON download_jobs FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
);
```

---

## 5. API設計

### 5.1 REST API エンドポイント

#### 5.1.1 アーカイブ関連

```typescript
// GET /api/archives
// アーカイブ一覧取得
interface ArchivesQuery {
  page?: number;
  limit?: number;
  sort?: 'date' | 'title' | 'views';
  order?: 'asc' | 'desc';
}

// GET /api/archives/:video_id
// 特定アーカイブ詳細取得

// POST /api/archives/:video_id/view
// 視聴カウント増加
```

#### 5.1.2 ストリーム関連

```typescript
// GET /api/stream/now-playing
// 現在再生中の動画情報
interface NowPlayingResponse {
  video_id: string;
  title: string;
  speaker: string;
  thumbnail_url?: string;
  duration: number;
  elapsed_time: number; // 再生経過時間
}

// GET /api/stream/upcoming
// 次に再生される動画リスト（最大10件）

// GET /api/stream/status
// 配信ステータス
interface StreamStatus {
  is_live: boolean;
  viewer_count: number;
  uptime: number; // 秒
  bandwidth_used: number; // bytes
}

// POST /api/stream/playlist/update (Admin only)
// プレイリスト更新トリガー
```

#### 5.1.3 統計関連

```typescript
// GET /api/stats/viewers
// 視聴者数の推移（時系列データ）
interface ViewerStatsQuery {
  start_date: string; // ISO8601
  end_date: string;
  interval: 'hour' | 'day' | 'week';
}

// GET /api/stats/popular
// 人気動画ランキング
```

### 5.2 WebSocket / Realtime

Supabase Realtimeを使用

```typescript
// チャンネル: stream-viewers
// イベント: presence (視聴者参加/退出)

// チャンネル: now-playing
// イベント: video-changed (動画切り替え)
```

---

## 6. インフラ構成

### 6.1 環境構成図

```
┌─────────────────────────────────────────────────┐
│              Production Environment              │
└─────────────────────────────────────────────────┘

┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Vercel    │   │   Supabase  │   │  Backblaze  │
│   (Global)  │   │  (US-West)  │   │  B2 Storage │
│             │   │             │   │  (US-West)  │
│ - Functions │   │ - PostgreSQL│   │             │
│ - Portal    │   │ - Auth      │   │ - 1TB Video │
│   App       │   │ - Realtime  │   │   Storage   │
└─────────────┘   └─────────────┘   └─────────────┘
                                           │
                                           │ rclone
                                           ▼
                                   ┌─────────────┐
                                   │  Hetzner    │
                                   │  VPS CPX11  │
                                   │  (EU-Central)│
                                   │             │
                                   │ - FFmpeg    │
                                   │ - Nginx     │
                                   │ - HLS Stream│
                                   └─────────────┘
                                           │
                                           │ HTTPS
                                           ▼
                                   ┌─────────────┐
                                   │   Users     │
                                   │  (Global)   │
                                   └─────────────┘
```

### 6.2 VPSセットアップ手順

#### 6.2.1 初期セットアップ

```bash
# 1. SSH接続
ssh root@YOUR_VPS_IP

# 2. システムアップデート
apt update && apt upgrade -y

# 3. 必要なパッケージインストール
apt install -y \
    nginx \
    ffmpeg \
    python3-pip \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw

# 4. rcloneインストール（Backblaze B2用）
curl https://rclone.org/install.sh | bash

# 5. rclone設定
rclone config
# B2の認証情報を設定

# 6. ファイアウォール設定
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 7. ユーザー作成
useradd -m -s /bin/bash streamuser
usermod -aG sudo streamuser

# 8. ディレクトリ作成
mkdir -p /opt/skillfreak-stream/{config,scripts,playlists,stream,logs}
chown -R streamuser:streamuser /opt/skillfreak-stream
```

#### 6.2.2 SSL証明書取得

```bash
# Let's Encryptでhttps化
certbot --nginx -d stream.skillfreak.com
```

#### 6.2.3 systemdサービス登録

```bash
# /etc/systemd/system/skillfreak-stream.service
cat > /etc/systemd/system/skillfreak-stream.service << 'EOF'
[Unit]
Description=SkillFreak 24/7 Streaming Service
After=network.target

[Service]
Type=simple
User=streamuser
WorkingDirectory=/opt/skillfreak-stream
ExecStart=/opt/skillfreak-stream/scripts/stream-manager.sh start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# サービス有効化
systemctl daemon-reload
systemctl enable skillfreak-stream
systemctl start skillfreak-stream
```

### 6.3 監視・アラート

#### 6.3.1 監視スクリプト

```bash
# /opt/skillfreak-stream/scripts/monitor.sh
#!/bin/bash

CHECK_INTERVAL=60  # 秒

while true; do
    # FFmpegプロセスチェック
    if ! pgrep -f "ffmpeg.*playlist.m3u8" > /dev/null; then
        echo "[$(date)] ERROR: FFmpeg process not found!" >> /opt/skillfreak-stream/logs/monitor.log
        # 通知（後述）
        systemctl restart skillfreak-stream
    fi
    
    # ストリーム出力チェック
    if [ ! -f /opt/skillfreak-stream/stream/playlist.m3u8 ]; then
        echo "[$(date)] ERROR: Stream playlist not found!" >> /opt/skillfreak-stream/logs/monitor.log
    fi
    
    # ディスク使用率チェック
    DISK_USAGE=$(df -h /opt/skillfreak-stream | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        echo "[$(date)] WARNING: Disk usage is ${DISK_USAGE}%" >> /opt/skillfreak-stream/logs/monitor.log
    fi
    
    sleep $CHECK_INTERVAL
done
```

#### 6.3.2 Lark通知設定

```typescript
// Vercel Function: /api/alert
async function sendLarkAlert(message: string) {
  await fetch(process.env.LARK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'text',
      content: {
        text: `🚨 SkillFreak Stream Alert\n${message}`
      }
    })
  });
}
```

---

## 7. セキュリティ設計

### 7.1 認証・認可

#### 7.1.1 Supabase Auth統合

```typescript
// middleware.ts (Next.js)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // セッション確認
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ストリーム視聴は認証必須
  if (req.nextUrl.pathname.startsWith('/stream') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/stream/:path*', '/admin/:path*'],
};
```

#### 7.1.2 署名付きURL（HLSストリーム）

```typescript
// /api/stream/token
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // ユーザー認証確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 期限付きトークン生成（2時間有効）
  const token = jwt.sign(
    {
      user_id: user.id,
      exp: Math.floor(Date.now() / 1000) + 7200,
    },
    process.env.JWT_SECRET!
  );

  return Response.json({ token });
}
```

**VPS側のNginxで検証:**

```nginx
# /etc/nginx/conf.d/auth.conf
location /live/ {
    # JWTトークン検証
    auth_request /auth/verify;
    
    # ... (以下、前述のlocation設定)
}

location = /auth/verify {
    internal;
    proxy_pass http://localhost:3001/verify-token;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
    proxy_set_header Authorization $http_authorization;
}
```

### 7.2 レート制限

```typescript
// /api/archives/[video_id]/view
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  standardHeaders: true,
  legacyHeaders: false,
});

// 適用例（Next.js API Routes）
export async function POST(req: Request) {
  // レート制限チェック
  // ... (実装)
}
```

### 7.3 DDoS対策

- Cloudflare無料プラン（Vercel経由で自動適用）
- VPS: fail2ban設定

```bash
# /etc/fail2ban/jail.local
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 60
bantime = 3600
```

---

## 8. 実装手順

### 8.1 Phase 1: インフラ準備（Week 1）

#### Day 1-2: クラウドサービス設定

```bash
# 1. Backblaze B2アカウント作成
# https://www.backblaze.com/b2/sign-up.html

# 2. バケット作成
# Bucket名: skillfreak-archives
# Region: US-West

# 3. Application Key作成
# Key Name: skillfreak-stream-key
# Permissions: Read and Write

# 4. Supabaseプロジェクト作成
# https://supabase.com/dashboard

# 5. テーブル作成（前述のSQL実行）
```

#### Day 3-4: VPSセットアップ

```bash
# 1. Hetzner Cloud登録
# https://console.hetzner.cloud/

# 2. CPX11プラン選択
# Location: Nuremberg (EU-Central)

# 3. SSH鍵設定

# 4. 初期セットアップ（前述のスクリプト実行）

# 5. ドメイン設定
# DNS A Record: stream.skillfreak.com -> VPS IP
```

#### Day 5-7: Vercel Functions開発

```bash
# 1. リポジトリクローン
git clone https://github.com/IvyGain/SkillFreak-PortalApp.git
cd SkillFreak-PortalApp

# 2. 必要なパッケージインストール
npm install @aws-sdk/client-s3 @supabase/supabase-js

# 3. 環境変数設定（.env.local）
cat > .env.local << EOF
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_KEY_ID=your_key_id
B2_APP_KEY=your_app_key
WEBHOOK_SECRET=your_webhook_secret
VPS_WEBHOOK_URL=https://stream.skillfreak.com/api/webhook
EOF

# 4. API実装（前述のコード）

# 5. Vercelにデプロイ
vercel deploy --prod
```

### 8.2 Phase 2: 自動化システム（Week 2）

#### Day 8-10: Larkオートメーション設定

```yaml
# Lark Automation フロー設計

トリガー:
  - イベント: レコード作成
  - テーブル: YouTube Live Events
  - 条件: ステータス = "終了"

アクション1: 待機
  - 時間: 終了時刻フィールド + 1時間

アクション2: HTTPリクエスト
  - URL: https://your-vercel-app.vercel.app/api/youtube-archive
  - Method: POST
  - Headers:
      Content-Type: application/json
      x-lark-signature: {{HMAC_SIGNATURE}}
  - Body:
      {
        "youtube_url": "{{YouTube URL}}",
        "video_id": "{{Video ID}}",
        "title": "{{タイトル}}",
        "speaker": "{{講師名}}",
        "event_date": "{{開催日時}}",
        "lark_record_id": "{{Record ID}}"
      }
```

#### Day 11-12: yt-dlp設定・テスト

```bash
# VPSにyt-dlp配置
pip3 install yt-dlp

# YouTube認証Cookie取得（必要な場合）
# ブラウザでYouTubeログイン → 拡張機能でCookie export

# テストダウンロード
yt-dlp \
  --cookies /tmp/cookies.txt \
  --format 'bestvideo[height<=1080]+bestaudio/best' \
  -o '/tmp/test.mp4' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

#### Day 13-14: 配信システム構築

```bash
# 1. プレイリスト初期化
/opt/skillfreak-stream/scripts/stream-manager.sh update-playlist

# 2. 配信開始
systemctl start skillfreak-stream

# 3. 動作確認
curl -I https://stream.skillfreak.com/live/playlist.m3u8

# 4. ブラウザでテスト
# https://hls-js.netlify.app/demo/
# URLに https://stream.skillfreak.com/live/playlist.m3u8 を入力
```

### 8.3 Phase 3: フロントエンド開発（Week 3）

#### Day 15-17: LivePlayerコンポーネント

```bash
# 1. 必要なパッケージ
npm install hls.js

# 2. コンポーネント実装（前述）

# 3. ページ作成
# /app/stream/page.tsx
```

```typescript
// /app/stream/page.tsx
import LivePlayer from '@/components/stream/LivePlayer';
import UpcomingVideos from '@/components/stream/UpcomingVideos';

export default function StreamPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">
        SkillFreak 24時間ライブ配信
      </h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LivePlayer />
        </div>
        <div>
          <UpcomingVideos />
        </div>
      </div>
    </div>
  );
}
```

#### Day 18-19: 管理画面

```typescript
// /app/admin/stream/page.tsx
import StreamDashboard from '@/components/admin/StreamDashboard';
import PlaylistManager from '@/components/admin/PlaylistManager';

export default function AdminStreamPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">配信管理</h1>
      
      <div className="space-y-8">
        <StreamDashboard />
        <PlaylistManager />
      </div>
    </div>
  );
}
```

#### Day 20-21: テスト・調整

```bash
# 1. E2Eテスト
npm run test:e2e

# 2. パフォーマンステスト
# Lighthouse CI実行

# 3. モバイルテスト
# BrowserStack / LambdaTest

# 4. 負荷テスト
# k6でストリーム視聴を模擬
```

### 8.4 Phase 4: リリース・運用開始（Week 4）

#### Day 22-23: 本番環境デプロイ

```bash
# 1. 環境変数確認
vercel env pull .env.production

# 2. 本番デプロイ
vercel deploy --prod

# 3. VPS最終確認
systemctl status skillfreak-stream
```

#### Day 24-25: ドキュメント作成

```markdown
# 運用マニュアル

## 日次タスク
- 配信ステータス確認
- エラーログ確認

## 週次タスク
- ストレージ使用量確認
- 視聴統計レビュー

## 月次タスク
- コスト分析
- パフォーマンス最適化
```

#### Day 26-28: リリース・モニタリング

```bash
# 1. 段階的リリース
# - 5%のユーザーに先行公開
# - 問題なければ50% → 100%

# 2. アラート設定
# - Lark Webhookで異常通知
# - Uptime監視（UptimeRobot）

# 3. 初週の密なモニタリング
```

---

## 9. デプロイ・運用

### 9.1 CI/CD パイプライン

#### GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Type check
        run: npm run type-check
        
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 9.2 バックアップ戦略

#### 9.2.1 データベースバックアップ

```bash
# Supabase自動バックアップ（Pro Plan以上）
# 毎日自動実施、7日間保持

# 手動バックアップスクリプト
#!/bin/bash
pg_dump -h db.your-project.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup_$(date +%Y%m%d).dump
```

#### 9.2.2 動画バックアップ

```bash
# Backblaze B2 → 別リージョンにレプリケーション
rclone sync b2:skillfreak-archives b2-backup:skillfreak-archives-backup \
  --transfers 4 \
  --checkers 8
```

### 9.3 障害対応

#### 9.3.1 配信停止時の対応

```bash
# 1. 即座に再起動
systemctl restart skillfreak-stream

# 2. ログ確認
tail -f /opt/skillfreak-stream/logs/ffmpeg.log

# 3. プレイリスト再生成
/opt/skillfreak-stream/scripts/stream-manager.sh update-playlist

# 4. 復旧後、Larkで報告
```

#### 9.3.2 エスカレーションフロー

```
レベル1: 自動復旧（Systemd）
   ↓ 失敗
レベル2: 監視スクリプトによる復旧
   ↓ 失敗
レベル3: Lark通知 → 手動対応
   ↓ 失敗
レベル4: VPSプロバイダに問い合わせ
```

### 9.4 スケーリング戦略

#### 視聴者数に応じた対応

| 視聴者数 | 対応 | 追加コスト |
|---------|------|-----------|
| 1-10人 | 現状維持 | $0 |
| 10-30人 | CPX31にアップグレード | +$8.5/月 |
| 30-50人 | 複数VPS + ロードバランサー | +$20/月 |
| 50人以上 | CDN導入 or 専用配信サービス検討 | 要見積もり |

---

## 10. コスト試算

### 10.1 初期費用

| 項目 | 金額 | 備考 |
|------|------|------|
| Hetzner VPS初期費用 | $0 | 月額のみ |
| ドメイン取得 | $10/年 | stream.skillfreak.com |
| 開発費（外注の場合） | $0-5,000 | 自社開発想定 |
| **合計** | **$10** | |

### 10.2 月額運用費（視聴者5人想定）

| サービス | 料金 | 備考 |
|---------|------|------|
| Backblaze B2 | $6/月 | 1TB保管 |
| Hetzner VPS CPX11 | $4.5/月 | 20TB帯域込み |
| Supabase Free | $0/月 | 500MB DB、50,000 月間アクティブユーザー |
| Vercel Hobby | $0/月 | 100GB帯域、Serverless実行時間込み |
| SSL証明書 | $0/月 | Let's Encrypt |
| **合計** | **$10.5/月** | |

### 10.3 スケール時のコスト（視聴者30人想定）

| サービス | 料金 | 変更点 |
|---------|------|--------|
| Backblaze B2 | $6/月 | 変更なし |
| Hetzner VPS CPX31 | $13/月 | アップグレード |
| 超過帯域（約15TB） | $17.85/月 | $1.19/TB |
| Supabase | $0/月 | まだ無料枠内 |
| Vercel | $0/月 | まだ無料枠内 |
| **合計** | **$36.85/月** | |

### 10.4 年間コスト見積もり

```
初年度:
  初期費用: $10
  運用費: $10.5 × 12 = $126
  合計: $136

2年目以降:
  ドメイン更新: $10/年
  運用費: $126/年
  合計: $136/年
```

**1日あたり:** $0.37（約55円）

---

## 11. まとめ

### 11.1 達成される機能

✅ YouTubeライブ終了後、自動でアーカイブ保存  
✅ 24時間連続でアーカイブをループ配信  
✅ 会員限定の安全な視聴環境  
✅ PortalAppへのシームレスな統合  
✅ 視聴統計・管理画面  
✅ スマホ・タブレット対応（PWA）

### 11.2 技術的メリット

- **低コスト:** 月額$10.5から運用可能
- **スケーラブル:** 視聴者増に応じて柔軟に拡張
- **フルコントロール:** YouTubeに依存しない独自配信
- **高セキュリティ:** 会員認証・暗号化通信
- **高可用性:** 自動復旧・監視機能

### 11.3 次のステップ

1. **Phase 1実装:** インフラ準備（1週間）
2. **Phase 2実装:** 自動化システム（1週間）
3. **Phase 3実装:** フロントエンド開発（1週間）
4. **Phase 4実装:** リリース・運用開始（1週間）

**推定完成期間:** 4週間

---

## 付録

### A. 環境変数一覧

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Backblaze B2
B2_ENDPOINT=
B2_KEY_ID=
B2_APP_KEY=

# VPS
VPS_WEBHOOK_URL=
VPS_SSH_HOST=

# Lark
LARK_WEBHOOK_URL=
WEBHOOK_SECRET=

# JWT
JWT_SECRET=

# Stream
NEXT_PUBLIC_STREAM_URL=
```

### B. 参考リンク

- [Backblaze B2 API Documentation](https://www.backblaze.com/b2/docs/)
- [FFmpeg HLS Guide](https://trac.ffmpeg.org/wiki/StreamingGuide)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Hetzner Cloud Docs](https://docs.hetzner.com/cloud/)

### C. トラブルシューティング

#### C.1 配信が途切れる

**症状:** 数分おきに配信が停止する

**原因:**
- VPSの帯域制限
- FFmpegのメモリ不足
- Backblaze B2の接続エラー

**対処:**
```bash
# メモリ使用量確認
free -h

# FFmpegプロセス確認
ps aux | grep ffmpeg

# ログ確認
tail -f /opt/skillfreak-stream/logs/ffmpeg.log

# 再起動
systemctl restart skillfreak-stream
```

#### C.2 動画が自動追加されない

**症状:** 新しいYouTubeアーカイブが配信に現れない

**確認項目:**
1. Lark Webhookが正しく送信されているか
2. Vercel Functionのログ確認
3. Backblaze B2にファイルがアップロードされているか
4. VPSのプレイリストが更新されているか

```bash
# プレイリスト確認
cat /opt/skillfreak-stream/playlists/current.txt

# 手動更新
/opt/skillfreak-stream/scripts/stream-manager.sh update-playlist
```

---

**設計書バージョン:** 1.0  
**最終更新:** 2025年11月15日  
**作成者:** IvyGain Development Team
