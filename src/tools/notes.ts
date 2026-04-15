import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerNoteTools(server: McpServer) {
  server.tool(
    'list_notes',
    'List notes with optional search by title',
    {
      search: z.string().optional().describe('Filter notes by title (case-insensitive)'),
      take: z.number().optional().describe('Number of notes to return (default 50, max 200)'),
    },
    async ({ search, take }) => {
      const limit = Math.min(take || 50, 200);
      const data = await apiCall(`/notes?take=${limit}`) as { notes: Array<{ id: string; title: string; folder: string; updatedAt: string }> };
      let notes = data.notes;
      if (search) {
        const lowerSearch = search.toLowerCase();
        notes = notes.filter((n) => n.title.toLowerCase().includes(lowerSearch));
      }
      return textResult(notes);
    }
  );

  server.tool(
    'get_note',
    'Get a single note with full content',
    { noteId: z.string().describe('The note ID') },
    async ({ noteId }) => {
      const data = await apiCall(`/notes/${noteId}`) as { note: { id: string; title: string; content: string; folder: string; pinned: boolean; updatedAt: string } };
      return textResult(data.note);
    }
  );

  server.tool(
    'create_note',
    'Create a new note',
    {
      title: z.string().describe('The note title'),
      content: z.string().describe('The note content (markdown supported)'),
      folder: z.string().optional().describe('Folder to put the note in'),
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

  server.tool(
    'update_note',
    'Update an existing note',
    {
      noteId: z.string().describe('The note ID to update'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content (markdown)'),
      folder: z.string().optional().describe('Move to this folder'),
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

  server.tool(
    'delete_note',
    'Delete a note',
    { noteId: z.string().describe('The note ID to delete') },
    async ({ noteId }) => {
      await apiCall(`/notes/${noteId}`, { method: 'DELETE' });
      return textResult({ message: 'Note deleted' });
    }
  );
}
