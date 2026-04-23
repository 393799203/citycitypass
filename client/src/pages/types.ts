import React from 'react';

// 发货管理页面类型
export interface PickOrder {
  id: string;
  pickNo: string;
  status: string;
  orders: Order[];
  items: PickOrderItem[];
  picker?: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
  };
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  status: string;
  owner: {
    name: string;
  };
  warehouse: {
    id: string;
    name: string;
  };
  warehouseId: string;
  createdAt: string;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  items: OrderItem[];
  stockLocks?: StockLock[];
  bundleStockLocks?: BundleStockLock[];
  pickOrder?: any;
}

export interface OrderItem {
  id: string;
  productName: string;
  spec: string;
  packaging: string;
  quantity: number;
  skuId?: string;
  bundleId?: string;
  bundle?: {
    items: BundleItem[];
  };
}

export interface PickOrderItem {
  id: string;
  productName: string;
  spec: string;
  packaging: string;
  quantity: number;
  skuId?: string;
  bundleId?: string;
  bundle?: {
    items: BundleItem[];
  };
  stockLock?: StockLock;
  bundleStockLock?: BundleStockLock;
  skuBatch?: {
    batchNo: string;
  };
  bundleBatch?: {
    batchNo: string;
  };
  warehouseLocation?: string;
}

export interface BundleItem {
  id: string;
  quantity: number;
  sku?: {
    product: {
      name: string;
    };
    spec: string;
    packaging: string;
  };
}

export interface StockLock {
  id: string;
  skuId: string;
  quantity: number;
  location: {
    shelf: {
      zone: {
        code: string;
      };
      code: string;
    };
    level: number;
  };
  skuBatch?: {
    batchNo: string;
  };
}

export interface BundleStockLock {
  id: string;
  bundleId: string;
  quantity: number;
  location: {
    shelf: {
      zone: {
        code: string;
      };
      code: string;
    };
    level: number;
  };
  bundleBatch?: {
    batchNo: string;
  };
}

export interface AISuggestion {
  orderIds: string[];
  reason: string;
}

export interface TooltipContent {
  x: number;
  y: number;
  content: React.ReactNode;
}

// 运力调度页面类型
export interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: string;
  brand?: string;
  model?: string;
  capacity: number;
  volume?: number;
  licenseNo?: string;
  insuranceNo?: string;
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  latitude?: number;
  longitude?: number;
  location?: string;
  address?: string;
  drivers?: Driver[];
  sourceType?: 'WAREHOUSE' | 'CARRIER';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  licenseTypes?: string[];
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
  vehicle?: Vehicle;
  latitude?: number;
  longitude?: number;
  location?: string;
  address?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface FormData {
  warehouseId: string;
  warehouse: { id: string; name: string } | null;
  licensePlate: string;
  vehicleType: string;
  brand: string;
  model: string;
  capacity: number;
  volume: string;
  licenseNo: string;
  insuranceNo: string;
  status: string;
  name: string;
  phone: string;
  licenseTypes: string[];
  driverStatus: string;
  latitude: string;
  longitude: string;
  location: string;
  address: string;
}

// 退货管理页面类型
export interface LocationForm {
  address: string;
  latitude: string;
  longitude: string;
  location: string;
}

export interface ReturnOrder {
  id: string;
  returnNo: string;
  orderId: string;
  order?: {
    orderNo: string;
    totalAmount: number;
    receiver: string;
    contractDiscount?: number;
  };
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    address?: string;
  };
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  reason: string;
  status: string;
  trackingNo?: string;
  logisticsCompany?: string;
  refundStatus?: string;
  items: ReturnItem[];
  logs: ReturnLog[];
  createdAt: string;
}

export interface ReturnItem {
  id: string;
  productName: string;
  spec: string;
  packaging: string;
  quantity: number;
  qualifiedQuantity?: number;
  rejectedQuantity?: number;
  unitPrice?: number;
  skuId?: string;
  bundleId?: string;
  bundle?: {
    items: BundleItem[];
  };
  skuBatchId?: string;
  bundleBatchId?: string;
  skuBatch?: {
    batchNo: string;
    expiryDate?: string;
  };
  bundleBatch?: {
    batchNo: string;
    expiryDate?: string;
  };
}

export interface ReturnLog {
  id: string;
  action: string;
  remark?: string;
  operatorName?: string;
  createdAt: string;
}

export interface CreateReturnForm {
  orderId: string;
  reason: string;
}

export interface QualifyItem {
  id: string;
  productName: string;
  quantity: number;
  qualifiedQuantity: number;
  rejectedQuantity: number;
  skuId?: string;
  bundleId?: string;
  packaging?: string;
  spec?: string;
  skuBatchId?: string;
  bundleBatchId?: string;
  skuBatch?: {
    batchNo: string;
    expiryDate?: string;
  };
  bundleBatch?: {
    batchNo: string;
    expiryDate?: string;
  };
}

export interface RefundModalData {
  show: boolean;
  returnOrder: ReturnOrder;
  refundAmount: number;
}

export interface ReturnTrackingModalData {
  show: boolean;
  returnId: string;
  returnNo: string;
}
