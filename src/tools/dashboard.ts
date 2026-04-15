import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiCall, textResult } from '../api.js';

export function registerDashboardTools(server: McpServer) {
  server.registerTool(
    'get_dashboard',
    {
      title: 'Get Dashboard',
      description: 'Get dashboard overview: counts, recent items, activity, upcoming, overdue.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const data = await apiCall('/dashboard');
      return textResult(data);
    }
  );
}
