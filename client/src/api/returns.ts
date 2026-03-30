import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const returnApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) => {
    return api.get('/returns', { params });
  },

  get: (id: string) => {
    return api.get(`/returns/${id}`);
  },

  create: (data: {
    orderId: string;
    reason: string;
    items?: Array<{
      orderItemId: string;
      skuId?: string;
      bundleId?: string;
      quantity: number;
    }>;
  }) => {
    return api.post('/returns', data);
  },

  receive: (id: string, data: { trackingNo?: string; logisticsCompany?: string }) => {
    return api.put(`/returns/${id}/receive`, data);
  },

  qualify: (id: string, data: {
    items: Array<{
      id: string;
      qualifiedQuantity: number;
      rejectedQuantity: number;
      remark?: string;
    }>;
  }) => {
    return api.put(`/returns/${id}/qualify`, data);
  },

  refund: (id: string, data: { refundAmount?: number; remark?: string }) => {
    return api.put(`/returns/${id}/refund`, data);
  },

  update: (id: string, data: { trackingNo?: string; logisticsCompany?: string }) => {
    return api.put(`/returns/${id}`, data);
  },

  cancel: (id: string, reason?: string) => {
    return api.put(`/returns/${id}/cancel`, { reason });
  },
};
