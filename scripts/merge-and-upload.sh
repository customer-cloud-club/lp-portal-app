#!/usr/bin/env bash

# Merge video + audio then upload to Backblaze B2 using existing upload script.
# Usage: ./scripts/merge-and-upload.sh <video_id>
# Example: ./scripts/merge-and-upload.sh z3rk3PfzLos

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
DOWNLOADS_DIR="${REPO_ROOT}/downloads"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <video_id>"
  exit 2
fi

VIDEO_ID="$1"

cd "$DOWNLOADS_DIR"

log() { echo "[INFO] $*"; }
err() { echo "[ERROR] $*" >&2; exit 1; }

if ! command -v ffmpeg >/dev/null 2>&1; then
  err "ffmpeg が見つかりません。インストールしてください（brew install ffmpeg など）。"
fi

# common candidate filenames
VIDEO_CAND="${VIDEO_ID}.f136.mp4 ${VIDEO_ID}.f137.mp4 ${VIDEO_ID}.mp4"
AUDIO_CAND="${VIDEO_ID}.f251.webm ${VIDEO_ID}.f140.webm ${VIDEO_ID}.webm"

find_candidate() {
  for p in $1; do
    if [ -f "$p" ]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

VIDEO_FILE=$(find_candidate "$VIDEO_CAND") || true
AUDIO_FILE=$(find_candidate "$AUDIO_CAND") || true

if [ -z "$VIDEO_FILE" ]; then
  err "ビデオファイルが見つかりません。候補: $VIDEO_CAND"
fi

if [ -z "$AUDIO_FILE" ]; then
  log "警告: オーディオファイルが見つかりません。ビデオのみを出力します。"
  MERGED_FILE="${VIDEO_ID}.mp4"
  cp -v "$VIDEO_FILE" "$MERGED_FILE"
else
  MERGED_FILE="${VIDEO_ID}.mp4"

  log "ffmpeg でマージ: video=$VIDEO_FILE audio=$AUDIO_FILE -> $MERGED_FILE"

  ffmpeg -y -i "$VIDEO_FILE" -i "$AUDIO_FILE" -c copy -map 0:v:0 -map 1:a:0 "$MERGED_FILE"
fi

if [ ! -f "$MERGED_FILE" ]; then
  err "マージに失敗しました: $MERGED_FILE が見つかりません。"
fi

log "マージ完了: $MERGED_FILE"

# Call existing upload script which uploads all mp4s in downloads
if [ -x "${REPO_ROOT}/scripts/upload-to-b2.sh" ]; then
  log "アップロードスクリプトを実行します: scripts/upload-to-b2.sh"
  (cd "$REPO_ROOT" && ./scripts/upload-to-b2.sh)
else
  # fallback: use rclone directly if available
  if command -v rclone >/dev/null 2>&1; then
    B2_BUCKET="${B2_BUCKET_NAME:-skillfreak-archives}"
    B2_PREFIX="videos/"
    log "rclone でアップロード: b2:${B2_BUCKET}/${B2_PREFIX}"
    rclone copy "$MERGED_FILE" "b2:${B2_BUCKET}/${B2_PREFIX}" --progress
  else
    err "アップロード用スクリプトが見つかりません（scripts/upload-to-b2.sh）。または rclone が未インストールです。手動でアップロードしてください: $MERGED_FILE"
  fi
fi

log "処理完了: $MERGED_FILE がアップロード済みのはずです。"
