import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerNoteTools(server: McpServer) {
  server.registerTool(
    'list_notes',
    {
      title: 'List Notes',
      description: 'List notes with optional title search. Supports pagination.',
      inputSchema: {
        search: z.string().optional().describe('Filter notes by title (case-insensitive)'),
        skip: z.number().int().min(0).optional().describe('Number of results to skip for pagination (default 0)'),
        take: z.number().int().min(1).max(200).optional().describe('Number of notes to return (default 50, max 200)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ search, skip, take }) => {
      const limit = Math.min(take ?? 50, 200);
      const offset = Math.max(skip ?? 0, 0);
      const data = await apiCall(`/notes?take=${limit}&skip=${offset}`) as {
        notes: Array<{ id: string; title: string; folder: string; updatedAt: string }>;
      };
      let notes = data.notes;
      if (search) {
        const lowerSearch = search.toLowerCase();
        notes = notes.filter((n) => n.title.toLowerCase().includes(lowerSearch));
      }
      return textResult({ count: notes.length, skip: offset, take: limit, notes });
    }
  );

  server.registerTool(
    'get_note',
    {
      title: 'Get Note',
      description: 'Get a single note with full content.',
      inputSchema: { noteId: z.string().describe('The note ID') },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ noteId }) => {
      const data = await apiCall(`/notes/${noteId}`) as {
        note: { id: string; title: string; content: string; folder: string; pinned: boolean; updatedAt: string };
      };
      return textResult(data.note);
    }
  );

  server.registerTool(
    'create_note',
    {
      title: 'Create Note',
      description: 'Create a new note with optional folder.',
      inputSchema: {
        title: z.string().describe('The note title'),
        content: z.string().describe('The note content (markdown supported)'),
        folder: z.string().optional().describe('Folder to put the note in'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, content, folder }) => {
      const body: Record<string, unknown> = { title, content };
      if (folder) body.folder = folder;
      const data = await apiCall('/notes', {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { note: { id: string; title: string } };
      return textResult({ message: `Created note "${title}"`, id: data.note?.id });
    }
  );

  server.registerTool(
    'update_note',
    {
      title: 'Update Note',
      description: 'Update an existing note (title, content, folder).',
      inputSchema: {
        noteId: z.string().describe('The note ID to update'),
        title: z.string().optional().describe('New title'),
        content: z.string().optional().describe('New content (markdown)'),
        folder: z.string().optional().describe('Move to this folder'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ noteId, title, content, folder }) => {
      const body: Record<string, unknown> = {};
      if (title !== undefined) body.title = title;
      if (content !== undefined) body.content = content;
      if (folder !== undefined) body.folder = folder;
      const data = await apiCall(`/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { note: { id: string; title: string } };
      return textResult({ message: `Updated note "${data.note?.title}"`, note: data.note });
    }
  );

  server.registerTool(
    'delete_note',
    {
      title: 'Delete Note',
      description: 'Delete a note permanently. This is irreversible.',
      inputSchema: { noteId: z.string().describe('The note ID to delete') },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ noteId }) => {
      await apiCall(`/notes/${noteId}`, { method: 'DELETE' });
      return textResult({ message: 'Note deleted' });
    }
  );
}
