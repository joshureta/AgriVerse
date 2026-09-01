export type DeliveryAssignmentStatus = 'assigned' | 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'declined' | 'failed';

export type DeliveryVehicle = { id: number; vehicle_name: string; plate_number: string };

export type DriverOrder = {
  id: number;
  order_number: string;
  total_amount: number;
  payment_method: string;
  order_status: string;
  delivery_assignment_status: DeliveryAssignmentStatus;
  assigned_vehicle_id: number | null;
  delivery_full_name: string;
  delivery_mobile_number: string;
  delivery_region: string | null;
  delivery_province: string | null;
  delivery_city_municipality: string | null;
  delivery_barangay: string | null;
  delivery_scheduled_at: string | null;
  delivery_window_end_at: string | null;
  vehicle: DeliveryVehicle | null;
};

export type DriverOrdersResponse = { orders: DriverOrder[] };
export type DriverVehiclesResponse = { vehicles: DeliveryVehicle[] };

export const ACTIVE_DELIVERY_STATUSES: DeliveryAssignmentStatus[] = ['accepted', 'picked_up', 'out_for_delivery'];

export function isActiveDelivery(order: DriverOrder) {
  return ACTIVE_DELIVERY_STATUSES.includes(order.delivery_assignment_status);
}

export function formatDeliveryAddress(order: DriverOrder) {
  return [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region]
    .filter(Boolean).join(', ') || 'Delivery address unavailable';
}

export function formatDeliveryRoute(order: DriverOrder, origin = 'Silang') {
  const destination =
    order.delivery_city_municipality ||
    order.delivery_province ||
    order.delivery_barangay ||
    'Tagaytay';
  return `${origin} -> ${destination}`;
}

export function formatDeliveryWindow(start: string | null, end: string | null) {
  if (!start || !end) return 'Schedule pending';
  const dateTime = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const time = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });
  return `${dateTime.format(new Date(start))} – ${time.format(new Date(end))}`;
}

export function formatPeso(value: number) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function deliveryStatusLabel(status: DeliveryAssignmentStatus) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function activeDeliveryAction(status: DeliveryAssignmentStatus) {
  if (status === 'accepted') return { label: 'Confirm Pickup', nextStatus: 'picked_up' as const };
  if (status === 'picked_up') return { label: 'Start Delivery', nextStatus: 'out_for_delivery' as const };
  if (status === 'out_for_delivery') return { label: 'Complete Delivery', nextStatus: 'delivered' as const };
  return null;
}
