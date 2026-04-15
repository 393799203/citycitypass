export interface InboundOrder {
  id: string;
  inboundNo: string;
  source: string;
  warehouseId: string;
  warehouse?: any;
  remark?: string;

  arrivalQuantity?: number;
  palletNo?: string;
  vehicleNo?: string;
  arrivedAt?: string;

  receivedAt?: string;
  putawayAt?: string;

  erpSyncStatus?: string;

  status: string;
  items: any[];
  createdAt: string;
  executedAt?: string;
}

export interface InboundItemInput {
  type: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  locationId: string;
  locationCode: string;
  quantity: number;
}

export interface ArrivalItemInput {
  id: string;
  type: 'PRODUCT' | 'BUNDLE' | 'MATERIAL' | 'OTHER';
  skuId?: string;
  bundleId?: string;
  supplierMaterialId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  unit?: string;
  expectedQuantity: number;
  arrivalQuantity: number;
  supplierId?: string;
  batchNo?: string;
  expiryDate?: string;
  availableBatches?: { batchNo: string; expiryDate?: string; supplierId?: string; supplierName?: string }[];
}

export interface ReceivingItemInput {
  id: string;
  type: 'PRODUCT' | 'BUNDLE' | 'MATERIAL' | 'OTHER';
  skuId?: string;
  bundleId?: string;
  supplierMaterialId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  unit?: string;
  expectedQuantity: number;
  receivedQuantity: number;
  batchNo?: string;
  expiryDate?: string;
  supplierId?: string;
  inspectionResult: 'OK' | 'SHORT' | 'DAMAGED' | 'PENDING';
  inspectionNote: string;
}

export interface PutawayItemInput {
  id: string;
  type: 'PRODUCT' | 'BUNDLE' | 'MATERIAL' | 'OTHER';
  skuId?: string;
  bundleId?: string;
  supplierMaterialId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  unit?: string;
  quantity: number;
  originalLocationId?: string;
  originalLocationCode?: string;
  targetLocationId?: string;
  targetLocationCode?: string;
  recommendedLocationId?: string;
  recommendedLocationCode?: string;
  snCodes?: string[];
}

export interface InboundProduct {
  type: 'product' | 'bundle';
  skuId?: string;
  skuCode?: string;
  productId?: string;
  productName?: string;
  bundleName?: string;
  bundleId?: string;
  spec?: string;
  packaging?: string;
  brand?: any;
  category?: any;
  items?: any[];
}
