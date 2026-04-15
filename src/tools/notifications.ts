import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerNotificationTools(server: McpServer) {
  server.registerTool(
    'list_notifications',
    {
      title: 'List Notifications',
      description: 'List notifications (most recent first) with unread count.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const data = await apiCall('/notifications') as {
        notifications: Array<{ id: string; title: string; read: boolean; createdAt: string }>;
        unread: number;
      };
      return textResult({
        unread: data.unread,
        count: data.notifications.length,
        notifications: data.notifications,
      });
    }
  );

  server.registerTool(
    'mark_notification_read',
    {
      title: 'Mark Notification Read',
      description: 'Mark a single notification as read.',
      inputSchema: {
        notificationId: z.string().describe('The notification ID'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ notificationId }) => {
      await apiCall(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      return textResult({ message: 'Notification marked as read' });
    }
  );

  server.registerTool(
    'mark_all_notifications_read',
    {
      title: 'Mark All Notifications Read',
      description: 'Mark all notifications as read.',
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      await apiCall('/notifications/read-all', { method: 'POST' });
      return textResult({ message: 'All notifications marked as read' });
    }
  );
}
