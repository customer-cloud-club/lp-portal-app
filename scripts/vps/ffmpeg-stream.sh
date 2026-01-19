#!/usr/bin/env bash
#
# FFmpeg 24-Hour Loop Streaming Script
# Converts local videos to HLS and streams to RTMP server
#
# Usage:
#   ./ffmpeg-stream.sh INPUT_FOLDER OUTPUT_RTMP_URL [OPTIONS]
#
# Examples:
#   ./ffmpeg-stream.sh /opt/streaming/videos rtmp://localhost/live/stream
#   ./ffmpeg-stream.sh /opt/streaming/videos rtmp://localhost/live/stream --loop 5
#   ./ffmpeg-stream.sh /opt/streaming/videos rtmp://localhost/live/stream --shuffle
#
# Options:
#   --loop N         Number of times to loop (default: infinite)
#   --shuffle        Randomize video order
#   --preset PRESET  FFmpeg preset: ultrafast, fast, medium, slow (default: fast)
#   --bitrate RATE   Video bitrate (default: 2000k)
#   --help          Show this help message
#

set -euo pipefail

# Default configuration
INPUT_FOLDER=""
OUTPUT_URL=""
LOOP_COUNT=0  # 0 = infinite
SHUFFLE=false
PRESET="fast"
VIDEO_BITRATE="2000k"
AUDIO_BITRATE="128k"
FPS=30
RESOLUTION="1280x720"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat << EOF
FFmpeg 24-Hour Loop Streaming Script

Usage:
  $0 INPUT_FOLDER OUTPUT_RTMP_URL [OPTIONS]

Arguments:
  INPUT_FOLDER      Directory containing video files
  OUTPUT_RTMP_URL   RTMP destination URL (e.g., rtmp://localhost/live/stream)

Options:
  --loop N          Number of times to loop playlist (default: infinite)
  --shuffle         Randomize video order
  --preset PRESET   FFmpeg preset: ultrafast, fast, medium, slow (default: fast)
  --bitrate RATE    Video bitrate (default: 2000k)
  --help           Show this help message

Examples:
  $0 /opt/streaming/videos rtmp://localhost/live/stream
  $0 /opt/streaming/videos rtmp://localhost/live/stream --loop 5
  $0 /opt/streaming/videos rtmp://localhost/live/stream --shuffle --bitrate 3000k

EOF
}

# Parse arguments
if [[ $# -lt 2 ]]; then
    show_help
    exit 1
fi

INPUT_FOLDER="$1"
OUTPUT_URL="$2"
shift 2

while [[ $# -gt 0 ]]; do
    case $1 in
        --loop)
            LOOP_COUNT="$2"
            shift 2
            ;;
        --shuffle)
            SHUFFLE=true
            shift
            ;;
        --preset)
            PRESET="$2"
            shift 2
            ;;
        --bitrate)
            VIDEO_BITRATE="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate input folder
if [[ ! -d "$INPUT_FOLDER" ]]; then
    log_error "Input folder does not exist: $INPUT_FOLDER"
    exit 1
fi

# Check for video files
VIDEO_FILES=()
while IFS= read -r -d '' file; do
    VIDEO_FILES+=("$file")
done < <(find "$INPUT_FOLDER" -type f \( -iname "*.mp4" -o -iname "*.mkv" -o -iname "*.avi" -o -iname "*.mov" -o -iname "*.flv" -o -iname "*.webm" \) -print0)

