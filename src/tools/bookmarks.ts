import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerBookmarkTools(server: McpServer) {
  server.tool(
    'list_bookmarks',
    'List bookmarks with optional tag filter',
    {
      tag: z.string().optional().describe('Filter bookmarks by this tag'),
      take: z.number().optional().describe('Number of bookmarks to return (default 50, max 200)'),
    },
    async ({ tag, take }) => {
      const limit = Math.min(take || 50, 200);
      const data = await apiCall(`/bookmarks?take=${limit}`) as {
        bookmarks: Array<{ id: string; title: string; url: string; tags: string[] }>;
      };
      let bookmarks = data.bookmarks;
      if (tag) {
        const lowerTag = tag.toLowerCase();
        bookmarks = bookmarks.filter((b) =>
          b.tags.some((t) => t.toLowerCase().includes(lowerTag))
        );
      }
      return textResult(bookmarks);
    }
  );

  server.tool(
    'create_bookmark',
    'Save a new bookmark',
    {
      url: z.string().describe('The bookmark URL'),
      title: z.string().optional().describe('The bookmark title (auto-detected if omitted)'),
      tags: z.array(z.string()).optional().describe('Tags for the bookmark'),
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

  server.tool(
    'update_bookmark',
    'Update an existing bookmark',
    {
      bookmarkId: z.string().describe('The bookmark ID'),
      title: z.string().optional().describe('New title'),
      url: z.string().optional().describe('New URL'),
      tags: z.array(z.string()).optional().describe('New tags (replaces all)'),
      description: z.string().optional().describe('New description'),
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

  server.tool(
    'delete_bookmark',
    'Delete a bookmark',
    { bookmarkId: z.string().describe('The bookmark ID to delete') },
    async ({ bookmarkId }) => {
      await apiCall(`/bookmarks/${bookmarkId}`, { method: 'DELETE' });
      return textResult({ message: 'Bookmark deleted' });
    }
  );
}
