import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerArchiveTools(server: McpServer) {
  server.tool(
    'list_archive_folders',
    'List archive folders (optionally filtered by board). Each folder includes its item count.',
    {
      boardId: z.string().optional().describe('Only list folders for this board'),
    },
    async ({ boardId }) => {
      const qs = boardId ? `?boardId=${boardId}` : '';
      const data = await apiCall(`/archive-folders${qs}`) as { folders: unknown[] };
      return textResult(data.folders);
    },
  );

  server.tool(
    'create_archive_folder',
    'Create a new archive folder for organizing archived items.',
    {
      name: z.string().describe('Folder name'),
      color: z.string().optional().describe('Folder color hex (e.g. #7170ff)'),
      description: z.string().optional().describe('Optional description'),
      boardId: z.string().optional().describe('Scope to a specific board (omit for global folder)'),
    },
    async ({ name, color, description, boardId }) => {
      const body: Record<string, unknown> = { name };
      if (color) body.color = color;
      if (description) body.description = description;
      if (boardId) body.boardId = boardId;
      const data = await apiCall(`/archive-folders`, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { folder: { id: string; name: string } };
      return textResult({ message: `Created archive folder "${name}"`, id: data.folder?.id });
    },
  );

  server.tool(
    'update_archive_folder',
    'Update an archive folder (name, color, description).',
    {
      folderId: z.string().describe('Folder ID'),
      name: z.string().optional().describe('New name'),
      color: z.string().optional().describe('New color hex'),
      description: z.string().optional().describe('New description'),
    },
    async ({ folderId, name, color, description }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (color) body.color = color;
      if (description !== undefined) body.description = description;
      const data = await apiCall(`/archive-folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { folder: { id: string; name: string } };
      return textResult({ message: `Updated folder "${data.folder?.name}"`, folder: data.folder });
    },
  );

  server.tool(
    'delete_archive_folder',
    'Delete an archive folder. Optionally move its items to another folder.',
    {
      folderId: z.string().describe('Folder ID to delete'),
      moveTo: z.string().optional().describe('Move items to this folder ID (otherwise items become unfiled)'),
    },
    async ({ folderId, moveTo }) => {
      const qs = moveTo ? `?move=${moveTo}` : '';
      await apiCall(`/archive-folders/${folderId}${qs}`, { method: 'DELETE' });
      return textResult({ message: 'Archive folder deleted' });
    },
  );

  server.tool(
    'archive_item',
    'Archive an item (soft delete) and optionally place it into an archive folder.',
    {
      itemId: z.string().describe('Item ID to archive'),
      folderId: z.string().optional().describe('Target archive folder (omit for "no folder")'),
    },
    async ({ itemId, folderId }) => {
      const body: Record<string, unknown> = {};
      if (folderId) body.folderId = folderId;
      await apiCall(`/items/${itemId}/archive`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return textResult({ message: 'Item archived', folderId: folderId ?? null });
    },
  );

  server.tool(
    'list_archived_items',
    'List archived items, optionally filtered by board and/or folder.',
    {
      boardId: z.string().optional().describe('Only return items from this board'),
      folderId: z.string().optional().describe('Only return items in this folder (use "none" for items with no folder)'),
    },
    async ({ boardId, folderId }) => {
      const params = new URLSearchParams();
      if (boardId) params.set('boardId', boardId);
      if (folderId) params.set('folderId', folderId);
      const qs = params.toString();
      const data = await apiCall(`/items/archived${qs ? `?${qs}` : ''}`) as { items: unknown[] };
      return textResult(data.items);
    },
  );
}
