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
