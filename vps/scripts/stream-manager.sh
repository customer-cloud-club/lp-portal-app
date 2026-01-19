#!/bin/bash

# SkillFreak Streaming System - Stream Manager
# 24時間自動配信管理スクリプト

# 設定
B2_BUCKET="${B2_BUCKET:-skillfreak-archives}"
B2_PREFIX="videos/"
STREAM_DIR="${STREAM_DIR:-/opt/skillfreak-stream/stream}"
PLAYLIST_FILE="${PLAYLIST_FILE:-/opt/skillfreak-stream/playlists/current.txt}"
LOG_FILE="${LOG_FILE:-/opt/skillfreak-stream/logs/stream.log}"
FFMPEG_LOG="${FFMPEG_LOG:-/opt/skillfreak-stream/logs/ffmpeg.log}"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# エラーハンドリング
error() {
    log "ERROR: $1"
    exit 1
}

# Backblaze B2から動画リスト取得
update_playlist() {
    log "Updating playlist..."

    # rcloneでB2から動画一覧取得（ランダムシャッフル）
    rclone lsf "b2:${B2_BUCKET}/${B2_PREFIX}" | sort -R > "$PLAYLIST_FILE" || error "Failed to list B2 files"

    # FFmpeg用にフルパス変換
    local url_list="${PLAYLIST_FILE}.urls"
    > "$url_list"

    while IFS= read -r video; do
        if [ -n "$video" ]; then
            echo "https://f004.backblazeb2.com/file/${B2_BUCKET}/${B2_PREFIX}${video}" >> "$url_list"
        fi
    done < "$PLAYLIST_FILE"

    local video_count=$(wc -l < "$PLAYLIST_FILE")
    log "Playlist updated: $video_count videos"
}

# 24時間配信開始
start_streaming() {
    log "Starting 24/7 stream..."

    # ディレクトリ作成
    mkdir -p "$STREAM_DIR/segments"

    local url_list="${PLAYLIST_FILE}.urls"

    while true; do
        # プレイリストが存在しない場合は作成
        if [ ! -f "$url_list" ] || [ ! -s "$url_list" ]; then
            log "Playlist not found or empty, creating..."
            update_playlist
        fi

        # プレイリストを読み込んで配信
        while IFS= read -r video_url; do
            if [ -z "$video_url" ]; then
                continue
            fi

            log "Now streaming: $video_url"

            # FFmpegでHLSストリーミング
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
                >> "$FFMPEG_LOG" 2>&1

            # エラー時は次の動画へ
            local exit_code=$?
            if [ $exit_code -ne 0 ]; then
                log "Error streaming $video_url (exit code: $exit_code), skipping..."
                sleep 2
            fi
        done < "$url_list"

        # プレイリストの最後まで到達したらループ
        log "Playlist completed, restarting..."
        sleep 1
    done
}

# プレイリスト定期更新（1時間ごと）
schedule_playlist_update() {
    while true; do
        sleep 3600  # 1時間
        log "Scheduled playlist update"
        update_playlist
    done
}

# ステータス確認
status() {
    echo "=== SkillFreak Stream Status ==="

    # FFmpegプロセス確認
    if pgrep -f "ffmpeg.*playlist.m3u8" > /dev/null; then
        echo "Stream: RUNNING"
        local pid=$(pgrep -f "ffmpeg.*playlist.m3u8")
        echo "PID: $pid"
    else
        echo "Stream: STOPPED"
    fi

    # プレイリスト確認
    if [ -f "$PLAYLIST_FILE" ]; then
        local count=$(wc -l < "$PLAYLIST_FILE")
        echo "Playlist: $count videos"
    else
        echo "Playlist: NOT FOUND"
    fi

    # ストリーム出力確認
    if [ -f "${STREAM_DIR}/playlist.m3u8" ]; then
        echo "HLS Output: EXISTS"
        local segments=$(ls -1 "${STREAM_DIR}/segments/"*.ts 2>/dev/null | wc -l)
        echo "Segments: $segments"
    else
        echo "HLS Output: NOT FOUND"
    fi

    # ディスク使用量
    local disk_usage=$(df -h "$STREAM_DIR" | awk 'NR==2 {print $5}')
    echo "Disk Usage: $disk_usage"

    echo "================================"
}

# メイン処理
case "$1" in
    start)
        log "Starting stream service..."
        update_playlist
        start_streaming &
        schedule_playlist_update &
        log "Stream service started"
        ;;

    stop)
        log "Stopping stream service..."
        pkill -f "ffmpeg.*playlist.m3u8"
        pkill -f "stream-manager.sh"
        log "Stream service stopped"
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    update-playlist)
        update_playlist
        ;;

    status)
        status
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|update-playlist|status}"
        exit 1
        ;;
esac
