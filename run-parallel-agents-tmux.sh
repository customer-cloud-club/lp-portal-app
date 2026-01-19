#!/bin/bash
# Miyabi Parallel Agent Orchestration with tmux
# Maximum efficiency parallel execution based on DAG analysis

SESSION="miyabi-parallel"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🕷️  Miyabi Parallel Agent Orchestration${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if tmux session already exists
if tmux has-session -t $SESSION 2>/dev/null; then
    echo -e "${YELLOW}Session $SESSION already exists. Killing it...${NC}"
    tmux kill-session -t $SESSION
fi

# Create new tmux session
echo -e "${GREEN}Creating tmux session: $SESSION${NC}"
tmux new-session -d -s $SESSION -n "coordinator"

# Create window layout for Level 0 (5 parallel agents)
echo -e "${GREEN}Phase 1: Starting Level 0 - 5 parallel agents${NC}"

tmux new-window -t $SESSION:1 -n "level0-db"
tmux send-keys -t $SESSION:1 "echo 'Agent #4: Database Schema Setup' && npx miyabi agent run codegen -i 4" C-m

tmux new-window -t $SESSION:2 -n "level0-auth"
tmux send-keys -t $SESSION:2 "echo 'Agent #5: Authentication System' && npx miyabi agent run codegen -i 5" C-m

tmux new-window -t $SESSION:3 -n "level0-b2"
tmux send-keys -t $SESSION:3 "echo 'Agent #6: Backblaze B2 Storage' && npx miyabi agent run codegen -i 6" C-m

tmux new-window -t $SESSION:4 -n "level0-ui"
tmux send-keys -t $SESSION:4 "echo 'Agent #7: UI Components Library' && npx miyabi agent run codegen -i 7" C-m

tmux new-window -t $SESSION:5 -n "level0-docs"
tmux send-keys -t $SESSION:5 "echo 'Agent #8: Documentation' && npx miyabi agent run codegen -i 8" C-m

# Monitor and wait for Level 0 completion
echo -e "${YELLOW}Monitoring Level 0 completion...${NC}"
echo -e "${BLUE}Run 'tmux attach -t $SESSION' to view agents in real-time${NC}\n"

# Instructions for manual phase progression
cat << 'EOF'

📋 ORCHESTRATION PHASES:

Phase 1 (RUNNING): Level 0 - 5 parallel agents
  - #4: Database Schema (20min)
  - #5: Authentication System (25min)
  - #6: Backblaze B2 Storage (20min)
  - #7: UI Components Library (30min)
  - #8: Documentation (15min)

Phase 2 (PENDING): Level 1 - 3 parallel agents (after Level 0)
  - #9: HLS Player (needs #7)
  - #10: Admin Dashboard (needs #4, #5, #7)
  - #11: API Routes (needs #4, #5)

Phase 3 (PENDING): Level 2 - 2 parallel agents (after Level 1)
  - #12: VPS Setup (needs #11)
  - #13: Integration Tests (needs #9, #10, #11)

🎯 TMUX COMMANDS:
  - tmux attach -t miyabi-parallel     # Attach to session
  - Ctrl+b, w                           # List windows
  - Ctrl+b, n                           # Next window
  - Ctrl+b, p                           # Previous window
  - Ctrl+b, 0-5                         # Jump to window 0-5
  - Ctrl+b, d                           # Detach from session

📊 MONITORING:
  - Watch all agents: tmux attach -t miyabi-parallel
  - Check status: npx miyabi status
  - Kill session: tmux kill-session -t miyabi-parallel

⚡ When Level 0 completes, run:
  ./run-phase2.sh

EOF

echo -e "${GREEN}✅ Phase 1 agents launched!${NC}"
echo -e "${BLUE}Attach to session: tmux attach -t $SESSION${NC}"
