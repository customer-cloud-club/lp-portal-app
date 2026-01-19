#!/bin/bash
# Miyabi Parallel Agent Orchestration with tmux + .env support

# Load .env file
set -a
source .env 2>/dev/null || echo "Warning: .env not found"
set +a

SESSION="miyabi-parallel"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🕷️  Miyabi Parallel Agent Orchestration (with .env)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verify API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY not found in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ANTHROPIC_API_KEY loaded${NC}"

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

# Pass environment variables to tmux
TMUX_ENV="export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY' && export GITHUB_TOKEN='$GITHUB_TOKEN'"

tmux new-window -t $SESSION:1 -n "level0-db"
tmux send-keys -t $SESSION:1 "$TMUX_ENV && echo 'Agent #4: Database Schema Setup' && npx miyabi agent run codegen -i 4" C-m

tmux new-window -t $SESSION:2 -n "level0-auth"
tmux send-keys -t $SESSION:2 "$TMUX_ENV && echo 'Agent #5: Authentication System' && npx miyabi agent run codegen -i 5" C-m

tmux new-window -t $SESSION:3 -n "level0-b2"
tmux send-keys -t $SESSION:3 "$TMUX_ENV && echo 'Agent #6: Backblaze B2 Storage' && npx miyabi agent run codegen -i 6" C-m

tmux new-window -t $SESSION:4 -n "level0-ui"
tmux send-keys -t $SESSION:4 "$TMUX_ENV && echo 'Agent #7: UI Components Library' && npx miyabi agent run codegen -i 7" C-m

tmux new-window -t $SESSION:5 -n "level0-docs"
tmux send-keys -t $SESSION:5 "$TMUX_ENV && echo 'Agent #8: Documentation' && npx miyabi agent run codegen -i 8" C-m

echo -e "${GREEN}✅ Phase 1 agents launched with API key!${NC}"
echo -e "${BLUE}Attach to session: tmux attach -t $SESSION${NC}"
