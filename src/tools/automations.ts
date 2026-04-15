import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerAutomationTools(server: McpServer) {
  server.tool(
    'list_automations',
    'List all automations for a board',
    {
      boardId: z.string().describe('The board ID'),
    },
    async ({ boardId }) => {
      const data = await apiCall(`/boards/${boardId}/automations`) as {
        automations: Array<{
          id: string;
          name: string;
          trigger: unknown;
          action: unknown;
          enabled: boolean;
        }>;
      };
      return textResult({ count: data.automations.length, automations: data.automations });
    }
  );

  server.tool(
    'create_automation',
    'Create an automation on a board. Trigger types: status_change, item_created, field_changed. Action types: set_field, move_group, create_notification.',
    {
      boardId: z.string().describe('The board ID'),
      name: z.string().describe('Automation name'),
      trigger: z.object({
        type: z.enum(['status_change', 'item_created', 'field_changed']),
        from: z.string().optional().describe('For status_change: from status'),
        to: z.string().optional().describe('For status_change: to status'),
        field: z.string().optional().describe('For field_changed: field/column id'),
      }).describe('When the automation fires'),
      action: z.object({
        type: z.enum(['set_field', 'move_group', 'create_notification']),
        field: z.string().optional().describe('For set_field: field/column id'),
        value: z.unknown().optional().describe('For set_field: value to set'),
        groupId: z.string().optional().describe('For move_group: target group id'),
        title: z.string().optional().describe('For create_notification: notification title'),
      }).describe('What the automation does'),
      enabled: z.boolean().optional().describe('Whether the automation is active (default: true)'),
    },
    async ({ boardId, name, trigger, action, enabled }) => {
      const body: Record<string, unknown> = { name, trigger, action };
      if (enabled !== undefined) body.enabled = enabled;
      const data = await apiCall(`/boards/${boardId}/automations`, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { automation: { id: string; name: string } };
      return textResult({ message: `Created automation "${name}"`, id: data.automation?.id });
    }
  );

  server.tool(
    'update_automation',
    'Update an existing automation (name, trigger, action, or enabled state)',
    {
      boardId: z.string().describe('The board ID'),
      automationId: z.string().describe('The automation ID'),
      name: z.string().optional(),
      enabled: z.boolean().optional(),
    },
    async ({ boardId, automationId, name, enabled }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (enabled !== undefined) body.enabled = enabled;
      const data = await apiCall(`/boards/${boardId}/automations/${automationId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { automation: { id: string; name: string } };
      return textResult({ message: `Updated automation`, automation: data.automation });
    }
  );

  server.tool(
    'delete_automation',
    'Delete an automation',
    {
      boardId: z.string().describe('The board ID'),
      automationId: z.string().describe('The automation ID'),
    },
    async ({ boardId, automationId }) => {
      await apiCall(`/boards/${boardId}/automations/${automationId}`, { method: 'DELETE' });
      return textResult({ message: 'Automation deleted' });
    }
  );
}
