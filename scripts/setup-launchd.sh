#!/bin/bash
#
# macOS launchd 自動アーカイブ設定スクリプト
#
# cronより推奨: macOSネイティブのスケジューラ
#
# 使用方法:
#   ./scripts/setup-launchd.sh install   # インストール
#   ./scripts/setup-launchd.sh remove    # アンインストール
#   ./scripts/setup-launchd.sh status    # 状態確認
#   ./scripts/setup-launchd.sh logs      # ログ表示

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_NAME="com.skillfreak.auto-archive"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
SOURCE_PLIST="$PROJECT_DIR/scripts/launchd-plist.xml"

install_launchd() {
    echo "🔧 launchd ジョブをインストール中..."

    # LaunchAgentsディレクトリ作成
    mkdir -p "$HOME/Library/LaunchAgents"

    # logsディレクトリ作成
    mkdir -p "$PROJECT_DIR/logs"

    # plistをコピー（WorkingDirectoryを更新）
    sed "s|/Users/mashimaro/skillfreak-streaming-system|$PROJECT_DIR|g" "$SOURCE_PLIST" > "$PLIST_PATH"

    # 既存ジョブをアンロード
    launchctl unload "$PLIST_PATH" 2>/dev/null

    # ジョブをロード
    launchctl load "$PLIST_PATH"

    echo "✅ インストール完了"
    echo ""
    echo "📋 設定内容:"
    echo "   実行間隔: 15分ごと"
    echo "   スクリプト: $PROJECT_DIR/scripts/auto-archive-scheduler.ts"
    echo "   標準出力: $PROJECT_DIR/logs/launchd-stdout.log"
    echo "   標準エラー: $PROJECT_DIR/logs/launchd-stderr.log"
    echo ""
    echo "📝 ジョブの状態:"
    launchctl list | grep "$PLIST_NAME" || echo "   (起動中...)"
}

remove_launchd() {
    echo "🗑️  launchd ジョブを削除中..."

    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm -f "$PLIST_PATH"

    echo "✅ 削除完了"
}

show_status() {
    echo "📊 launchd ジョブの状態:"
    echo ""

    if launchctl list 2>/dev/null | grep -q "$PLIST_NAME"; then
        echo "✅ ジョブは実行中です"
        echo ""
        launchctl list | grep "$PLIST_NAME"
    elif [ -f "$PLIST_PATH" ]; then
        echo "⚠️  plistは存在しますがロードされていません"
        echo ""
        echo "ロードするには: launchctl load $PLIST_PATH"
    else
        echo "❌ ジョブは設定されていません"
        echo ""
        echo "インストールするには: ./scripts/setup-launchd.sh install"
    fi
}

show_logs() {
    echo "📜 最新ログ (直近50行):"
    echo ""
    echo "=== 標準出力 ==="
    tail -50 "$PROJECT_DIR/logs/launchd-stdout.log" 2>/dev/null || echo "(ログなし)"
    echo ""
    echo "=== 標準エラー ==="
    tail -50 "$PROJECT_DIR/logs/launchd-stderr.log" 2>/dev/null || echo "(ログなし)"
    echo ""
    echo "=== アーカイブログ ==="
    tail -50 "$PROJECT_DIR/logs/auto-archive.log" 2>/dev/null || echo "(ログなし)"
}

case "${1:-status}" in
    install)
        install_launchd
        ;;
    remove)
        remove_launchd
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "使用方法: $0 {install|remove|status|logs}"
        exit 1
        ;;
esac
