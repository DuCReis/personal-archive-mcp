import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, textResult } from '../api.js';

export function registerNotificationTools(server: McpServer) {
  server.tool(
    'list_notifications',
    'List notifications (most recent first) with unread count',
    {},
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

  server.tool(
    'mark_notification_read',
    'Mark a single notification as read',
    {
      notificationId: z.string().describe('The notification ID'),
    },
    async ({ notificationId }) => {
      await apiCall(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      return textResult({ message: 'Notification marked as read' });
    }
  );

  server.tool(
    'mark_all_notifications_read',
    'Mark all notifications as read',
    {},
    async () => {
      await apiCall('/notifications/read-all', { method: 'POST' });
      return textResult({ message: 'All notifications marked as read' });
    }
  );
}
