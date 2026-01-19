#!/bin/bash
# Miyabi Phase 3: Level 2 Parallel Execution
# Runs after Level 1 completion

SESSION="miyabi-parallel"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🕷️  Phase 3: Level 2 - 2 Parallel Agents${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verify Level 1 completion
echo -e "${YELLOW}Verifying Level 1 completion (#9, #10, #11)...${NC}"
npx miyabi status

echo -e "\n${GREEN}Starting Phase 3 agents...${NC}\n"

# Create windows for Level 2
tmux new-window -t $SESSION:9 -n "level2-vps"
tmux send-keys -t $SESSION:9 "echo 'Agent #12: VPS Setup Scripts' && npx miyabi agent run codegen -i 12" C-m

tmux new-window -t $SESSION:10 -n "level2-tests"
tmux send-keys -t $SESSION:10 "echo 'Agent #13: Integration & E2E Testing' && npx miyabi agent run codegen -i 13" C-m

cat << 'EOF'

📋 PHASE 3 RUNNING (FINAL):
  - #12: VPS Setup (25min) ← depends on #11
  - #13: Integration Tests (30min) ← depends on #9, #10, #11

🎉 When Phase 3 completes, all issues will be done!
   Total execution time: ~100 minutes (vs 320 minutes sequential)
   Efficiency gain: 69%

EOF

echo -e "${GREEN}✅ Phase 3 agents launched!${NC}"
echo -e "${BLUE}Attach to session: tmux attach -t $SESSION${NC}"