if [[ ${#VIDEO_FILES[@]} -eq 0 ]]; then
    log_error "No video files found in $INPUT_FOLDER"
    exit 1
fi

log_info "Found ${#VIDEO_FILES[@]} video files"

# Shuffle if requested
if [[ "$SHUFFLE" == true ]]; then
    log_info "Shuffling video order..."
    # shellcheck disable=SC2207
    VIDEO_FILES=($(printf '%s\n' "${VIDEO_FILES[@]}" | shuf))
fi

# Create playlist file
PLAYLIST_FILE="/tmp/streaming-playlist-$$.txt"
trap 'rm -f "$PLAYLIST_FILE"' EXIT

log_info "Creating playlist..."
for video in "${VIDEO_FILES[@]}"; do
    echo "file '${video}'" >> "$PLAYLIST_FILE"
done

# Display configuration
log_info "=========================================="
log_info "Streaming Configuration:"
log_info "  Input Folder: $INPUT_FOLDER"
log_info "  Output URL: $OUTPUT_URL"
log_info "  Video Count: ${#VIDEO_FILES[@]}"
log_info "  Loop Count: $(if [[ $LOOP_COUNT -eq 0 ]]; then echo "infinite"; else echo "$LOOP_COUNT"; fi)"
log_info "  Shuffle: $SHUFFLE"
log_info "  Preset: $PRESET"
log_info "  Video Bitrate: $VIDEO_BITRATE"
log_info "  Audio Bitrate: $AUDIO_BITRATE"
log_info "  Resolution: $RESOLUTION"
log_info "  FPS: $FPS"
log_info "=========================================="

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    log_error "FFmpeg is not installed"
    exit 1
fi

# Start streaming
log_info "Starting streaming... (Press Ctrl+C to stop)"
log_info ""

# Construct FFmpeg command
FFMPEG_CMD=(
    ffmpeg
    -re                                    # Read input at native frame rate
    -stream_loop "$LOOP_COUNT"            # Loop count (0 = infinite)
    -f concat                              # Concatenate demuxer
    -safe 0                                # Allow absolute paths
    -i "$PLAYLIST_FILE"                   # Input playlist
    -c:v libx264                          # Video codec
    -preset "$PRESET"                     # Encoding preset
    -b:v "$VIDEO_BITRATE"                 # Video bitrate
    -maxrate "$VIDEO_BITRATE"             # Maximum bitrate
    -bufsize "${VIDEO_BITRATE//k/*2k}"    # Buffer size
    -s "$RESOLUTION"                      # Resolution
    -r "$FPS"                             # Frame rate
    -g "$((FPS * 2))"                     # GOP size (2 seconds)
    -keyint_min "$FPS"                    # Minimum GOP size
    -sc_threshold 0                       # Disable scene change detection
    -c:a aac                              # Audio codec
    -b:a "$AUDIO_BITRATE"                 # Audio bitrate
    -ar 44100                             # Audio sample rate
    -ac 2                                 # Audio channels
    -f flv                                # Output format
    "$OUTPUT_URL"                         # Output URL
)

# Run FFmpeg with error handling
run_count=0
while true; do
    run_count=$((run_count + 1))
    log_info "Stream attempt #${run_count}"

    # shellcheck disable=SC2145
    log_info "Running: ${FFMPEG_CMD[@]}"
    log_info ""

    if "${FFMPEG_CMD[@]}" 2>&1 | while IFS= read -r line; do
        # Parse FFmpeg output for useful info
        if [[ "$line" =~ frame= ]]; then
            echo -ne "\r${BLUE}[STREAM]${NC} $line"
        elif [[ "$line" =~ error|Error|ERROR ]]; then
            echo -e "\n${RED}[ERROR]${NC} $line"
        elif [[ "$line" =~ warning|Warning|WARNING ]]; then
            echo -e "\n${YELLOW}[WARN]${NC} $line"
        fi
    done; then
        log_info ""
        log_info "Streaming completed successfully"
        break
    else
        exit_code=$?
        log_error "FFmpeg exited with code $exit_code"

        # Check if it was intentional (Ctrl+C)
        if [[ $exit_code -eq 130 ]] || [[ $exit_code -eq 255 ]]; then
            log_info "Streaming stopped by user"
            break
        fi

        # Auto-restart after 5 seconds
        log_warn "Restarting stream in 5 seconds..."
        sleep 5
    fi
done

log_info "Stream ended"
