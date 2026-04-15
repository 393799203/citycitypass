import React from 'react';
import { Order, OrderItem, BundleItem, StockLock, BundleStockLock } from './orders';

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

export interface TooltipContent {
  x: number;
  y: number;
  content: React.ReactNode;
}
