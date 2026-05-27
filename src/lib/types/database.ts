// ============================================
// TIPOS DE BASE DE DATOS - NEGOCIOAPP PRO
// ============================================

// Enums
export type TenantStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
export type UserRole = 'owner' | 'staff' | 'admin';
export type UnitType = 'unit' | 'kg' | 'lt';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer' | 'mixed' | 'account';
export type MovementType = 'sale' | 'adjustment' | 'purchase' | 'return';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled' | 'unpaid';
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'starter' | 'professional' | 'business';
export type CashSessionStatus = 'open' | 'closed';
export type CashMovementType = 'sale' | 'withdrawal' | 'deposit' | 'expense';

// Tenant (Negocio/Kiosco)
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan_type: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;
  current_period_end?: string;
  mercadopago_customer_id?: string;
  low_stock_threshold_default: number;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Profile (Usuario)
export interface Profile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
}

// Product (Producto)
export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unit_type: UnitType;
  price: number;
  cost?: number;
  stock_on_hand: number;
  low_stock_threshold_override?: number;
  category?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Sale (Venta)
export interface Sale {
  id: string;
  tenant_id: string;
  sold_by: string;
  total_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
  seller?: Profile;
}

// Sale Item
export interface SaleItem {
  id: string;
  tenant_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  product?: Product;
}

// Inventory Movement
export interface InventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  type: MovementType;
  qty_change: number;
  stock_before: number;
  stock_after: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  product?: Product;
}

// Subscription
export interface Subscription {
  id: string;
  tenant_id: string;
  plan?: SubscriptionPlan;
  plan_id?: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  mercadopago_subscription_id?: string;
  trial_ends_at?: string;
  last_payment_at?: string;
  last_payment_amount?: number;
  payment_provider?: string;
  external_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

// Customers & Accounts
export type AccountMovementType = 'sale' | 'payment' | 'adjustment_debit' | 'adjustment_credit';

export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  dni?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  credit_limit: number;
  created_at: string;
  updated_at: string;
  account?: CustomerAccount;
}

export interface CustomerAccount {
  id: string;
  tenant_id: string;
  customer_id: string;
  balance: number;
  last_movement_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountMovement {
  id: string;
  tenant_id: string;
  account_id: string;
  type: AccountMovementType;
  amount: number;
  description?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
  creator?: Profile;
}

// ============================================
// TIPOS PARA FORMULARIOS Y ACCIONES
// ============================================

export interface ProductFormData {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unit_type: UnitType;
  price: number;
  cost?: number;
  stock_on_hand: number;
  low_stock_threshold_override?: number;
  category?: string;
  is_active?: boolean;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface CreateSaleData {
  items: {
    product_id: string;
    qty: number;
  }[];
  payment_method: PaymentMethod;
  customer_id?: string;
  notes?: string;
}

// ============================================
// TIPOS PARA REPORTES
// ============================================

export interface SalesSummary {
  total_sales: number;
  total_amount: number;
  average_sale: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_qty: number;
  total_revenue: number;
  unit_type: UnitType;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock_on_hand: number;
  threshold: number;
  unit_type: UnitType;
}

// ============================================
// TIPOS PARA CONTROL DE CAJA
// ============================================

export interface CashSession {
  id: string;
  tenant_id: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  opening_amount: number;
  expected_cash: number;
  actual_cash?: number;
  difference?: number;
  total_sales_cash: number;
  total_sales_other: number;
  total_withdrawals: number;
  total_deposits: number;
  status: CashSessionStatus;
  notes?: string;
  created_at: string;
  opener?: Profile;
  closer?: Profile;
}

export interface CashMovement {
  id: string;
  tenant_id: string;
  session_id: string;
  type: CashMovementType;
  amount: number;
  description?: string;
  reference_id?: string;
  created_by: string;
  created_at: string;
  creator?: Profile;
}

// ============================================
// TIPOS PARA UI
// ============================================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: UserRole[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  tenant: Tenant;
  subscription: Subscription;
}
