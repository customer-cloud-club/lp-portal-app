#!/bin/bash

# YouTubeチャンネルから直近10個のアーカイブをダウンロード（シンプル版）
# Usage: ./download-youtube-archives-simple.sh [CHANNEL_ID]

set -e

# 設定
CHANNEL_ID="${1:-UCcOuInJwdHBy-q_p3tT0Ubw}"
CHANNEL_URL="https://www.youtube.com/channel/${CHANNEL_ID}/videos"
DOWNLOAD_DIR="./downloads"
MAX_VIDEOS=10

# yt-dlpパスを設定
YTDLP_CMD="/Users/mashimaro/Library/Python/3.12/bin/yt-dlp"

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# yt-dlpチェック
if ! [ -f "$YTDLP_CMD" ]; then
    error "yt-dlpが見つかりません: $YTDLP_CMD"
fi

# ディレクトリ作成
mkdir -p "$DOWNLOAD_DIR"

log "===================================="
log "YouTubeアーカイブダウンロード開始"
log "===================================="
log "チャンネル: $CHANNEL_URL"
log "保存先: $DOWNLOAD_DIR"
log "最大動画数: $MAX_VIDEOS"
log ""

# ダウンロード実行（最新10個の動画）
log "ダウンロード開始..."

$YTDLP_CMD \
    --playlist-end $MAX_VIDEOS \
    --format 'bestvideo[height<=1080]+bestaudio/best' \
    --merge-output-format mp4 \
    --write-info-json \
    --write-thumbnail \
    -o "${DOWNLOAD_DIR}/%(id)s.%(ext)s" \
    --print-to-file "%(id)s|%(title)s|%(upload_date)s|%(duration)s" "${DOWNLOAD_DIR}/metadata.txt" \
    --progress \
    "$CHANNEL_URL"

log ""
log "===================================="
log "ダウンロード完了！"
log "===================================="
log "保存先: $DOWNLOAD_DIR"

# ダウンロードされた動画をカウント
video_count=$(find "$DOWNLOAD_DIR" -name "*.mp4" | wc -l | tr -d ' ')
log "ダウンロード済み動画: ${video_count}個"

log ""
log "次のステップ:"
log "1. 動画を確認: ls -lh $DOWNLOAD_DIR/*.mp4"
log "2. Backblaze B2にアップロード: ./scripts/upload-to-b2.sh"
