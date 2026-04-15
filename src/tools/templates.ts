import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerTemplateTools(server: McpServer) {
  server.tool(
    'list_item_templates',
    'List item templates, optionally filtered by board.',
    {
      boardId: z.string().optional().describe('Only list templates for this board'),
    },
    async ({ boardId }) => {
      const qs = boardId ? `?boardId=${boardId}` : '';
      const data = await apiCall(`/item-templates${qs}`) as { templates: unknown[] };
      return textResult(data.templates);
    },
  );

  server.tool(
    'create_item_template',
    'Create a new item template (reusable item scaffold) with optional subitems.',
    {
      name: z.string().describe('Template name (how it shows in the dropdown)'),
      title: z.string().describe('Default item title when applied'),
      description: z.string().optional().describe('Markdown description pre-filled on items'),
      subitems: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
      })).optional().describe('Optional subitems to create with each item'),
      boardId: z.string().optional().describe('Scope to a specific board (omit for global template)'),
    },
    async ({ name, title, description, subitems, boardId }) => {
      const body: Record<string, unknown> = { name, title };
      if (description) body.description = description;
      if (subitems) body.subitems = subitems;
      if (boardId) body.boardId = boardId;
      const data = await apiCall(`/item-templates`, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { template: { id: string; name: string } };
      return textResult({ message: `Created template "${name}"`, id: data.template?.id });
    },
  );

  server.tool(
    'update_item_template',
    'Update an existing item template.',
    {
      templateId: z.string().describe('Template ID to update'),
      name: z.string().optional().describe('New template name'),
      title: z.string().optional().describe('New default title'),
      description: z.string().nullable().optional().describe('New description (null to clear)'),
      subitems: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
      })).optional().describe('Replacement subitem list'),
    },
    async ({ templateId, name, title, description, subitems }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (title) body.title = title;
      if (description !== undefined) body.description = description;
      if (subitems) body.subitems = subitems;
      const data = await apiCall(`/item-templates/${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { template: { id: string; name: string } };
      return textResult({ message: `Updated template "${data.template?.name}"`, template: data.template });
    },
  );

  server.tool(
    'delete_item_template',
    'Delete an item template.',
    { templateId: z.string().describe('Template ID to delete') },
    async ({ templateId }) => {
      await apiCall(`/item-templates/${templateId}`, { method: 'DELETE' });
      return textResult({ message: 'Template deleted' });
    },
  );

  server.tool(
    'create_item_from_template',
    'Create a new item in a board/group from an existing template, with optional overrides.',
    {
      templateId: z.string().describe('Template ID to instantiate'),
      boardId: z.string().describe('Target board ID'),
      groupId: z.string().describe('Target group ID'),
      overrides: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      }).optional().describe('Optional overrides for the new item'),
    },
    async ({ templateId, boardId, groupId, overrides }) => {
      const body: Record<string, unknown> = { templateId, boardId, groupId };
      if (overrides) body.overrides = overrides;
      const data = await apiCall(`/items/from-template`, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { item: { id: string; title: string } };
      return textResult({ message: `Created item "${data.item?.title}" from template`, id: data.item?.id });
    },
  );
}
