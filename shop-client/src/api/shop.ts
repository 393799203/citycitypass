import axios from 'axios';

const publicApi = axios.create({
  baseURL: '/api/public',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const shopUserApi = axios.create({
  baseURL: '/api/shop/user',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，自动添加token
shopUserApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('shop_user_token');
  console.log('shopUserApi request:', config.url, 'token:', token ? 'exists' : 'missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const shopApi = {
  getProducts: (params?: { name?: string; categoryId?: string; brandId?: string; ownerId?: string }) =>
    publicApi.get('/products', { params }),

  getProduct: (id: string) =>
    publicApi.get(`/products/${id}`),

  addToCart: (data: { sessionId?: string; shopUserId?: string; productId?: string; skuId?: string; bundleId?: string; quantity: number }) =>
    publicApi.post('/cart', data),

  getCart: (sessionId?: string, shopUserId?: string) =>
    publicApi.get('/cart', { params: { sessionId, shopUserId } }),

  removeFromCart: (itemId: string, sessionId?: string, shopUserId?: string) =>
    publicApi.delete(`/cart/${itemId}`, { params: { sessionId, shopUserId } }),

  updateCartItem: (itemId: string, data: { quantity: number }, sessionId?: string, shopUserId?: string) =>
    publicApi.put(`/cart/${itemId}`, data, { params: { sessionId, shopUserId } }),

  clearCart: (sessionId?: string, shopUserId?: string) =>
    publicApi.delete('/cart', { params: { sessionId, shopUserId } }),

  createOrder: (data: {
    sessionId?: string;
    shopUserId?: string;
    ownerId: string;
    warehouseId: string;
    receiver: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
    items: Array<{ skuId?: string; bundleId?: string; quantity: number }>;
  }) => publicApi.post('/orders', data),

  getOrder: (orderNo: string) =>
    publicApi.get(`/orders/${orderNo}`),
    
  // 用户登录相关
  wechatLogin: (code: string) =>
    shopUserApi.post('/wechat', { code }),
    
  alipayLogin: (code: string) =>
    shopUserApi.post('/alipay', { code }),
    
  phoneLogin: (phone: string, code?: string) =>
    shopUserApi.post('/phone', { phone, code }),
    
  bindCustomer: (customerCode: string) =>
    shopUserApi.post('/bind-customer', { customerCode }),
    
  getUserInfo: () =>
    shopUserApi.get('/me'),
    
  addAddress: (data: {
    receiver: string;
    phone: string;
    province: string;
    city: string;
    district?: string;
    address: string;
    latitude?: number;
    longitude?: number;
    label?: string;
    isDefault?: boolean;
  }) => shopUserApi.post('/address', data),
  
  updateAddress: (id: string, data: {
    receiver: string;
    phone: string;
    province: string;
    city: string;
    district?: string;
    address: string;
    latitude?: number;
    longitude?: number;
    label?: string;
    isDefault?: boolean;
  }) => shopUserApi.put(`/address/${id}`, data),
  
  deleteAddress: (id: string) =>
    shopUserApi.delete(`/address/${id}`),
    
  getMyOrders: () =>
    shopUserApi.get('/orders'),
    
  cancelOrder: (orderId: string) =>
    shopUserApi.put(`/orders/${orderId}/cancel`),
    
  confirmReceive: (orderId: string) =>
    shopUserApi.put(`/orders/${orderId}/confirm`),
};

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('shop_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('shop_session_id', sessionId);
  }
  return sessionId;
};

export const getShopUser = (): { userId: string; nickname: string; phone?: string; hasDiscount?: boolean } | null => {
  const userStr = localStorage.getItem('shop_user_info');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

export const setShopUser = (user: { userId: string; nickname: string; phone?: string; hasDiscount?: boolean; token: string }) => {
  localStorage.setItem('shop_user_info', JSON.stringify(user));
  localStorage.setItem('shop_user_token', user.token);
};

export const clearShopUser = () => {
  localStorage.removeItem('shop_user_info');
  localStorage.removeItem('shop_user_token');
};

export default shopApi;
