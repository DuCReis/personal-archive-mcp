#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBoardTools } from './tools/boards.js';
import { registerGroupTools } from './tools/groups.js';
import { registerItemTools } from './tools/items.js';
import { registerItemBulkTools } from './tools/itemsBulk.js';
import { registerNoteTools } from './tools/notes.js';
import { registerBookmarkTools } from './tools/bookmarks.js';
import { registerDashboardTools } from './tools/dashboard.js';
import { registerGoalTools } from './tools/goals.js';
import { registerAutomationTools } from './tools/automations.js';
import { registerNotificationTools } from './tools/notifications.js';
import { registerWorkspaceTools } from './tools/workspaces.js';
import { registerArchiveTools } from './tools/archive.js';
import { registerTemplateTools } from './tools/templates.js';

const server = new McpServer({
  name: 'personal-archive',
  version: '2.1.0',
});

registerBoardTools(server);
registerGroupTools(server);
registerItemTools(server);
registerItemBulkTools(server);
registerNoteTools(server);
registerBookmarkTools(server);
registerDashboardTools(server);
registerGoalTools(server);
registerAutomationTools(server);
registerNotificationTools(server);
registerWorkspaceTools(server);
registerArchiveTools(server);
registerTemplateTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
