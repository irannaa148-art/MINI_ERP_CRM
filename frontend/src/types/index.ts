export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type MovementType = 'IN' | 'OUT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  text: string;
  createdById: string;
  createdBy: { id: string; name: string; role: Role };
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName: string;
  gstNumber?: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate?: string | null;
  notesHistory?: CustomerNote[];
  createdAt: string;
  updatedAt: string;
  _count?: { challans: number; notesHistory: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  imageUrl?: string | null;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdById: string;
  createdBy: { id: string; name: string; role: Role };
  createdAt: string;
}

export interface ChallanItem {
  id: string;
  challanId: string;
  productId?: string | null;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  product?: { id: string; currentStock: number; minStockAlert: number };
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer: { id: string; name: string; businessName: string; mobile: string; address?: string; email?: string; gstNumber?: string };
  status: ChallanStatus;
  totalQuantity: number;
  totalAmount: number;
  pdfUrl?: string | null;
  items: ChallanItem[];
  createdById: string;
  createdBy: { id: string; name: string; role: Role };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  customers: {
    total: number;
    active: number;
    lead: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
  };
  challansThisMonth: {
    draft: number;
    confirmed: number;
    revenue: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  field?: string;
  shortProducts?: Array<{ productId: string; name: string; sku: string; requested: number; available: number }>;
}
