export interface PurchaseItem {
  id?: string;
  itemType: 'PRODUCT' | 'BUNDLE' | 'MATERIAL' | 'OTHER';
  skuId?: string;
  bundleId?: string;
  quantity: number;
  price?: number;
  amount?: number;
  sku?: any;
  bundle?: any;
  productName?: string;
  bundleName?: string;
  spec?: string;
  packaging?: string;
  name?: string;
  unit?: string;
  supplierMaterialId?: string;
  supplierMaterial?: {
    id: string;
    name: string;
    unit?: string;
    price?: number;
    category: string;
  };
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplier?: {
    name: string;
  };
  orderDate: string;
  expectedDate?: string;
  status: string;
  totalAmount: number;
  items: PurchaseItem[];
  remark?: string;
  inboundOrders?: Array<{
    id: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  type: 'product' | 'bundle';
  skuId?: string;
  bundleId?: string;
  skuCode?: string;
  productId?: string;
  productName?: string;
  bundleName?: string;
  spec?: string;
  packaging?: string;
  price: number;
  minQty?: number;
  leadDays?: number;
  items?: Array<{
    productName: string;
    spec: string;
    packaging: string;
    quantity: number;
  }>;
}

export interface CustomItem {
  type: 'MATERIAL' | 'OTHER';
  supplierMaterialId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}
