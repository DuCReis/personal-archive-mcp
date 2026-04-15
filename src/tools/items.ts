import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerItemTools(server: McpServer) {
  server.registerTool(
    'create_item',
    {
      title: 'Create Item',
      description: 'Create a new item in a board. Supports markdown description for detailed specs.',
      inputSchema: {
        boardId: z.string().describe('The board ID to create the item in'),
        title: z.string().describe('The item title'),
        description: z.string().optional().describe('Markdown description with specs, acceptance criteria, and context'),
        groupId: z.string().optional().describe('The group ID (uses first group if omitted)'),
        status: z.string().optional().describe('Status value to set'),
        priority: z.string().optional().describe('Priority: low, medium, high, urgent'),
        tags: z.array(z.string()).optional().describe('Tags to set (convenience — auto-maps to the tags column)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ boardId, title, description, groupId, status, priority, tags }) => {
      const boardData = await apiCall(`/boards/${boardId}`) as {
        board: {
          groups: Array<{ id: string }>;
          columns: Array<{ id: string; type: string }>;
        };
      };
      const board = boardData.board;

      const gid = groupId || board.groups[0]?.id;
      if (!gid) throw new Error('Board has no groups — create a group first');

      const values: Record<string, unknown> = {};
      if (status) {
        const statusCol = board.columns.find((c) => c.type === 'status');
        if (statusCol) values[statusCol.id] = status;
      }
      if (priority) {
        const prioCol = board.columns.find((c) => c.type === 'priority');
        if (prioCol) values[prioCol.id] = priority;
      }
      if (tags) {
        const tagsCol = board.columns.find((c) => c.type === 'tags');
        if (tagsCol) values[tagsCol.id] = tags;
      }

      const body: Record<string, unknown> = { title, boardId, groupId: gid, values };
      if (description) body.description = description;

      const data = await apiCall('/items', {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { item: { id: string } };
      return textResult({ message: `Created item "${title}"`, id: data.item?.id });
    }
  );

  server.registerTool(
    'get_item',
    {
      title: 'Get Item',
      description: 'Get a single item with subitems, comments, and activity.',
      inputSchema: { itemId: z.string().describe('The item ID') },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ itemId }) => {
      const data = await apiCall(`/items/${itemId}`) as { item: unknown };
      return textResult(data.item);
    }
  );

  server.registerTool(
    'update_item',
    {
      title: 'Update Item',
      description: 'Update an existing item (title, description, values, group).',
      inputSchema: {
        itemId: z.string().describe('The item ID to update'),
        title: z.string().optional().describe('New title'),
        description: z.string().nullable().optional().describe('Markdown description (set to null to clear)'),
        groupId: z.string().optional().describe('Move to this group'),
        values: z.record(z.unknown()).optional().describe('Column values to set (columnId -> value)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ itemId, title, description, groupId, values }) => {
      const body: Record<string, unknown> = {};
      if (title) body.title = title;
      if (description !== undefined) body.description = description;
      if (groupId) body.groupId = groupId;
      if (values) body.values = values;
      const data = await apiCall(`/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { item: { id: string; title: string } };
      return textResult({ message: `Updated item "${data.item?.title}"`, item: data.item });
    }
  );

  server.registerTool(
    'delete_item',
    {
      title: 'Delete Item',
      description: 'Archive an item (soft delete). The item can be restored later via restore_item.',
      inputSchema: { itemId: z.string().describe('The item ID to archive') },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ itemId }) => {
      await apiCall(`/items/${itemId}`, { method: 'DELETE' });
      return textResult({ message: 'Item archived' });
    }
  );

  server.registerTool(
    'restore_item',
    {
      title: 'Restore Item',
      description: 'Restore a previously archived item.',
      inputSchema: { itemId: z.string().describe('The item ID to restore') },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ itemId }) => {
      const data = await apiCall(`/items/${itemId}/restore`, {
        method: 'POST',
      }) as { item: { id: string; title: string } };
      return textResult({ message: `Item "${data.item?.title}" restored`, item: data.item });
    }
  );

  server.registerTool(
    'add_comment',
    {
      title: 'Add Comment',
      description: 'Add a comment to an item.',
      inputSchema: {
        itemId: z.string().describe('The item ID'),
        content: z.string().describe('Comment content (markdown supported)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ itemId, content }) => {
      const data = await apiCall(`/items/${itemId}/updates`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }) as { update: { id: string } };
      return textResult({ message: 'Comment added', id: data.update?.id });
    }
  );

}
