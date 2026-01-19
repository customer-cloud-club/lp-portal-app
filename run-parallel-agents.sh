#!/bin/bash
set -e

# Miyabi並列実行スクリプト
# 24GB RAM環境で最大効率実行

echo "🌸 Miyabi Parallel Execution - Starting..."

# 環境変数チェック
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set. Loading from .env..."
    export $(cat .env | grep ANTHROPIC_API_KEY | xargs)
fi

# tmuxセッション名
SESSION="miyabi-parallel"

# 既存セッションがあれば削除
tmux kill-session -t $SESSION 2>/dev/null || true

# 新規セッション作成
tmux new-session -d -s $SESSION -n "Level0"

echo "📊 Phase 1: Level 0 - 5 Agents並列実行"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 5ペイン作成（2x3グリッド）
tmux split-window -h -t $SESSION:0
tmux split-window -v -t $SESSION:0.0
tmux split-window -v -t $SESSION:0.1
tmux select-pane -t $SESSION:0.2
tmux split-window -v -t $SESSION:0.2

# 各ペインでAgent実行
echo "  [Agent 1/5] Issue #4: Database Schema"
tmux send-keys -t $SESSION:0.0 "./scripts/miyabi-run.sh agent run codegen --issue 4 2>&1 | tee logs/agent-4.log" C-m

echo "  [Agent 2/5] Issue #5: Authentication"
tmux send-keys -t $SESSION:0.1 "./scripts/miyabi-run.sh agent run codegen --issue 5 2>&1 | tee logs/agent-5.log" C-m

echo "  [Agent 3/5] Issue #6: Storage Integration"
tmux send-keys -t $SESSION:0.2 "./scripts/miyabi-run.sh agent run codegen --issue 6 2>&1 | tee logs/agent-6.log" C-m

echo "  [Agent 4/5] Issue #7: UI Components"
tmux send-keys -t $SESSION:0.3 "./scripts/miyabi-run.sh agent run codegen --issue 7 2>&1 | tee logs/agent-7.log" C-m

echo "  [Agent 5/5] Issue #8: Documentation"
tmux send-keys -t $SESSION:0.4 "./scripts/miyabi-run.sh agent run codegen --issue 8 2>&1 | tee logs/agent-8.log" C-m

echo ""
echo "✅ Level 0 agents started in tmux session: $SESSION"
echo "📌 Commands:"
echo "   tmux attach -t $SESSION     # セッションにアタッチ"
echo "   tmux kill-session -t $SESSION  # セッション終了"
echo ""
echo "⏱️  推定完了時間: 30分"
echo "💾 メモリ使用: ~10.5GB / 24GB"
echo ""

# アタッチするか選択
read -p "tmuxセッションにアタッチしますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    tmux attach -t $SESSION
else
    echo "バックグラウンドで実行中..."
    echo "進捗確認: tail -f logs/agent-*.log"
fi
