#!/bin/bash

# YouTubeチャンネルから直近10個のアーカイブをダウンロード
# Usage: ./download-youtube-archives.sh [CHANNEL_ID]

set -e

# 設定
CHANNEL_ID="${1:-UCcOuInJwdHBy-q_p3tT0Ubw}"
CHANNEL_URL="https://www.youtube.com/channel/${CHANNEL_ID}"
DOWNLOAD_DIR="./downloads"
MAX_VIDEOS=10

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# yt-dlpパスを設定
YTDLP_CMD="yt-dlp"
if [ -f "/Users/mashimaro/Library/Python/3.12/bin/yt-dlp" ]; then
    YTDLP_CMD="/Users/mashimaro/Library/Python/3.12/bin/yt-dlp"
fi

# yt-dlpチェック
if ! command -v $YTDLP_CMD &> /dev/null && ! [ -f "$YTDLP_CMD" ]; then
    error "yt-dlpがインストールされていません: brew install $YTDLP_CMD または python3 -m pip install yt-dlp"
fi

# ディレクトリ作成
mkdir -p "$DOWNLOAD_DIR"

log "YouTubeチャンネル: $CHANNEL_URL"
log "ダウンロード先: $DOWNLOAD_DIR"
log "最大動画数: $MAX_VIDEOS"

# チャンネルの動画リストを取得（ライブストリームのみ、日付順）
log "動画リストを取得中..."
$YTDLP_CMD \
    --playlist-end $MAX_VIDEOS \
    --get-id \
    --get-title \
    --get-duration \
    --get-upload-date \
    --match-filter "was_live" \
    "$CHANNEL_URL/streams" > "${DOWNLOAD_DIR}/video_list.txt" 2>&1 || {
        warn "ライブストリームが見つからないため、通常の動画を検索します..."
        $YTDLP_CMD \
            --playlist-end $MAX_VIDEOS \
            --get-id \
            --get-title \
            --get-duration \
            --get-upload-date \
            "$CHANNEL_URL/videos" > "${DOWNLOAD_DIR}/video_list.txt"
    }

log "動画リスト取得完了"

# 動画リストを解析
video_count=0
declare -a video_ids=()
declare -a video_titles=()

while IFS= read -r line; do
    # 動画IDを抽出（11文字）
    if [[ ${#line} == 11 ]]; then
        video_ids+=("$line")
        ((video_count++))
    fi
done < "${DOWNLOAD_DIR}/video_list.txt"

log "検出された動画: ${video_count}個"

if [ $video_count -eq 0 ]; then
    error "動画が見つかりませんでした"
fi

# 各動画をダウンロード
log "動画のダウンロードを開始します..."

for i in "${!video_ids[@]}"; do
    video_id="${video_ids[$i]}"
    video_num=$((i + 1))

    log "[$video_num/$video_count] 動画ID: $video_id をダウンロード中..."

    # 動画情報を取得
    video_info=$($YTDLP_CMD \
        --get-title \
        --get-upload-date \
        --get-duration \
        "https://www.youtube.com/watch?v=$video_id")

    # タイトル取得（1行目）
    title=$(echo "$video_info" | head -n 1)
    upload_date=$(echo "$video_info" | sed -n '2p')
    duration=$(echo "$video_info" | sed -n '3p')

    log "  タイトル: $title"
    log "  アップロード日: $upload_date"

    # ダウンロード
    output_file="${DOWNLOAD_DIR}/${video_id}.mp4"

    if [ -f "$output_file" ]; then
        log "  スキップ: ファイルが既に存在します"
        continue
    fi

    $YTDLP_CMD \
        --format 'bestvideo[height<=1080]+bestaudio/best' \
        --merge-output-format mp4 \
        -o "$output_file" \
        "https://www.youtube.com/watch?v=$video_id" || {
            warn "  ダウンロード失敗: $video_id"
            continue
        }

    log "  ダウンロード完了: $output_file"

    # メタデータをJSONで保存
    cat > "${DOWNLOAD_DIR}/${video_id}.json" << EOF
{
  "video_id": "$video_id",
  "title": "$title",
  "upload_date": "$upload_date",
  "duration": "$duration",
  "youtube_url": "https://www.youtube.com/watch?v=$video_id",
  "file_path": "videos/${video_id}.mp4",
  "downloaded_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log "  メタデータ保存: ${video_id}.json"
done

log "================================"
log "ダウンロード完了！"
log "ダウンロード先: $DOWNLOAD_DIR"
log "動画数: $video_count"
log ""
log "次のステップ:"
log "1. Backblaze B2にアップロード: ./upload-to-b2.sh"
log "2. または手動で確認: ls -lh $DOWNLOAD_DIR/*.mp4"
