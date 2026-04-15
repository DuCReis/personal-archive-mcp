import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiCall, textResult } from '../api.js';

export function registerDashboardTools(server: McpServer) {
  server.tool(
    'get_dashboard',
    'Get dashboard overview: counts, recent items, activity, upcoming, overdue',
    {},
    async () => {
      const data = await apiCall('/dashboard');
      return textResult(data);
    }
  );
}
