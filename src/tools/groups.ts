import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerGroupTools(server: McpServer) {
  server.registerTool(
    'create_group',
    {
      title: 'Create Group',
      description: 'Create a new group in a board.',
      inputSchema: {
        boardId: z.string().describe('The board ID'),
        name: z.string().describe('Group name'),
        color: z.string().optional().describe('Group color hex'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ boardId, name, color }) => {
      const body: Record<string, unknown> = { name };
      if (color) body.color = color;
      const data = await apiCall(`/boards/${boardId}/groups`, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { group: { id: string; name: string } };
      return textResult({ message: `Created group "${name}"`, id: data.group?.id });
    }
  );

  server.registerTool(
    'update_group',
    {
      title: 'Update Group',
      description: 'Update a group (name, color, position).',
      inputSchema: {
        boardId: z.string().describe('The board ID'),
        groupId: z.string().describe('The group ID'),
        name: z.string().optional().describe('New name'),
        color: z.string().optional().describe('New color hex'),
        position: z.number().optional().describe('New position index'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ boardId, groupId, name, color, position }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (color) body.color = color;
      if (position !== undefined) body.position = position;
      const data = await apiCall(`/boards/${boardId}/groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { group: { id: string; name: string } };
      return textResult({ message: `Updated group "${data.group?.name}"`, group: data.group });
    }
  );

  server.registerTool(
    'delete_group',
    {
      title: 'Delete Group',
      description: 'Delete a group from a board. Items in the group will be moved to the default group.',
      inputSchema: {
        boardId: z.string().describe('The board ID'),
        groupId: z.string().describe('The group ID to delete'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ boardId, groupId }) => {
      await apiCall(`/boards/${boardId}/groups/${groupId}`, { method: 'DELETE' });
      return textResult({ message: 'Group deleted' });
    }
  );
}
