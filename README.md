# Personal Archive MCP Server

Model Context Protocol (MCP) server exposing **48 tools** for AI agents (Claude Code, Claude Desktop, etc.) to manage Personal Archive — boards, items, notes, bookmarks, goals, archive folders, templates, automations, workspaces, and more.

## Quick start

### 1. Get an API key
Generate one at https://vps-a9517071.vps.ovh.net/settings/api-keys
The key starts with `pa_...` and is only shown once.

### 2. Add to your Claude config

| Client | Config path |
|---|---|
| Claude Code | `~/.claude.json` |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |

**Minimal config** (connects to the default VPS):
```json
{
  "mcpServers": {
    "personal-archive": {
      "command": "npx",
      "args": ["-y", "github:DuCReis/personal-archive-mcp"],
      "env": {
        "PERSONAL_ARCHIVE_API_KEY": "pa_xxxxxxxxxxxxx"
      }
    }
  }
}
```

That's it — only the API key is required. The server defaults to `https://vps-a9517071.vps.ovh.net`.

### 3. Restart Claude
The 53 tools appear automatically.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PERSONAL_ARCHIVE_API_KEY` | yes | — | API key starting with `pa_` |
| `PERSONAL_ARCHIVE_URL` | no | `https://vps-a9517071.vps.ovh.net` | Override to point at a different instance (self-hosted, local dev) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | no | — | Set to `0` only if your host uses a self-signed or mismatched cert |

## Tool catalog (48 tools)

### Boards & Groups (9)
`list_boards`, `get_board`, `get_board_summary`, `create_board`, `update_board`, `delete_board`, `create_group`, `update_group`, `delete_group`

### Items (9)
`create_item`, `bulk_create_items`, `get_item`, `update_item`, `bulk_update_items`, `delete_item` (archives), `restore_item`, `search_items` (server-side fulltext), `add_comment`

### Notes (5)
`list_notes`, `get_note`, `create_note`, `update_note`, `delete_note`

### Bookmarks (4)
`list_bookmarks`, `create_bookmark`, `update_bookmark`, `delete_bookmark`

### Archive Folders (6)
`list_archive_folders`, `create_archive_folder`, `update_archive_folder`, `delete_archive_folder`, `archive_item`, `list_archived_items`

### Item Templates (5)
`list_item_templates`, `create_item_template`, `update_item_template`, `delete_item_template`, `create_item_from_template`

### Automations (4)
`list_automations`, `create_automation`, `update_automation`, `delete_automation`

### Notifications (3)
`list_notifications`, `mark_notification_read`, `mark_all_notifications_read`

### Workspaces (3)
`list_workspaces`, `create_workspace`, `delete_workspace`

### Dashboard & Goals (5)
`get_dashboard`, `list_goals`, `create_goal`, `update_goal`, `delete_goal`

## Building from source

```bash
git clone https://github.com/DuCReis/personal-archive-mcp.git
cd personal-archive-mcp
npm install
npm run build
```

## Troubleshooting

**Tools don't appear in Claude**
Restart Claude after editing the config. Run manually to check for startup errors:
```bash
PERSONAL_ARCHIVE_URL=... PERSONAL_ARCHIVE_API_KEY=... node dist/index.js
```
The process should stay attached waiting for stdin (no output = healthy).

**"Invalid API key" errors**
Verify the key in Claude's config matches the one generated in Settings. API keys prefix with `pa_`.

**TLS / certificate errors**
Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in the env (dev/self-hosted only).

## License

MIT
