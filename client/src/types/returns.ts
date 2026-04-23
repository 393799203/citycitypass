import { BundleItem } from './orders';

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
