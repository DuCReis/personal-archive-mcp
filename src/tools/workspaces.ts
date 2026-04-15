import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerWorkspaceTools(server: McpServer) {
  server.tool(
    'list_workspaces',
    'List all workspaces the user belongs to',
    {},
    async () => {
      const data = await apiCall('/workspaces') as {
        workspaces: Array<{ id: string; name: string; slug: string; role?: string }>;
      };
      return textResult({ count: data.workspaces.length, workspaces: data.workspaces });
    }
  );

  server.tool(
    'create_workspace',
    'Create a new workspace (you become the owner)',
    {
      name: z.string().describe('Workspace display name'),
      slug: z.string().describe('URL-safe slug (lowercase, no spaces)'),
    },
    async ({ name, slug }) => {
      const data = await apiCall('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      }) as { workspace: { id: string; name: string } };
      return textResult({ message: `Created workspace "${name}"`, id: data.workspace?.id });
    }
  );

  server.tool(
    'delete_workspace',
    'Delete a workspace (must be owner)',
    {
      workspaceId: z.string().describe('The workspace ID'),
    },
    async ({ workspaceId }) => {
      await apiCall(`/workspaces/${workspaceId}`, { method: 'DELETE' });
      return textResult({ message: 'Workspace deleted' });
    }
  );
}
