# YouTube自動アーカイブシステム セットアップガイド

## 概要

YouTube Live終了後、自動的に動画をLark Driveにアーカイブし、
LarkBaseの「アーカイブ動画」フィールドにURLを登録するシステム

## システムフロー

```
YouTube Live終了
    ↓ （イベント終了時刻 + 1時間後）
GitHub Actions Cron（毎時実行）
    ↓
終了イベント検知（larkbase-scheduler.ts）
    ↓
yt-dlpでYouTube動画をダウンロード
    ↓
Lark Driveにアップロード
    ↓
LarkBaseの「アーカイブ動画」フィールドにURL登録
    ↓
ポータルサイトでアーカイブ動画を再生可能
```

## 前提条件

### 1. Lark App権限設定

https://open.larksuite.com/app にアクセスし、以下の権限を有効化：

| 権限 | 説明 |
|-----|-----|
| `drive:drive:readonly` | ファイル読み取り |
| `drive:drive:write` | ファイル書き込み |
| `bitable:app:all` | LarkBase全権限 |

### 2. LarkBaseフィールド設定

イベント管理テーブルに以下のフィールドを追加：

| フィールド名 | フィールドタイプ | 説明 |
|------------|--------------|-----|
| アーカイブ動画 | リンク | アーカイブ動画のURL |
| イベント開始日時 | 日時 | イベント開始時刻 |
| 時間（分） | 数値 | イベント時間（分） |
| セミナーURL | リンク | YouTube Live URL |

### 3. 環境変数設定

`.env` ファイルに以下を設定：

```bash
# Lark/Feishu API
LARK_APP_ID=cli_xxxxx
LARK_APP_SECRET=xxxxx

# LarkBase
LARKBASE_APP_TOKEN=xxxxx
LARKBASE_TABLE_ID=xxxxx

# Lark Drive
LARK_DRIVE_FOLDER_ID=xxxxx
```

### 4. GitHub Secrets設定

リポジトリのSettings → Secrets → Actionsに以下を追加：

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARKBASE_APP_TOKEN`
- `LARKBASE_TABLE_ID`
- `LARK_DRIVE_FOLDER_ID`

## 使い方

### 手動実行（CLI）

```bash
# 過去1時間以内に終了したイベントをアーカイブ
npx ts-node scripts/auto-archive-ended-events.ts

# 過去24時間以内に終了したイベントをアーカイブ
npx ts-node scripts/auto-archive-ended-events.ts --hours 24

# ドライラン（確認のみ）
npx ts-node scripts/auto-archive-ended-events.ts --dry-run
```

### 単一動画のアーカイブ

```bash
# 新規レコード作成
npx ts-node scripts/youtube-to-lark-drive.ts "https://youtube.com/watch?v=xxxxx"

# 既存レコードを更新
npx ts-node scripts/youtube-to-lark-drive.ts "https://youtube.com/watch?v=xxxxx" --record-id recXXXXXX
```

### GitHub Actions（自動実行）

毎時0分に自動実行されます。

手動トリガー：
1. Actions → "YouTube Auto Archive" → "Run workflow"
2. オプションを指定して実行

### API経由

```bash
# アーカイブ対象の確認
curl http://localhost:3000/api/archive/auto

# アーカイブ実行
curl -X POST http://localhost:3000/api/archive/auto \
  -H "Content-Type: application/json" \
  -d '{"hours": 1}'
```

## ファイル構成

```
lib/
├── larkbase-client.ts      # LarkBase APIクライアント
├── larkbase-scheduler.ts   # イベント終了検知ロジック
├── portalapp-sync.ts       # アーカイブURL登録
├── lark-drive-http.ts      # Lark Drive アップロード

scripts/
├── youtube-to-lark-drive.ts      # 単一動画アーカイブ
├── auto-archive-ended-events.ts  # 自動アーカイブ

app/api/archive/
├── auto/route.ts           # 自動アーカイブAPI

.github/workflows/
├── auto-archive.yml        # GitHub Actions Cron
```

## トラブルシューティング

### Lark Drive 403エラー

権限不足です。Lark Admin画面で以下を確認：
1. `drive:drive:write` 権限が有効か
2. アップロード先フォルダにアプリがアクセス可能か

### yt-dlp not found

```bash
# macOS
pip3 install yt-dlp

# Ubuntu
sudo apt-get install yt-dlp
```

### FFmpeg not found

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg
```

### アーカイブ動画が再生されない

1. LarkBaseの「アーカイブ動画」フィールドにURLが登録されているか確認
2. Lark Driveの共有設定を確認（組織内共有が必要）
3. ブラウザのコンソールでエラーを確認

## ポータルでの動画再生

イベント詳細ページ (`/events/[id]`) では以下の優先順位で動画を表示：

1. **アーカイブ動画フィールド** → LarkVideoPlayer
2. **YouTube URL** → YouTube iframe埋め込み
3. **セミナーURL** → 直接再生

## 開発者向け

### テスト実行

```bash
# スケジューラーのテスト
npx ts-node -e "
import { getEventsToArchive } from './lib/larkbase-scheduler';
getEventsToArchive().then(events => {
  console.log('アーカイブ対象:', events.length, '件');
  events.forEach(e => console.log('-', e.title));
});
"
```

### デバッグログ

```bash
DEBUG=* npx ts-node scripts/auto-archive-ended-events.ts
```
