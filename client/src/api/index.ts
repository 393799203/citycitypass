import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useOwnerStore } from '../stores/owner';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    let token = useAuthStore.getState().token;
    if (!token || token === 'null') {
      const authData = localStorage.getItem('auth-storage');
      token = authData ? JSON.parse(authData).state?.token : null;
    }
    if (token && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    let ownerId = useOwnerStore.getState().currentOwnerId;
    if (!ownerId || ownerId === 'null') {
      const ownerData = localStorage.getItem('owner-storage');
      ownerId = ownerData ? JSON.parse(ownerData).state?.currentOwnerId : null;
    }
    if (ownerId && ownerId !== 'null') {
      config.headers['x-owner-id'] = ownerId;
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

export const permissionApi = {
  getMyPermissions: () => api.get('/permissions/my-permissions'),
  getRoles: () => api.get('/permissions/roles'),
  getRole: (id: string) => api.get(`/permissions/roles/${id}`),
  createRole: (data: any) => api.post('/permissions/roles', data),
  updateRole: (id: string, data: any) => api.put(`/permissions/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/permissions/roles/${id}`),
};

export const userApi = {
  list: (params?: any) => api.get('/permissions/users', { params }),
  get: (id: string) => api.get(`/permissions/users/${id}`),
  update: (id: string, data: any) => api.put(`/permissions/users/${id}`, data),
  delete: (id: string) => api.delete(`/permissions/users/${id}`),
  removeOwner: (userId: string, ownerId: string) => api.delete(`/permissions/users/${userId}/owner/${ownerId}`),
  addOwner: (userId: string, data: { ownerId: string; roleId: string }) => api.post(`/permissions/users/${userId}/owner`, data),
  register: (data: any) => api.post('/auth/register', data),
};

export const ownerApi = {
  list: (params?: any) => api.get('/owners', { params }),
  get: (id: string) => api.get(`/owners/${id}`),
  create: (data: any) => api.post('/owners', data),
  update: (id: string, data: any) => api.put(`/owners/${id}`, data),
  delete: (id: string) => api.delete(`/owners/${id}`),
  getContracts: (ownerId: string) => api.get(`/owners/${ownerId}/contracts`),
};

export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const contractApi = {
  list: (params?: any) => api.get('/contracts', { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
  create: (data: any) => api.post('/contracts', data),
  update: (id: string, data: any) => api.put(`/contracts/${id}`, data),
  delete: (id: string) => api.delete(`/contracts/${id}`),
};

export const uploadApi = {
  contract: (formData: FormData) => {
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    return api.post('/upload/contract', formData, config);
  },
};

export const productApi = {
  list: (params?: any) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getBrands: (params?: any) => api.get('/products/brands', { params }),
  getBrandOptions: (brandId: string) => api.get(`/products/brands/${brandId}/options`),
  getSubCategories: () => api.get('/products/sub-categories'),
  createCategory: (data: any) => api.post('/products/categories', data),
  createBrand: (data: any) => api.post('/products/brands', data),
  listSkus: (params?: any) => api.get('/products/skus', { params }),
  listBundles: (params?: any) => api.get('/products/bundles', { params }),
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
  updateStatus: (id: string, status: string, userId?: string) => api.put(`/pick-orders/${id}/status`, { status, userId }),
};

export const warehouseApi = {
  list: (params?: any) => api.get('/warehouses', { params }),
  get: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  quickCreate: (data: any) => api.post('/warehouses/quick-create', data),
  update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  createZone: (warehouseId: string, data: any) => api.post(`/warehouses/${warehouseId}/zones`, data),
  updateZone: (id: string, data: any) => api.put(`/warehouses/zones/${id}`, data),
  deleteZone: (id: string) => api.delete(`/warehouses/zones/${id}`),
  listZones: (warehouseId: string) => api.get(`/warehouses/${warehouseId}/zones`),
  getZones: (warehouseId: string) => api.get(`/warehouses/${warehouseId}/zones`),
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
  executeStockIn: (id: string, type: string) => api.put(`/stock/stock-in/${id}/execute`, { type }),
  cancelStockIn: (id: string, type: string) => api.put(`/stock/stock-in/${id}/cancel`, { type }),
  createInboundOrder: (data: any) => api.post('/stock/inbound-order', data),
  getInboundOrders: (params?: any) => api.get('/stock/inbound-orders', { params }),
  updateInboundOrder: (id: string, data: any) => api.put(`/stock/inbound-order/${id}`, data),
  executeInboundOrder: (id: string) => api.put(`/stock/inbound-order/${id}/execute`),
  cancelInboundOrder: (id: string) => api.put(`/stock/inbound-order/${id}/cancel`),
  batchList: (params?: any) => api.get('/stock/batch/list', { params }),
  batchTrace: (batchNo: string) => api.get(`/stock/batch/${batchNo}/trace`),
  getBundleStock: (bundleId: string) => api.get(`/stock/bundle/${bundleId}`),
  getSkuStock: (skuId: string) => api.get(`/stock/sku/${skuId}`),
};

export const inboundApi = {
  create: (data: any) => api.post('/stock/inbound-order', data),
  list: (params?: any) => api.get('/stock/inbound-orders', { params }),
  get: (id: string) => api.get(`/stock/inbound-order/${id}`),
  update: (id: string, data: any) => api.put(`/stock/inbound-order/${id}`, data),
  execute: (id: string) => api.put(`/stock/inbound-order/${id}/execute`),
  cancel: (id: string) => api.put(`/stock/inbound-order/${id}/cancel`),
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

export const stockTransferApi = {
  list: (params?: any) => api.get('/stock/transfer', { params }),
  get: (id: string) => api.get(`/stock/transfer/${id}`),
  create: (data: any) => api.post('/stock/transfer', data),
  execute: (id: string) => api.put(`/stock/transfer/${id}/execute`),
  cancel: (id: string, reason?: string) => api.put(`/stock/transfer/${id}/cancel`, { reason }),
  getZoneStocks: (warehouseId: string, zoneType?: string) =>
    api.get(`/stock/transfer/zone-stocks/${warehouseId}`, { params: { zoneType } }),
  getAllStocks: (warehouseId: string) =>
    api.get(`/stock/all-stocks/${warehouseId}`),
};

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

export const vehicleApi = {
  list: (params?: any) => api.get('/vehicles', { params }),
  listAll: () => api.get('/vehicles/all'),
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

export const supplierApi = {
  list: (params?: any) => api.get('/suppliers', { params }),
  get: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const supplierContractApi = {
  list: (params?: any) => api.get('/supplier-contracts', { params }),
  get: (id: string) => api.get(`/supplier-contracts/${id}`),
  create: (data: any) => api.post('/supplier-contracts', data),
  update: (id: string, data: any) => api.put(`/supplier-contracts/${id}`, data),
  delete: (id: string) => api.delete(`/supplier-contracts/${id}`),
};

export const carrierApi = {
  list: (params?: any) => api.get('/carriers', { params }),
  get: (id: string) => api.get(`/carriers/${id}`),
  create: (data: any) => api.post('/carriers', data),
  update: (id: string, data: any) => api.put(`/carriers/${id}`, data),
  delete: (id: string) => api.delete(`/carriers/${id}`),
  approve: (id: string, data: any) => api.post(`/carriers/${id}/approve`, data),
  listContracts: (id: string) => api.get(`/carriers/${id}/contracts`),
  createContract: (id: string, data: any) => api.post(`/carriers/${id}/contracts`, data),
  updateContract: (contractId: string, data: any) => api.put(`/carriers/contracts/${contractId}`, data),
  deleteContract: (contractId: string) => api.delete(`/carriers/contracts/${contractId}`),
  listVehicles: (id: string) => api.get(`/carriers/${id}/vehicles`),
  listAllVehicles: () => api.get('/carriers/vehicles/all'),
  createVehicle: (id: string, data: any) => api.post(`/carriers/${id}/vehicles`, data),
  updateVehicle: (vehicleId: string, data: any) => api.put(`/carriers/vehicles/${vehicleId}`, data),
  updateVehicleLocation: (vehicleId: string, data: any) => api.put(`/carriers/vehicles/${vehicleId}/location`, data),
  deleteVehicle: (vehicleId: string) => api.delete(`/carriers/vehicles/${vehicleId}`),
  approveVehicle: (vehicleId: string, data: any) => api.post(`/carriers/vehicles/${vehicleId}/approve`, data),
};

export const skuBatchApi = {
  list: (params?: any) => api.get('/sku-batches', { params }),
  get: (id: string) => api.get(`/sku-batches/${id}`),
  create: (data: any) => api.post('/sku-batches', data),
  update: (id: string, data: any) => api.put(`/sku-batches/${id}`, data),
  delete: (id: string) => api.delete(`/sku-batches/${id}`),
};

export const bundleBatchApi = {
  list: (params?: any) => api.get('/bundle-batches', { params }),
  get: (id: string) => api.get(`/bundle-batches/${id}`),
  create: (data: any) => api.post('/bundle-batches', data),
  update: (id: string, data: any) => api.put(`/bundle-batches/${id}`, data),
  delete: (id: string) => api.delete(`/bundle-batches/${id}`),
};

export const purchaseOrderApi = {
  list: (params?: any) => api.get('/purchase-orders', { params }),
  get: (id: string) => api.get(`/purchase-orders/${id}`),
  create: (data: any) => api.post('/purchase-orders', data),
  update: (id: string, data: any) => api.put(`/purchase-orders/${id}`, data),
  delete: (id: string) => api.delete(`/purchase-orders/${id}`),
  confirm: (id: string) => api.patch(`/purchase-orders/${id}/confirm`),
  cancel: (id: string) => api.patch(`/purchase-orders/${id}/cancel`),
  createDelivery: (orderId: string, data: any) => api.post(`/purchase-orders/${orderId}/deliveries`, data),
  listDeliveries: (orderId: string) => api.get(`/purchase-orders/${orderId}/deliveries`),
  receiveDelivery: (deliveryId: string, data: any) => api.patch(`/purchase-orders/deliveries/${deliveryId}/receive`, data),
};

export const supplierProductApi = {
  list: (params?: any) => api.get('/supplier-products', { params }),
  getBySupplier: (supplierId: string) => api.get('/supplier-products', { params: { supplierId } }),
  create: (data: any) => api.post('/supplier-products', data),
  batch: (supplierId: string, items: any[]) => api.post('/supplier-products/batch', { supplierId, items }),
  update: (id: string, data: any) => api.put(`/supplier-products/${id}`, data),
  delete: (id: string) => api.delete(`/supplier-products/${id}`),
};

export const supplierMaterialApi = {
  list: (params?: any) => api.get('/supplier-materials', { params }),
  getBySupplier: (supplierId: string) => api.get('/supplier-materials', { params: { supplierId } }),
  create: (data: any) => api.post('/supplier-materials', data),
  batch: (supplierId: string, items: any[]) => api.post('/supplier-materials/batch', { supplierId, items }),
  update: (id: string, data: any) => api.put(`/supplier-materials/${id}`, data),
  delete: (id: string) => api.delete(`/supplier-materials/${id}`),
};
