import { api } from './api';
import { Challan, PaginatedResponse } from '../types';

export interface ChallanFilterParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateChallanPayload {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
}

export const challanService = {
  getChallans: async (params?: ChallanFilterParams): Promise<PaginatedResponse<Challan>> => {
    const res = await api.get<PaginatedResponse<Challan>>('/challans', { params });
    return res.data;
  },

  getChallanById: async (id: string): Promise<Challan> => {
    const res = await api.get<{ data: Challan }>(`/challans/${id}`);
    return res.data.data;
  },

  createChallan: async (payload: CreateChallanPayload): Promise<Challan> => {
    const res = await api.post<{ data: Challan }>('/challans', payload);
    return res.data.data;
  },

  updateChallan: async (id: string, payload: Partial<CreateChallanPayload>): Promise<Challan> => {
    const res = await api.put<{ data: Challan }>(`/challans/${id}`, payload);
    return res.data.data;
  },

  confirmChallan: async (id: string): Promise<{ data: Challan; message: string }> => {
    const res = await api.post<{ data: Challan; message: string }>(`/challans/${id}/confirm`);
    return res.data;
  },

  cancelChallan: async (id: string): Promise<{ data: Challan; message: string }> => {
    const res = await api.post<{ data: Challan; message: string }>(`/challans/${id}/cancel`);
    return res.data;
  },

  downloadInvoicePDF: async (id: string, challanNumber: string): Promise<void> => {
    const response = await api.get(`/challans/${id}/invoice`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${challanNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
