import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerBoardTools(server: McpServer) {
  server.tool(
    'list_boards',
    'List all boards with item counts and group counts',
    {},
    async () => {
      const data = await apiCall('/boards') as { boards: unknown[] };
      return textResult(data.boards);
    }
  );

  server.tool(
    'get_board',
    'Get a board with all its items, groups, and columns',
    { boardId: z.string().describe('The board ID') },
    async ({ boardId }) => {
      const data = await apiCall(`/boards/${boardId}`) as { board: unknown };
      return textResult(data.board);
    }
  );

  server.tool(
    'create_board',
    'Create a new board',
    {
      name: z.string().describe('Board name'),
      description: z.string().optional().describe('Board description'),
      color: z.string().optional().describe('Board color hex (e.g. #7170ff)'),
      columns: z.array(z.object({
        id: z.string(),
        type: z.string().describe('Column type: status|date|priority|tags|number|text|checkbox|person|url|rating|progress'),
        title: z.string(),
        options: z.array(z.object({ label: z.string(), color: z.string() })).optional(),
      })).optional().describe('Column definitions'),
      groups: z.array(z.object({
        name: z.string().describe('Group name'),
        color: z.string().optional().describe('Group color hex'),
      })).optional().describe('Initial groups to create with the board'),
    },
    async ({ name, description, color, columns, groups }) => {
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      if (color) body.color = color;
      if (columns) body.columns = columns;
      const data = await apiCall('/boards', {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { board: { id: string; name: string } };
      const boardId = data.board?.id;

      // Create initial groups if provided
      const createdGroups: Array<{ id: string; name: string }> = [];
      if (groups && boardId) {
        for (const g of groups) {
          const gBody: Record<string, unknown> = { name: g.name };
          if (g.color) gBody.color = g.color;
          const gData = await apiCall(`/boards/${boardId}/groups`, {
            method: 'POST',
            body: JSON.stringify(gBody),
          }) as { group: { id: string; name: string } };
          createdGroups.push({ id: gData.group?.id, name: gData.group?.name });
        }
      }

      return textResult({
        message: `Created board "${name}"${createdGroups.length ? ` with ${createdGroups.length} group(s)` : ''}`,
        id: boardId,
        groups: createdGroups.length ? createdGroups : undefined,
      });
    }
  );

  server.tool(
    'update_board',
    'Update a board (name, description, color, columns, tags)',
    {
      boardId: z.string().describe('The board ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      color: z.string().optional().describe('New color hex'),
      tags: z.array(z.string()).optional().describe('Board-level tags'),
    },
    async ({ boardId, name, description, color, tags }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (description) body.description = description;
      if (color) body.color = color;
      if (tags) body.tags = tags;
      const data = await apiCall(`/boards/${boardId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { board: { id: string; name: string } };
      return textResult({ message: `Updated board "${data.board?.name}"`, board: data.board });
    }
  );

  server.tool(
    'delete_board',
    'Delete a board and all its items',
    { boardId: z.string().describe('The board ID to delete') },
    async ({ boardId }) => {
      await apiCall(`/boards/${boardId}`, { method: 'DELETE' });
      return textResult({ message: 'Board deleted' });
    }
  );

  // --- Group Tools ---

  server.tool(
    'create_group',
    'Create a new group in a board',
    {
      boardId: z.string().describe('The board ID'),
      name: z.string().describe('Group name'),
      color: z.string().optional().describe('Group color hex'),
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

  server.tool(
    'update_group',
    'Update a group (name, color, position)',
    {
      boardId: z.string().describe('The board ID'),
      groupId: z.string().describe('The group ID'),
      name: z.string().optional().describe('New name'),
      color: z.string().optional().describe('New color hex'),
      position: z.number().optional().describe('New position index'),
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

  server.tool(
    'delete_group',
    'Delete a group from a board',
    {
      boardId: z.string().describe('The board ID'),
      groupId: z.string().describe('The group ID to delete'),
    },
    async ({ boardId, groupId }) => {
      await apiCall(`/boards/${boardId}/groups/${groupId}`, { method: 'DELETE' });
      return textResult({ message: 'Group deleted' });
    }
  );

  // --- Summary Tool ---

  server.tool(
    'get_board_summary',
    'Get a compact overview of a board: item counts by status, group, and priority — without full item details',
    { boardId: z.string().describe('The board ID') },
    async ({ boardId }) => {
      const data = await apiCall(`/boards/${boardId}`) as {
        board: {
          id: string;
          name: string;
          description?: string;
          color: string;
          columns: Array<{ id: string; type: string; title: string; options?: Array<{ label: string; color: string }> }>;
          groups: Array<{ id: string; name: string; color: string }>;
          items: Array<{ id: string; title: string; groupId: string; values: Record<string, unknown> }>;
        };
      };
      const board = data.board;

      const statusCol = board.columns.find((c) => c.type === 'status');
      const priorityCol = board.columns.find((c) => c.type === 'priority');

      // Build group lookup
      const groupMap = new Map(board.groups.map((g) => [g.id, g.name]));

      // Count by status
      const byStatus: Record<string, number> = {};
      // Count by group
      const byGroup: Record<string, number> = {};
      // Count by priority
      const byPriority: Record<string, number> = {};

      for (const item of board.items) {
        // Status
        const status = statusCol ? (item.values[statusCol.id] as string) || 'unset' : 'no_status_column';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Group
        const groupName = groupMap.get(item.groupId) || 'unknown';
        byGroup[groupName] = (byGroup[groupName] || 0) + 1;

        // Priority
        const priority = priorityCol ? (item.values[priorityCol.id] as string) || 'unset' : 'no_priority_column';
        byPriority[priority] = (byPriority[priority] || 0) + 1;
      }

      return textResult({
        id: board.id,
        name: board.name,
        description: board.description,
        totalItems: board.items.length,
        totalGroups: board.groups.length,
        groups: board.groups.map((g) => ({ id: g.id, name: g.name, itemCount: byGroup[g.name] || 0 })),
        byStatus,
        byPriority,
      });
    }
  );
}
