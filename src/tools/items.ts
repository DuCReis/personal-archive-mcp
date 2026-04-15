import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerItemTools(server: McpServer) {
  server.tool(
    'create_item',
    'Create a new item in a board. Supports markdown description for detailed specs.',
    {
      boardId: z.string().describe('The board ID to create the item in'),
      title: z.string().describe('The item title'),
      description: z.string().optional().describe('Markdown description with specs, acceptance criteria, and context'),
      groupId: z.string().optional().describe('The group ID (uses first group if omitted)'),
      status: z.string().optional().describe('Status value to set'),
      priority: z.string().optional().describe('Priority: low, medium, high, urgent'),
      tags: z.array(z.string()).optional().describe('Tags to set (convenience — auto-maps to the tags column)'),
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

  server.tool(
    'bulk_create_items',
    'Create multiple items in a board at once. Fetches the board once, then creates items sequentially.',
    {
      boardId: z.string().describe('The board ID to create items in'),
      groupId: z.string().optional().describe('The group ID (uses first group if omitted)'),
      items: z.array(z.object({
        title: z.string().describe('The item title'),
        description: z.string().optional().describe('Markdown description'),
        status: z.string().optional().describe('Status value to set'),
        priority: z.string().optional().describe('Priority: low, medium, high, urgent'),
        tags: z.array(z.string()).optional().describe('Tags to set'),
      })).describe('Array of items to create'),
    },
    async ({ boardId, groupId, items }) => {
      const boardData = await apiCall(`/boards/${boardId}`) as {
        board: {
          groups: Array<{ id: string }>;
          columns: Array<{ id: string; type: string }>;
        };
      };
      const board = boardData.board;

      const gid = groupId || board.groups[0]?.id;
      if (!gid) throw new Error('Board has no groups — create a group first');

      const statusCol = board.columns.find((c) => c.type === 'status');
      const prioCol = board.columns.find((c) => c.type === 'priority');
      const tagsCol = board.columns.find((c) => c.type === 'tags');

      const created: Array<{ id: string; title: string }> = [];

      for (const item of items) {
        const values: Record<string, unknown> = {};
        if (item.status && statusCol) values[statusCol.id] = item.status;
        if (item.priority && prioCol) values[prioCol.id] = item.priority;
        if (item.tags && tagsCol) values[tagsCol.id] = item.tags;

        const body: Record<string, unknown> = { title: item.title, boardId, groupId: gid, values };
        if (item.description) body.description = item.description;

        const data = await apiCall('/items', {
          method: 'POST',
          body: JSON.stringify(body),
        }) as { item: { id: string; title: string } };

        created.push({ id: data.item?.id, title: item.title });
      }

      return textResult({
        message: `Created ${created.length} item(s)`,
        count: created.length,
        items: created,
      });
    }
  );

  server.tool(
    'get_item',
    'Get a single item with subitems, comments, and activity',
    { itemId: z.string().describe('The item ID') },
    async ({ itemId }) => {
      const data = await apiCall(`/items/${itemId}`) as { item: unknown };
      return textResult(data.item);
    }
  );

  server.tool(
    'update_item',
    'Update an existing item (title, description, values, group)',
    {
      itemId: z.string().describe('The item ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().nullable().optional().describe('Markdown description (set to null to clear)'),
      groupId: z.string().optional().describe('Move to this group'),
      values: z.record(z.unknown()).optional().describe('Column values to set (columnId -> value)'),
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

  server.tool(
    'delete_item',
    'Archive an item (soft delete). The item can be restored later via restore_item.',
    { itemId: z.string().describe('The item ID to archive') },
    async ({ itemId }) => {
      await apiCall(`/items/${itemId}`, { method: 'DELETE' });
      return textResult({ message: 'Item archived' });
    }
  );

  server.tool(
    'restore_item',
    'Restore a previously archived item',
    { itemId: z.string().describe('The item ID to restore') },
    async ({ itemId }) => {
      const data = await apiCall(`/items/${itemId}/restore`, {
        method: 'POST',
      }) as { item: { id: string; title: string } };
      return textResult({ message: `Item "${data.item?.title}" restored`, item: data.item });
    }
  );

  server.tool(
    'add_comment',
    'Add a comment to an item',
    {
      itemId: z.string().describe('The item ID'),
      content: z.string().describe('Comment content (markdown supported)'),
    },
    async ({ itemId, content }) => {
      const data = await apiCall(`/items/${itemId}/updates`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }) as { update: { id: string } };
      return textResult({ message: 'Comment added', id: data.update?.id });
    }
  );

  server.tool(
    'bulk_update_items',
    'Update multiple items at once (status, priority, group, values). Useful for batch operations.',
    {
      itemIds: z.array(z.string()).describe('Array of item IDs to update'),
      status: z.string().optional().describe('Set status on all items'),
      priority: z.string().optional().describe('Set priority on all items'),
      groupId: z.string().optional().describe('Move all items to this group'),
      values: z.record(z.unknown()).optional().describe('Raw column values to set (columnId -> value)'),
      boardId: z.string().optional().describe('Board ID — required when using status/priority convenience params to resolve column IDs'),
    },
    async ({ itemIds, status, priority, groupId, values, boardId }) => {
      let resolvedValues: Record<string, unknown> = values ? { ...values } : {};

      if ((status || priority) && boardId) {
        const boardData = await apiCall(`/boards/${boardId}`) as {
          board: { columns: Array<{ id: string; type: string }> };
        };
        const cols = boardData.board.columns;
        if (status) {
          const statusCol = cols.find((c) => c.type === 'status');
          if (statusCol) resolvedValues[statusCol.id] = status;
        }
        if (priority) {
          const prioCol = cols.find((c) => c.type === 'priority');
          if (prioCol) resolvedValues[prioCol.id] = priority;
        }
      }

      const updated: Array<{ id: string; title: string }> = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const itemId of itemIds) {
        try {
          const body: Record<string, unknown> = {};
          if (groupId) body.groupId = groupId;
          if (Object.keys(resolvedValues).length > 0) body.values = resolvedValues;

          const data = await apiCall(`/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }) as { item: { id: string; title: string } };
          updated.push({ id: data.item?.id, title: data.item?.title });
        } catch (err) {
          errors.push({ id: itemId, error: String(err) });
        }
      }

      return textResult({
        message: `Updated ${updated.length}/${itemIds.length} item(s)`,
        updated: updated.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  );

  server.tool(
    'search_items',
    'Search items by title or description across all boards (server-side, fast)',
    {
      query: z.string().describe('Search query to match against item titles and descriptions'),
      boardId: z.string().optional().describe('Limit search to a specific board'),
    },
    async ({ query, boardId }) => {
      const params = new URLSearchParams({ q: query, take: '50' });
      if (boardId) params.set('boardId', boardId);

      const data = await apiCall(`/items/search?${params}`) as {
        items: Array<{
          id: string;
          title: string;
          description: string | null;
          groupId: string;
          board: { id: string; name: string; color: string | null };
        }>;
        total: number;
        skip: number;
        take: number;
      };

      const results = data.items.map((item) => ({
        itemId: item.id,
        title: item.title,
        description: item.description,
        boardId: item.board.id,
        boardName: item.board.name,
        groupId: item.groupId,
      }));

      return textResult({ query, count: results.length, total: data.total, results });
    }
  );
}
