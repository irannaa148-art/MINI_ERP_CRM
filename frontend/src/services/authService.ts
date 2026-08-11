import { api } from './api';
import { User } from '../types';

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    const { accessToken, user } = res.data.data;
    localStorage.setItem('mini_erp_token', accessToken);
    localStorage.setItem('mini_erp_user', JSON.stringify(user));
    return { token: accessToken, user };
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<{ data: User }>('/auth/me');
    return res.data.data;
  },

  logout: () => {
    localStorage.removeItem('mini_erp_token');
    localStorage.removeItem('mini_erp_user');
    window.location.href = '/login';
  },

  getStoredUser: (): User | null => {
    const raw = localStorage.getItem('mini_erp_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getStoredToken: (): string | null => {
    return localStorage.getItem('mini_erp_token');
  },
};
