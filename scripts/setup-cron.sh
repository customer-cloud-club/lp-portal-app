#!/bin/bash
#
# 自動アーカイブ cron ジョブ設定スクリプト
#
# 使用方法:
#   ./scripts/setup-cron.sh install   # cronジョブをインストール
#   ./scripts/setup-cron.sh remove    # cronジョブを削除
#   ./scripts/setup-cron.sh status    # 現在の状態を確認

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRON_JOB="*/15 * * * * cd $PROJECT_DIR && /usr/local/bin/npx tsx scripts/auto-archive-scheduler.ts >> logs/cron.log 2>&1"
CRON_MARKER="# skillfreak-auto-archive"

install_cron() {
    echo "🔧 cronジョブをインストール中..."

    # 既存のエントリを削除
    (crontab -l 2>/dev/null | grep -v "$CRON_MARKER") > /tmp/crontab.tmp

    # 新しいエントリを追加
    echo "$CRON_MARKER" >> /tmp/crontab.tmp
    echo "$CRON_JOB" >> /tmp/crontab.tmp

    # cronを更新
    crontab /tmp/crontab.tmp
    rm /tmp/crontab.tmp

    echo "✅ インストール完了"
    echo ""
    echo "📋 設定内容:"
    echo "   実行間隔: 15分ごと"
    echo "   スクリプト: $PROJECT_DIR/scripts/auto-archive-scheduler.ts"
    echo "   ログ: $PROJECT_DIR/logs/cron.log"
    echo ""
    echo "📝 現在のcron設定:"
    crontab -l | grep -A1 "$CRON_MARKER"
}

remove_cron() {
    echo "🗑️  cronジョブを削除中..."

    # エントリを削除
    (crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | grep -v "auto-archive-scheduler") > /tmp/crontab.tmp
    crontab /tmp/crontab.tmp
    rm /tmp/crontab.tmp

    echo "✅ 削除完了"
}

show_status() {
    echo "📊 cronジョブの状態:"
    echo ""

    if crontab -l 2>/dev/null | grep -q "auto-archive-scheduler"; then
        echo "✅ cronジョブは設定されています"
        echo ""
        echo "📋 設定内容:"
        crontab -l | grep -A1 "$CRON_MARKER"
    else
        echo "❌ cronジョブは設定されていません"
        echo ""
        echo "インストールするには: ./scripts/setup-cron.sh install"
    fi
}

case "${1:-status}" in
    install)
        install_cron
        ;;
    remove)
        remove_cron
        ;;
    status)
        show_status
        ;;
    *)
        echo "使用方法: $0 {install|remove|status}"
        exit 1
        ;;
esac
