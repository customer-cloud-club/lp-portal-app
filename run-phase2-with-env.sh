#!/bin/bash
# Miyabi Phase 2: Level 1 Parallel Execution (with .env)

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
NC='\033[0m'

echo -e "${BLUE}🕷️  Phase 2: Level 1 - 3 Parallel Agents (with .env)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verify API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY not found in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ANTHROPIC_API_KEY loaded${NC}"

# Verify Level 0 completion
echo -e "${YELLOW}Verifying Level 0 completion (#4, #5, #6, #7, #8)...${NC}"
npx miyabi status

echo -e "\n${GREEN}Starting Phase 2 agents...${NC}\n"

# Pass environment variables to tmux
TMUX_ENV="export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY' && export GITHUB_TOKEN='$GITHUB_TOKEN'"

# Create windows for Level 1
tmux new-window -t $SESSION:6 -n "level1-player"
tmux send-keys -t $SESSION:6 "$TMUX_ENV && echo 'Agent #9: HLS Stream Player Component' && npx miyabi agent run codegen -i 9" C-m

tmux new-window -t $SESSION:7 -n "level1-dashboard"
tmux send-keys -t $SESSION:7 "$TMUX_ENV && echo 'Agent #10: Admin Dashboard' && npx miyabi agent run codegen -i 10" C-m

tmux new-window -t $SESSION:8 -n "level1-api"
tmux send-keys -t $SESSION:8 "$TMUX_ENV && echo 'Agent #11: API Routes' && npx miyabi agent run codegen -i 11" C-m

cat << 'EOF'

📋 PHASE 2 RUNNING:
  - #9: HLS Player (35min) ← depends on #7
  - #10: Admin Dashboard (40min) ← depends on #4, #5, #7
  - #11: API Routes (30min) ← depends on #4, #5

⚡ When Phase 2 completes, run Phase 3

EOF

echo -e "${GREEN}✅ Phase 2 agents launched with API key!${NC}"
echo -e "${BLUE}Attach to session: tmux attach -t $SESSION${NC}"
