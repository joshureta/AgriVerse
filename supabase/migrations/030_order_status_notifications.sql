-- Each order status event is retained as an individual notification.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'task_assigned', 'task_starting_soon', 'harvest_approved', 'harvest_rejected',
    'task_reassigned', 'admin_broadcast', 'weather_alert',
    'delivery_assigned', 'delivery_window_approaching', 'order_cancelled',
    'dispute_opened', 'cod_confirmed', 'rating_received', 'order_status_updated'
  ));
