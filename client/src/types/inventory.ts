export interface Product {
  id: string;
  name: string;
  brand: { name: string };
  skus: SKU[];
}

export interface SKU {
  id: string;
  productId: string;
  packaging: string;
  spec: string;
  price: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  ownerId?: string;
  owner?: { id: string; name: string };
  shelves?: Shelf[];
}

export interface Shelf {
  id: string;
  code: string;
  warehouseId: string;
  row: number;
  column: number;
  level: number;
}

export interface StockItem {
  id: string;
  type: 'product' | 'bundle' | 'material';
  skuId?: string;
  bundleId?: string;
  supplierMaterialId?: string;
  warehouseId: string;
  warehouse?: { name: string; type: string };
  location?: {
    id: string;
    shelfId: string;
    level: number;
    shelf?: {
      id: string;
      code: string;
      zoneId: string;
      zone?: {
        id: string;
        code: string;
        type: string;
      };
    };
  };
  totalQuantity: number;
  lockedQuantity: number;
  availableQuantity: number;
  skuBatch?: { batchNo: string; expiryDate?: string };
  bundleBatch?: { batchNo: string; expiryDate?: string };
  materialBatch?: { batchNo: string; expiryDate?: string };
  sku?: {
    id: string;
    product: {
      id: string;
      name: string;
    };
    spec: string;
    packaging: string;
  };
  bundle?: {
    id: string;
    name: string;
    spec?: string;
    packaging?: string;
    items?: Array<{
      id: string;
      sku: {
        product: {
          name: string;
        };
        spec: string;
        packaging: string;
      };
      quantity: number;
    }>;
  };
  supplierMaterial?: {
    name: string;
    unit?: string;
    category: string;
  };
}

export interface StockIn {
  id: string;
  type: 'product' | 'bundle';
  skuId?: string;
  bundleId?: string;
  warehouseId: string;
  warehouse?: { name: string };
  locationId?: string;
  location?: {
    shelf?: {
      zone?: {
        code: string;
      };
      code: string;
    };
    level: number;
  };
  quantity: number;
  createdAt: string;
  skuBatch?: { batchNo: string };
  bundleBatch?: { batchNo: string };
  sku?: {
    product: {
      name: string;
    };
    spec: string;
    packaging: string;
  };
  bundle?: {
    name: string;
    spec?: string;
    packaging?: string;
    items?: Array<{
      sku: {
        product: {
          name: string;
        };
        spec: string;
        packaging: string;
      };
      quantity: number;
    }>;
  };
}

export interface StockOut {
  id: string;
  orderId: string;
  order?: {
    orderNo: string;
  };
  skuId?: string;
  bundleId?: string;
  warehouseId: string;
  warehouse?: { name: string };
  locationId?: string;
  location?: {
    shelf?: {
      zone?: {
        code: string;
      };
      code: string;
    };
    level: number;
  };
  quantity: number;
  createdAt: string;
  skuBatch?: { batchNo: string };
  bundleBatch?: { batchNo: string };
  sku?: {
    product: {
      name: string;
    };
    spec: string;
    packaging: string;
  };
  bundle?: {
    name: string;
    spec?: string;
    packaging?: string;
    items?: Array<{
      sku: {
        product: {
          name: string;
        };
        spec: string;
        packaging: string;
      };
      quantity: number;
    }>;
  };
}
