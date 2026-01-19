#!/bin/bash

# ダウンロードした動画をBackblaze B2にアップロードし、Supabaseに登録

set -e

# 設定
DOWNLOAD_DIR="./downloads"
B2_BUCKET="${B2_BUCKET_NAME:-skillfreak-archives}"
B2_PREFIX="videos/"

# 環境変数チェック
if [ -z "$B2_KEY_ID" ] || [ -z "$B2_APP_KEY" ]; then
    echo "エラー: B2認証情報が設定されていません"
    echo "以下の環境変数を設定してください:"
    echo "  B2_KEY_ID"
    echo "  B2_APP_KEY"
    exit 1
fi

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

# rclone設定チェック
if ! command -v rclone &> /dev/null; then
    error "rcloneがインストールされていません: brew install rclone"
fi

# rcloneのB2設定を確認
if ! rclone listremotes | grep -q "^b2:"; then
    log "rcloneのB2設定を作成中..."

    # rclone設定ファイルに追加
    mkdir -p ~/.config/rclone
    cat >> ~/.config/rclone/rclone.conf << EOF

[b2]
type = b2
account = ${B2_KEY_ID}
key = ${B2_APP_KEY}
EOF

    log "rclone B2設定完了"
fi

# ダウンロードディレクトリチェック
if [ ! -d "$DOWNLOAD_DIR" ]; then
    error "ダウンロードディレクトリが見つかりません: $DOWNLOAD_DIR"
fi

# mp4ファイルをカウント
video_count=$(find "$DOWNLOAD_DIR" -name "*.mp4" | wc -l | tr -d ' ')

if [ "$video_count" -eq 0 ]; then
    error "アップロードする動画が見つかりません"
fi

log "アップロード対象: ${video_count}個の動画"
log "アップロード先: b2:${B2_BUCKET}/${B2_PREFIX}"

# 各動画をアップロード
uploaded=0
failed=0

for video_file in "$DOWNLOAD_DIR"/*.mp4; do
    [ -f "$video_file" ] || continue

    video_id=$(basename "$video_file" .mp4)
    json_file="${DOWNLOAD_DIR}/${video_id}.json"

    log "アップロード中: $video_id"

    # B2にアップロード
    if rclone copy "$video_file" "b2:${B2_BUCKET}/${B2_PREFIX}" --progress; then
        log "  B2アップロード完了"

        # Supabaseに登録（APIを使用）
        if [ -f "$json_file" ]; then
            log "  Supabaseに登録中..."

            # メタデータ読み込み
            title=$(jq -r '.title' "$json_file")
            upload_date=$(jq -r '.upload_date' "$json_file")
            youtube_url=$(jq -r '.youtube_url' "$json_file")

            # ファイルサイズ取得
            file_size=$(stat -f%z "$video_file" 2>/dev/null || stat -c%s "$video_file" 2>/dev/null)

            # APIにPOST
            response=$(curl -s -X POST http://localhost:3000/api/youtube-archive \
                -H "Content-Type: application/json" \
                -d "{
                    \"youtube_url\": \"$youtube_url\",
                    \"video_id\": \"$video_id\",
                    \"title\": \"$title\",
                    \"speaker\": \"SkillFreak\",
                    \"event_date\": \"${upload_date}T00:00:00Z\"
                }")

            if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
                log "  Supabase登録完了"
                ((uploaded++))
            else
                warn "  Supabase登録失敗: $response"
                ((failed++))
            fi
        else
            warn "  メタデータファイルが見つかりません: $json_file"
            ((uploaded++))
        fi
    else
        warn "  B2アップロード失敗: $video_id"
        ((failed++))
    fi
done

log "================================"
log "アップロード完了！"
log "成功: ${uploaded}個"
log "失敗: ${failed}個"

if [ $uploaded -gt 0 ]; then
    log ""
    log "管理画面で確認: http://localhost:3000/admin/stream"
fi
