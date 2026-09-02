import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiRequest } from './api';

const CART_STORAGE_KEY = 'agriverseBuyerCart';

export type PineappleProduct = {
  id: number;
  name: string;
  size_name: string;
  weight: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  unit_label: string;
  inventory_item_ids: number[];
  available: boolean;
};

export type BuyerOrderItem = {
  id: number;
  pineapple_size_id: number;
  product_name: string;
  weight_label: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type BuyerOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type DeliveryDisputeStatus = 'open' | 'resolved' | null;

export type BuyerOrder = {
  id: number;
  order_number: string;
  delivery_method: 'delivery' | 'pickup';
  payment_method: 'cash' | 'bank' | 'gcash';
  payment_status: string;
  order_status: BuyerOrderStatus;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  customer_note: string | null;
  delivery_full_name: string | null;
  delivery_mobile_number: string | null;
  delivery_country: string | null;
  delivery_region: string | null;
  delivery_province: string | null;
  delivery_city_municipality: string | null;
  delivery_barangay: string | null;
  estimated_delivery_at: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_for_delivery_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  delivery_proof_image_url: string | null;
  delivery_proof_notes: string | null;
  delivery_proof_submitted_at: string | null;
  buyer_confirmed_at: string | null;
  delivery_dispute_status: DeliveryDisputeStatus;
  delivery_dispute_reason: string | null;
  delivery_dispute_created_at: string | null;
  delivery_dispute_resolution: 'completed' | 'escalated' | null;
  delivery_dispute_resolution_notes: string | null;
  completed_at: string | null;
  completed_via: 'buyer_confirmed' | 'auto_timeout' | 'dispute_resolved' | null;
  items: BuyerOrderItem[];
};

export type DeliveryAddress = {
  id: string;
  label: string;
  full_name: string;
  mobile_number: string;
  country: string;
  region: string;
  province: string;
  city_municipality: string;
  barangay: string;
  created_at: string;
};

export async function loadPineappleProducts(): Promise<PineappleProduct[]> {
  const { products } = await apiRequest<{ products: PineappleProduct[] }>('/api/buyer/products/pineapples');
  return products || [];
}

export async function loadBuyerOrders(): Promise<BuyerOrder[]> {
  const { orders } = await apiRequest<{ orders: BuyerOrder[] }>('/api/buyer/orders');
  return orders || [];
}

export async function loadBuyerOrder(orderId: number): Promise<BuyerOrder> {
  const { order } = await apiRequest<{ order: BuyerOrder }>(`/api/buyer/orders/${orderId}`);
  return order;
}

export async function confirmBuyerOrderReceipt(orderId: number): Promise<BuyerOrder> {
  const { order } = await apiRequest<{ order: BuyerOrder }>(`/api/buyer/orders/${orderId}/confirm-receipt`, {
    method: 'POST',
  });
  return order;
}

export async function reportBuyerOrderDispute(orderId: number, reason: string): Promise<BuyerOrder> {
  const { order } = await apiRequest<{ order: BuyerOrder }>(`/api/buyer/orders/${orderId}/dispute`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return order;
}

export type DeliveryAddressInput = {
  full_name: string;
  mobile_number: string;
  country: string;
  region: string;
  province: string;
  city_municipality: string;
  barangay: string;
};

export type PlaceOrderPayload = {
  delivery_method: 'delivery' | 'pickup';
  payment_method: 'cash' | 'bank' | 'gcash';
  customer_note?: string;
  items: { product_id: number; quantity: number }[];
  delivery_address?: DeliveryAddressInput | null;
};

export async function placeBuyerOrder(order: PlaceOrderPayload): Promise<BuyerOrder> {
  const { order: placed } = await apiRequest<{ order: BuyerOrder }>('/api/buyer/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
  return placed;
}

export async function createGcashCheckout(orderId: number): Promise<string> {
  const { checkout_url } = await apiRequest<{ checkout_url: string }>(
    `/api/buyer/payments/${orderId}/gcash-checkout`,
    { method: 'POST' },
  );
  return checkout_url;
}

export async function loadBuyerDeliveryAddresses(): Promise<{
  addresses: DeliveryAddress[];
  defaultAddressId: string | null;
  addressConfirmedAt: string | null;
}> {
  const body = await apiRequest<{
    addresses: DeliveryAddress[];
    default_address_id: string | null;
    address_confirmed_at: string | null;
  }>('/api/buyer/orders/addresses');
  return {
    addresses: body.addresses || [],
    defaultAddressId: body.default_address_id || null,
    addressConfirmedAt: body.address_confirmed_at || null,
  };
}

export async function createBuyerDeliveryAddress(
  address: DeliveryAddressInput & { label?: string },
): Promise<DeliveryAddress> {
  const { address: created } = await apiRequest<{ address: DeliveryAddress }>('/api/buyer/orders/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  });
  return created;
}

export async function saveDefaultBuyerDeliveryAddress(addressId: string): Promise<void> {
  await apiRequest('/api/buyer/orders/addresses/default', {
    method: 'POST',
    body: JSON.stringify({ address_id: addressId }),
  });
}

export async function deleteBuyerDeliveryAddress(addressId: string): Promise<void> {
  await apiRequest(`/api/buyer/orders/addresses/${encodeURIComponent(addressId)}`, { method: 'DELETE' });
}

export type CartItem = {
  product_id: number;
  quantity: number;
  size_name: string;
  weight: string;
  price: number;
};

export async function readBuyerCart(): Promise<CartItem[]> {
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(CART_STORAGE_KEY)) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function buyerCartQuantity(items: CartItem[]): number {
  return items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
}

export async function writeBuyerCart(items: CartItem[]): Promise<void> {
  await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export type ReconciledCartItem = {
  product_id: number;
  size_name: string;
  weight: string;
  price: number;
  quantity: number;
  stock_quantity: number;
  unit_label: string;
};

// Shared by BuyerCart and BuyerCheckout — mirrors web's reconcileCart in
// ShoppingCart.jsx / BuyerCheckout.jsx: clamps saved quantities to current
// stock and drops anything that's gone out of stock or been removed.
export function reconcileBuyerCart(savedItems: CartItem[], products: PineappleProduct[]): ReconciledCartItem[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  const reconciled: ReconciledCartItem[] = [];
  for (const savedItem of savedItems) {
    const product = productById.get(savedItem.product_id);
    if (!product || product.stock_quantity <= 0) continue;
    const quantity = Math.min(Math.max(Number(savedItem.quantity) || 0, 0), product.stock_quantity);
    if (quantity === 0) continue;
    reconciled.push({
      product_id: product.id,
      size_name: product.size_name,
      weight: product.weight,
      price: product.price,
      quantity,
      stock_quantity: product.stock_quantity,
      unit_label: product.unit_label,
    });
  }
  return reconciled;
}

export function reconciledToCartItems(items: ReconciledCartItem[]): CartItem[] {
  return items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    size_name: item.size_name,
    weight: item.weight,
    price: item.price,
  }));
}
