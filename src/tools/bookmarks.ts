import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerBookmarkTools(server: McpServer) {
  server.registerTool(
    'list_bookmarks',
    {
      title: 'List Bookmarks',
      description: 'List bookmarks with optional tag filter. Supports pagination.',
      inputSchema: {
        tag: z.string().optional().describe('Filter bookmarks by this tag'),
        skip: z.number().int().min(0).optional().describe('Number of results to skip for pagination (default 0)'),
        take: z.number().int().min(1).max(200).optional().describe('Number of bookmarks to return (default 50, max 200)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ tag, skip, take }) => {
      const limit = Math.min(take ?? 50, 200);
      const offset = Math.max(skip ?? 0, 0);
      const data = await apiCall(`/bookmarks?take=${limit}&skip=${offset}`) as {
        bookmarks: Array<{ id: string; title: string; url: string; tags: string[] }>;
      };
      let bookmarks = data.bookmarks;
      if (tag) {
        const lowerTag = tag.toLowerCase();
        bookmarks = bookmarks.filter((b) =>
          b.tags.some((t) => t.toLowerCase().includes(lowerTag))
        );
      }
      return textResult({ count: bookmarks.length, skip: offset, take: limit, bookmarks });
    }
  );

  server.registerTool(
    'create_bookmark',
    {
      title: 'Create Bookmark',
      description: 'Save a new bookmark.',
      inputSchema: {
        url: z.string().describe('The bookmark URL'),
        title: z.string().optional().describe('The bookmark title (auto-detected if omitted)'),
        tags: z.array(z.string()).optional().describe('Tags for the bookmark'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ url, title, tags }) => {
      const body: Record<string, unknown> = { url, title: title || url };
      if (tags) body.tags = tags;
      const data = await apiCall('/bookmarks', {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { bookmark: { id: string; title: string } };
      return textResult({ message: `Saved bookmark "${data.bookmark?.title}"`, id: data.bookmark?.id });
    }
  );

  server.registerTool(
    'update_bookmark',
    {
      title: 'Update Bookmark',
      description: 'Update an existing bookmark.',
      inputSchema: {
        bookmarkId: z.string().describe('The bookmark ID'),
        title: z.string().optional().describe('New title'),
        url: z.string().optional().describe('New URL'),
        tags: z.array(z.string()).optional().describe('New tags (replaces all)'),
        description: z.string().optional().describe('New description'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ bookmarkId, title, url, tags, description }) => {
      const body: Record<string, unknown> = {};
      if (title) body.title = title;
      if (url) body.url = url;
      if (tags) body.tags = tags;
      if (description) body.description = description;
      const data = await apiCall(`/bookmarks/${bookmarkId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { bookmark: { id: string; title: string } };
      return textResult({ message: `Updated bookmark "${data.bookmark?.title}"`, bookmark: data.bookmark });
    }
  );

  server.registerTool(
    'delete_bookmark',
    {
      title: 'Delete Bookmark',
      description: 'Delete a bookmark permanently. This is irreversible.',
      inputSchema: { bookmarkId: z.string().describe('The bookmark ID to delete') },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ bookmarkId }) => {
      await apiCall(`/bookmarks/${bookmarkId}`, { method: 'DELETE' });
      return textResult({ message: 'Bookmark deleted' });
    }
  );
}
