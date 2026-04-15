import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerWorkspaceTools(server: McpServer) {
  server.registerTool(
    'list_workspaces',
    {
      title: 'List Workspaces',
      description: 'List all workspaces the user belongs to.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const data = await apiCall('/workspaces') as {
        workspaces: Array<{ id: string; name: string; slug: string; role?: string }>;
      };
      return textResult({ count: data.workspaces.length, workspaces: data.workspaces });
    }
  );

  server.registerTool(
    'create_workspace',
    {
      title: 'Create Workspace',
      description: 'Create a new workspace (you become the owner).',
      inputSchema: {
        name: z.string().describe('Workspace display name'),
        slug: z.string().describe('URL-safe slug (lowercase, no spaces)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, slug }) => {
      const data = await apiCall('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      }) as { workspace: { id: string; name: string } };
      return textResult({ message: `Created workspace "${name}"`, id: data.workspace?.id });
    }
  );

  server.registerTool(
    'delete_workspace',
    {
      title: 'Delete Workspace',
      description: 'Delete a workspace (must be owner). This is irreversible and removes all contained data.',
      inputSchema: {
        workspaceId: z.string().describe('The workspace ID'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ workspaceId }) => {
      await apiCall(`/workspaces/${workspaceId}`, { method: 'DELETE' });
      return textResult({ message: 'Workspace deleted' });
    }
  );
}
