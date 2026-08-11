import { api } from './api';
import { Customer, CustomerNote, PaginatedResponse } from '../types';

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  type?: string;
}

export const customerService = {
  getCustomers: async (params?: CustomerFilterParams): Promise<PaginatedResponse<Customer>> => {
    const res = await api.get<PaginatedResponse<Customer>>('/customers', { params });
    return res.data;
  },

  getCustomerById: async (id: string): Promise<Customer> => {
    const res = await api.get<{ data: Customer }>(`/customers/${id}`);
    return res.data.data;
  },

  createCustomer: async (payload: Partial<Customer> & { notes?: string }): Promise<Customer> => {
    const res = await api.post<{ data: Customer }>('/customers', payload);
    return res.data.data;
  },

  updateCustomer: async (id: string, payload: Partial<Customer>): Promise<Customer> => {
    const res = await api.put<{ data: Customer }>(`/customers/${id}`, payload);
    return res.data.data;
  },

  addCustomerNote: async (id: string, text: string): Promise<CustomerNote> => {
    const res = await api.post<{ data: CustomerNote }>(`/customers/${id}/notes`, { text });
    return res.data.data;
  },
};
