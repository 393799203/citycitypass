export interface TraceData {
  batchNo: string;
  batchInfo?: {
    id: string;
    batchNo: string;
    expiryDate?: string;
    productionDate?: string;
    supplierId?: string;
    supplierName?: string;
    productName?: string;
    spec?: string;
    packaging?: string;
    type: 'PRODUCT' | 'BUNDLE';
  };
  summary?: {
    totalInbound: number;
    totalOutbound: number;
    totalInWarehouse: number;
    totalLocked: number;
    totalReturned: number;
  };
  stockIns: Array<{
    type: string;
    productName?: string;
    bundleName?: string;
    spec?: string;
    packaging?: string;
    inboundNo?: string;
    quantity: number;
    expiryDate?: string;
    warehouse: string;
    locationCode: string;
    createdAt: string;
  }>;
  locations: Array<{
    type: string;
    locationCode: string;
    quantity: number;
    availableQuantity: number;
    lockedQuantity: number;
    warehouse: string;
  }>;
  stockOuts: Array<{
    type: string;
    orderNo: string;
    orderId: string;
    customer: string;
    customerPhone: string;
    quantity: number;
    productName?: string;
    bundleName?: string;
    warehouse: string;
    createdAt: string;
    isReturned: boolean;
  }>;
  returns: Array<{
    type: string;
    returnNo: string;
    quantity: number;
    createdAt: string;
  }>;
  transfers: Array<{
    type: string;
    transferNo: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    status: string;
    executedAt: string;
  }>;
}

export interface BatchInfo {
  id: string;
  batchNo: string;
  expiryDate?: string;
  productionDate?: string;
  supplierId?: string;
  supplierName?: string;
  productName?: string;
  spec?: string;
  packaging?: string;
  sku?: {
    product?: {
      name?: string;
    };
  };
  type: 'PRODUCT' | 'BUNDLE';
  totalQuantity?: number;
}
