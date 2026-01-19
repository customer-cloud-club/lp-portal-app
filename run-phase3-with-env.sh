#!/bin/bash
# Miyabi Phase 3: Level 2 Parallel Execution (with .env) - FINAL PHASE

# Load .env file
set -a
source .env 2>/dev/null || echo "Warning: .env not found"
set +a

SESSION="miyabi-parallel"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}🕷️  Phase 3: Level 2 - 2 Parallel Agents (FINAL) ${NC}"
echo -e "${MAGENTA}========================================${NC}\n"

# Verify API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY not found in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ANTHROPIC_API_KEY loaded${NC}"

# Verify Level 1 completion
echo -e "${YELLOW}Verifying Level 1 completion (#9, #10, #11)...${NC}"
npx miyabi status

echo -e "\n${GREEN}Starting Phase 3 agents (FINAL)...${NC}\n"

# Pass environment variables to tmux
TMUX_ENV="export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY' && export GITHUB_TOKEN='$GITHUB_TOKEN'"

# Create windows for Level 2
tmux new-window -t $SESSION:9 -n "level2-vps"
tmux send-keys -t $SESSION:9 "$TMUX_ENV && echo 'Agent #12: VPS Setup Scripts' && npx miyabi agent run codegen -i 12" C-m

tmux new-window -t $SESSION:10 -n "level2-tests"
tmux send-keys -t $SESSION:10 "$TMUX_ENV && echo 'Agent #13: Integration & E2E Testing' && npx miyabi agent run codegen -i 13" C-m

cat << 'EOF'

📋 PHASE 3 RUNNING (FINAL):
  - #12: VPS Setup (25min) ← depends on #11
  - #13: Integration Tests (30min) ← depends on #9, #10, #11

🎉 When Phase 3 completes, ALL ISSUES WILL BE DONE!
   Total execution time: ~100 minutes (vs 320 minutes sequential)
   Efficiency gain: 69%

EOF

echo -e "${GREEN}✅ Phase 3 agents launched with API key!${NC}"
echo -e "${BLUE}Attach to session: tmux attach -t $SESSION${NC}"
