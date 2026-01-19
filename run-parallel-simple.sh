#!/bin/bash
set -e

echo "🌸 Miyabi並列実行 - バックグラウンドジョブ方式"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 環境変数読み込み
if [ -z "$ANTHROPIC_API_KEY" ]; then
    export $(cat .env | grep ANTHROPIC_API_KEY | xargs)
fi

# ログディレクトリ作成
mkdir -p logs

echo "📊 Phase 1: Level 0 - 5 Agents並列実行開始"
echo ""

# 各Agentをバックグラウンドで起動
echo "  [1/5] Agent #4: Database Schema 起動中..."
./scripts/miyabi-run.sh agent run codegen --issue 4 > logs/agent-4.log 2>&1 &
PID1=$!

echo "  [2/5] Agent #5: Authentication 起動中..."
./scripts/miyabi-run.sh agent run codegen --issue 5 > logs/agent-5.log 2>&1 &
PID2=$!

echo "  [3/5] Agent #6: Storage Integration 起動中..."
./scripts/miyabi-run.sh agent run codegen --issue 6 > logs/agent-6.log 2>&1 &
PID3=$!

echo "  [4/5] Agent #7: UI Components 起動中..."
./scripts/miyabi-run.sh agent run codegen --issue 7 > logs/agent-7.log 2>&1 &
PID4=$!

echo "  [5/5] Agent #8: Documentation 起動中..."
./scripts/miyabi-run.sh agent run codegen --issue 8 > logs/agent-8.log 2>&1 &
PID5=$!

echo ""
echo "✅ 全5 Agents起動完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 プロセスID:"
echo "   Agent #4: PID $PID1"
echo "   Agent #5: PID $PID2"
echo "   Agent #6: PID $PID3"
echo "   Agent #7: PID $PID4"
echo "   Agent #8: PID $PID5"
echo ""
echo "📊 進捗確認:"
echo "   tail -f logs/agent-4.log  # Database Schema"
echo "   tail -f logs/agent-5.log  # Authentication"
echo "   tail -f logs/agent-6.log  # Storage"
echo "   tail -f logs/agent-7.log  # UI Components"
echo "   tail -f logs/agent-8.log  # Documentation"
echo ""
echo "⏱️  推定完了時間: 30分"
echo "💾 メモリ使用: ~10.5GB / 24GB"
echo ""

# 全プロセスの完了を待機
echo "⏳ Agents実行中... (Ctrl+C で中断可能)"
wait $PID1 $PID2 $PID3 $PID4 $PID5

echo ""
echo "🎉 全Agent完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
