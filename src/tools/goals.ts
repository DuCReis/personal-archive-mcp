import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerGoalTools(server: McpServer) {
  server.registerTool(
    'list_goals',
    {
      title: 'List Goals',
      description: 'List all goals.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const data = await apiCall('/goals') as { goals: unknown[] };
      return textResult(data.goals);
    }
  );

  server.registerTool(
    'create_goal',
    {
      title: 'Create Goal',
      description: 'Create a new goal, optionally linked to a board.',
      inputSchema: {
        title: z.string().describe('Goal title'),
        description: z.string().optional().describe('Goal description'),
        targetValue: z.number().optional().describe('Target value to reach'),
        unit: z.string().optional().describe('Unit of measurement (e.g. %, tasks, hours)'),
        deadline: z.string().optional().describe('Deadline (ISO 8601 date)'),
        color: z.string().optional().describe('Color hex'),
        boardId: z.string().optional().describe('Link to a board'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, description, targetValue, unit, deadline, color, boardId }) => {
      const body: Record<string, unknown> = { title };
      if (description) body.description = description;
      if (targetValue !== undefined) body.targetValue = targetValue;
      if (unit) body.unit = unit;
      if (deadline) body.deadline = deadline;
      if (color) body.color = color;
      if (boardId) body.boardId = boardId;
      const data = await apiCall('/goals', {
        method: 'POST',
        body: JSON.stringify(body),
      }) as { goal: { id: string; title: string } };
      return textResult({ message: `Created goal "${title}"`, id: data.goal?.id });
    }
  );

  server.registerTool(
    'update_goal',
    {
      title: 'Update Goal',
      description: 'Update an existing goal (progress, target, metadata, or completion state).',
      inputSchema: {
        goalId: z.string().describe('The goal ID'),
        title: z.string().optional().describe('New title'),
        description: z.string().optional().describe('New description'),
        currentValue: z.number().optional().describe('Current progress value'),
        targetValue: z.number().optional().describe('Target value'),
        completed: z.boolean().optional().describe('Mark as completed'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ goalId, title, description, currentValue, targetValue, completed }) => {
      const body: Record<string, unknown> = {};
      if (title) body.title = title;
      if (description) body.description = description;
      if (currentValue !== undefined) body.currentValue = currentValue;
      if (targetValue !== undefined) body.targetValue = targetValue;
      if (completed !== undefined) body.completed = completed;
      const data = await apiCall(`/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { goal: { id: string; title: string } };
      return textResult({ message: `Updated goal "${data.goal?.title}"`, goal: data.goal });
    }
  );

  server.registerTool(
    'delete_goal',
    {
      title: 'Delete Goal',
      description: 'Delete a goal permanently. This is irreversible.',
      inputSchema: { goalId: z.string().describe('The goal ID to delete') },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ goalId }) => {
      await apiCall(`/goals/${goalId}`, { method: 'DELETE' });
      return textResult({ message: 'Goal deleted' });
    }
  );
}
