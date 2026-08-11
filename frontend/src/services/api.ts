import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mini_erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error objects cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on 401 Unauthorized
      localStorage.removeItem('mini_erp_token');
      localStorage.removeItem('mini_erp_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const apiError = error.response?.data?.error || {
      message: error.message || 'An unexpected error occurred.',
    };

    return Promise.reject(apiError);
  }
);
