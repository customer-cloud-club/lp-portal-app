#!/bin/bash
# Miyabi Phase 2: Level 1 Parallel Execution
# Runs after Level 0 completion

SESSION="miyabi-parallel"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🕷️  Phase 2: Level 1 - 3 Parallel Agents${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verify Level 0 completion
echo -e "${YELLOW}Verifying Level 0 completion (#4, #5, #6, #7, #8)...${NC}"
npx miyabi status

echo -e "\n${GREEN}Starting Phase 2 agents...${NC}\n"

# Create windows for Level 1
tmux new-window -t $SESSION:6 -n "level1-player"
tmux send-keys -t $SESSION:6 "echo 'Agent #9: HLS Stream Player Component' && npx miyabi agent run codegen -i 9" C-m

tmux new-window -t $SESSION:7 -n "level1-dashboard"
tmux send-keys -t $SESSION:7 "echo 'Agent #10: Admin Dashboard' && npx miyabi agent run codegen -i 10" C-m

tmux new-window -t $SESSION:8 -n "level1-api"
tmux send-keys -t $SESSION:8 "echo 'Agent #11: API Routes' && npx miyabi agent run codegen -i 11" C-m

cat << 'EOF'

📋 PHASE 2 RUNNING:
  - #9: HLS Player (35min) ← depends on #7
  - #10: Admin Dashboard (40min) ← depends on #4, #5, #7
  - #11: API Routes (30min) ← depends on #4, #5

⚡ When Phase 2 completes, run:
  ./run-phase3.sh

EOF

echo -e "${GREEN}✅ Phase 2 agents launched!${NC}"
echo -e "${BLUE}Attach to session: tmux attach -t $SESSION${NC}"
