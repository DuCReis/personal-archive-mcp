import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

/**
 * Bulk and search tools for items. Split from items.ts to keep each
 * tool module under the 300-line project cap.
 */
export function registerItemBulkTools(server: McpServer) {
  server.registerTool(
    'bulk_create_items',
    {
      title: 'Bulk Create Items',
      description: 'Create multiple items in a board at once. Fetches the board once, then creates items sequentially.',
      inputSchema: {
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
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

  server.registerTool(
    'bulk_update_items',
    {
      title: 'Bulk Update Items',
      description: 'Update multiple items at once (status, priority, group, values). Useful for batch operations.',
      inputSchema: {
        itemIds: z.array(z.string()).describe('Array of item IDs to update'),
        status: z.string().optional().describe('Set status on all items'),
        priority: z.string().optional().describe('Set priority on all items'),
        groupId: z.string().optional().describe('Move all items to this group'),
        values: z.record(z.unknown()).optional().describe('Raw column values to set (columnId -> value)'),
        boardId: z.string().optional().describe('Board ID — required when using status/priority convenience params to resolve column IDs'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ itemIds, status, priority, groupId, values, boardId }) => {
      const resolvedValues: Record<string, unknown> = values ? { ...values } : {};

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

  server.registerTool(
    'search_items',
    {
      title: 'Search Items',
      description: 'Search items by title or description across all boards (server-side, fast). Supports pagination.',
      inputSchema: {
        query: z.string().describe('Search query to match against item titles and descriptions'),
        boardId: z.string().optional().describe('Limit search to a specific board'),
        skip: z.number().int().min(0).optional().describe('Number of results to skip for pagination (default 0)'),
        take: z.number().int().min(1).max(200).optional().describe('Max results to return (default 50, max 200)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, boardId, skip, take }) => {
      const limit = Math.min(take ?? 50, 200);
      const offset = Math.max(skip ?? 0, 0);
      const params = new URLSearchParams({ q: query, take: String(limit), skip: String(offset) });
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

      return textResult({
        query,
        count: results.length,
        total: data.total,
        skip: data.skip,
        take: data.take,
        results,
      });
    }
  );
}
