import { Location, Shelf, Zone } from '@prisma/client';

type LocationWithShelf = Location & {
  shelf?: Shelf & { zone?: Zone };
};

export function formatLocationCode(location: LocationWithShelf | null | undefined): string {
  if (!location) return '-';
  const zone = location.shelf?.zone?.code || '';
  const shelf = location.shelf?.code || '';
  const level = location.level || '';
  return `${zone}-${shelf}-L${level}`;
}

export function parseLocationCode(locationCode: string): { zoneCode: string; shelfCode: string; level: string } | null {
  const match = locationCode.match(/^([^-]+)-([^-]+)-L(.+)$/);
  if (!match) return null;
  return {
    zoneCode: match[1],
    shelfCode: match[2],
    level: match[3],
  };
}

export function generateBatchNo(prefix?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix || ''}${year}${month}${day}${random}`;
}

export function generateOrderNo(): string {
  return `ORD${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function generateReturnNo(): string {
  return `RET${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function generatePickOrderNo(prefix: string = 'PICK'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PK${year}${month}${day}${random}`;
}

export function generateTransferNo(prefix: string = 'TRF'): string {
  return `TRF${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  PROCESSING: '处理中',
  PICKING: '拣货中',
  PICKED: '已拣货',
  PACKED: '已打包',
  SHIPPED: '已发货',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
  PARTIAL_REFUND: '部分退款',
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  RETURN_REQUESTED: '退货申请',
  RETURN_APPROVED: '退货审核通过',
  RETURN_REJECTED: '退货拒绝',
  RETURN_SHIPPED: '退货已发货',
  RETURN_RECEIVED: '退货已收货',
  QUALIFIED: '已验收',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export const STOCK_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: '可用',
  LOCKED: '已锁定',
  RESERVED: '已预留',
  DAMAGED: '损坏',
  EXPIRED: '过期',
};
