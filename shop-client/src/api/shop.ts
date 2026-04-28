import axios from 'axios';

const publicApi = axios.create({
  baseURL: '/api/public',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const shopApi = {
  getProducts: (params?: { name?: string; categoryId?: string; brandId?: string; ownerId?: string }) =>
    publicApi.get('/products', { params }),

  getProduct: (id: string) =>
    publicApi.get(`/products/${id}`),

  addToCart: (data: { sessionId: string; productId?: string; skuId?: string; bundleId?: string; quantity: number }) =>
    publicApi.post('/cart', data),

  getCart: (sessionId: string) =>
    publicApi.get('/cart', { params: { sessionId } }),

  removeFromCart: (itemId: string, sessionId: string) =>
    publicApi.delete(`/cart/${itemId}`, { params: { sessionId } }),

  updateCartItem: (itemId: string, data: { quantity: number }, sessionId: string) =>
    publicApi.put(`/cart/${itemId}`, data, { params: { sessionId } }),

  clearCart: (sessionId: string) =>
    publicApi.delete('/cart', { params: { sessionId } }),

  createOrder: (data: {
    sessionId: string;
    ownerId: string;
    warehouseId: string;
    receiver: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
    items: Array<{ skuId: string; quantity: number }>;
  }) => publicApi.post('/orders', data),

  getOrder: (orderNo: string) =>
    publicApi.get(`/orders/${orderNo}`),
};

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('shop_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('shop_session_id', sessionId);
  }
  return sessionId;
};

export default shopApi;
