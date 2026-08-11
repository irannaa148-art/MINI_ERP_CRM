import { api } from './api';
import { Product, StockMovement, PaginatedResponse } from '../types';

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  lowStock?: boolean;
}

export const productService = {
  getProducts: async (params?: ProductFilterParams): Promise<PaginatedResponse<Product>> => {
    const res = await api.get<PaginatedResponse<Product>>('/products', { params });
    return res.data;
  },

  getProductById: async (id: string): Promise<Product & { stockMovements: StockMovement[] }> => {
    const res = await api.get<{ data: Product & { stockMovements: StockMovement[] } }>(`/products/${id}`);
    return res.data.data;
  },

  createProduct: async (formData: FormData): Promise<Product> => {
    const res = await api.post<{ data: Product }>('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  updateProduct: async (id: string, formData: FormData): Promise<Product> => {
    const res = await api.put<{ data: Product }>(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  getProductStockLog: async (id: string): Promise<StockMovement[]> => {
    const res = await api.get<{ data: StockMovement[] }>(`/products/${id}/stock-log`);
    return res.data.data;
  },

  recordStockMovement: async (
    id: string,
    payload: { quantity: number; movementType: 'IN' | 'OUT'; reason: string }
  ): Promise<{ product: Product; movement: StockMovement }> => {
    const res = await api.post<{ data: { product: Product; movement: StockMovement } }>(
      `/products/${id}/stock-movement`,
      payload
    );
    return res.data.data;
  },
};
