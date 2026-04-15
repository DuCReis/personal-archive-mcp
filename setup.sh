#!/usr/bin/env bash
# Setup script for personal-archive MCP server on a new device.
#
# Usage:
#   1. Copy this folder to the target device
#   2. Run: bash setup.sh
#   3. Follow the printed instructions to add the config to Claude

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo -e "${BLUE}==> Personal Archive MCP Server Setup${NC}"
echo

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Node.js not found.${NC} Install Node 20+ from https://nodejs.org/ and re-run."
  exit 1
fi
NODE_VERSION="$(node --version)"
echo -e "${GREEN}✓${NC} Node $NODE_VERSION"

# 2. Package manager
if command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo -e "${RED}No pnpm or npm found.${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Using $PM"

# 3. Install deps
echo -e "${BLUE}==> Installing dependencies...${NC}"
$PM install

# 4. Build
echo -e "${BLUE}==> Building TypeScript...${NC}"
npx tsc

if [ ! -f "$DIR/dist/index.js" ]; then
  echo -e "${RED}Build failed — dist/index.js not found.${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Built to $DIR/dist/index.js"

# 5. Print config
echo
echo -e "${BLUE}==> Setup done!${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo
echo "1. Generate an API key at:"
echo "   https://vps-a9517071.vps.ovh.net/settings/api-keys"
echo
echo "2. Add this to your Claude config:"
echo
echo "   Claude Code: ~/.claude.json"
echo "   Claude Desktop (macOS): ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   Claude Desktop (Windows): %APPDATA%\\Claude\\claude_desktop_config.json"
echo
cat <<EOF
{
  "mcpServers": {
    "personal-archive": {
      "command": "node",
      "args": ["$DIR/dist/index.js"],
      "env": {
        "PERSONAL_ARCHIVE_URL": "https://vps-a9517071.vps.ovh.net",
        "PERSONAL_ARCHIVE_API_KEY": "pa_YOUR_KEY_HERE",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
EOF
echo
echo "3. Restart Claude — you should see 48 personal-archive tools available."
echo
