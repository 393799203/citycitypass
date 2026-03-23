import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const userApi = {
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  register: (data: any) => api.post('/auth/register', data),
};

export const ownerApi = {
  list: (params?: any) => api.get('/owners', { params }),
  get: (id: string) => api.get(`/owners/${id}`),
  create: (data: any) => api.post('/owners', data),
  update: (id: string, data: any) => api.put(`/owners/${id}`, data),
  delete: (id: string) => api.delete(`/owners/${id}`),
};

export const productApi = {
  list: (params?: any) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getBrands: (params?: any) => api.get('/products/brands', { params }),
  createCategory: (data: any) => api.post('/products/categories', data),
  createBrand: (data: any) => api.post('/products/brands', data),
  createSku: (productId: string, data: any) => api.post(`/products/${productId}/skus`, data),
  deleteSku: (skuId: string) => api.delete(`/products/skus/${skuId}`),
};

export const orderApi = {
  list: (params?: any) => api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/orders/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/orders/${id}`),
};

export const pickOrderApi = {
  list: (params?: any) => api.get('/pick-orders', { params }),
  get: (id: string) => api.get(`/pick-orders/${id}`),
  create: (data: any) => api.post('/pick-orders', data),
  updateStatus: (id: string, status: string) => api.put(`/pick-orders/${id}/status`, { status }),
};

export const warehouseApi = {
  list: (params?: any) => api.get('/warehouses', { params }),
  get: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  createZone: (warehouseId: string, data: any) => api.post(`/warehouses/${warehouseId}/zones`, data),
  updateZone: (id: string, data: any) => api.put(`/warehouses/zones/${id}`, data),
  deleteZone: (id: string) => api.delete(`/warehouses/zones/${id}`),
  listZones: (warehouseId: string) => api.get(`/warehouses/${warehouseId}/zones`),
  createShelf: (zoneId: string, data: any) => api.post(`/warehouses/zones/${zoneId}/shelves`, data),
  updateShelf: (id: string, data: any) => api.put(`/warehouses/shelves/${id}`, data),
  deleteShelf: (id: string) => api.delete(`/warehouses/shelves/${id}`),
  listLocations: (warehouseId: string) => api.get(`/warehouses/${warehouseId}/locations`),
  createLocation: (shelfId: string, data: any) => api.post(`/warehouses/shelves/${shelfId}/locations`, data),
  updateLocation: (id: string, data: any) => api.put(`/warehouses/locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/warehouses/locations/${id}`),
};

export const stockApi = {
  list: (params?: any) => api.get('/stock', { params }),
  getAvailable: (warehouseId: string, skuId: string) => api.get('/stock/available', { params: { warehouseId, skuId } }),
  getOwnerStockSummary: (ownerId: string) => api.get('/stock/owner-stock-summary', { params: { ownerId } }),
  stockIn: (data: any) => api.post('/stock/stock-in', data),
  stockIns: (params?: any) => api.get('/stock/stock-in', { params }),
  stockOuts: (params?: any) => api.get('/stock/out', { params }),
  lock: (data: any) => api.post('/stock/lock', data),
  unlock: (orderId: string) => api.post('/stock/unlock', { orderId }),
  use: (orderId: string) => api.post('/stock/use', { orderId }),
};

export const bundleApi = {
  list: (params?: any) => api.get('/bundles', { params }),
  get: (id: string) => api.get(`/bundles/${id}`),
  create: (data: any) => api.post('/bundles', data),
  update: (id: string, data: any) => api.put(`/bundles/${id}`, data),
  delete: (id: string) => api.delete(`/bundles/${id}`),
};

export const bundleStockApi = {
  list: (params?: any) => api.get('/stock/bundle', { params }),
  stockIn: (data: any) => api.post('/stock/bundle/stock-in', data),
};

export const returnApi = {
  list: (params?: any) => api.get('/returns', { params }),
  get: (id: string) => api.get(`/returns/${id}`),
  create: (data: any) => api.post('/returns', data),
  receive: (id: string, data: any) => api.put(`/returns/${id}/receive`, data),
  qualify: (id: string, data: any) => api.put(`/returns/${id}/qualify`, data),
  stockIn: (id: string, data: any) => api.put(`/returns/${id}/stock-in`, data),
  refund: (id: string, data: any) => api.put(`/returns/${id}/refund`, data),
  cancel: (id: string, reason?: string) => api.put(`/returns/${id}/cancel`, { reason }),
};

export const vehicleApi = {
  list: (params?: any) => api.get('/vehicles', { params }),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

export const driverApi = {
  list: (params?: any) => api.get('/drivers', { params }),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.put(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
};

export const dispatchApi = {
  list: (params?: any) => api.get('/dispatches', { params }),
  get: (id: string) => api.get(`/dispatches/${id}`),
  create: (data: any) => api.post('/dispatches', data),
  updateStatus: (id: string, status: string) => api.put(`/dispatches/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/dispatches/${id}`),
};

export const geocodeApi = {
  geocode: (address: string) => api.get('/geocode', { params: { address } }),
};
