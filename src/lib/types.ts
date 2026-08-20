export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface Category {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  stock: number;
}

export interface RestaurantTable {
  id: number;
  table_number: number;
  seats: number;
  status: TableStatus;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: number;
  order_type: OrderType;
  status: OrderStatus;
  table_number: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface InventoryLog {
  id: number;
  product_id: number;
  change: number;
  reason: 'initial' | 'restock' | 'sale' | 'waste' | 'correction';
  notes: string | null;
  created_at: string;
}

export interface Stats {
  revenue_today: number;
  orders_today: number;
  completed_today: number;
  active_orders: number;
  avg_order: number;
  by_type: Record<OrderType, number>;
}

export const ACTIVE_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
];