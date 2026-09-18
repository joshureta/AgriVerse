import { apiRequest } from './api';

export type NotificationType =
  | 'task_assigned' | 'task_starting_soon' | 'harvest_approved' | 'harvest_rejected'
  | 'task_reassigned' | 'admin_broadcast' | 'weather_alert'
  | 'delivery_assigned' | 'delivery_window_approaching' | 'order_cancelled'
  | 'dispute_opened' | 'cod_confirmed' | 'rating_received' | 'order_status_updated';

export type NotificationRecord = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  entity_type: 'task' | 'order' | null;
  entity_id: number | null;
  read_at: string | null;
  created_at: string;
};

export function loadNotifications() {
  return apiRequest<{ notifications: NotificationRecord[]; unread_count: number }>('/api/notifications');
}
