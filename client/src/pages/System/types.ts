export const PERMISSIONS = {
  // 业务模块
  business: {
    orders: { name: '订单中心', category: '业务' },
    outbound: { name: '发货管理', category: '业务' },
    dispatch: { name: '运力调度', category: '业务' },
    returns: { name: '退货管理', category: '业务' },
    inventory: { name: '库存看板', category: '业务' },
    batch: { name: '批次追踪', category: '业务' },
    purchases: { name: '采购管理', category: '业务' },
    inbound: { name: '入库管理', category: '业务' },
    transfer: { name: '移库管理', category: '业务' },
    transport: { name: '运力看板', category: '业务' },
  },

  // 配置模块
  config: {
    warehouses: { name: '仓库管理', category: '配置' },
    products: { name: '商品管理', category: '配置' },
    customers: { name: '客户管理', category: '配置' },
    suppliers: { name: '供应商管理', category: '配置' },
    carriers: { name: '承运商管理', category: '配置' },
  },

  // 系统模块
  system: {
    system: { name: '系统管理', category: '系统' },
  },
};

export const MODULE_NAMES: Record<keyof typeof PERMISSIONS, string> = {
  business: '业务模块',
  config: '配置模块',
  system: '系统模块',
};

export const ROLE_NAMES: Record<string, string> = {
  ADMIN: '系统管理员',
  MANAGER: '管理员',
  WAREHOUSE_MANAGER: '仓储管理',
  TRANSPORT_MANAGER: '运力管理',
  AFTER_SALES_MANAGER: '售后管理',
  GUEST: '访客',
};

export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-red-100', text: 'text-red-800' },
  MANAGER: { bg: 'bg-purple-100', text: 'text-purple-800' },
  WAREHOUSE_MANAGER: { bg: 'bg-blue-100', text: 'text-blue-800' },
  TRANSPORT_MANAGER: { bg: 'bg-green-100', text: 'text-green-800' },
  AFTER_SALES_MANAGER: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  GUEST: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export type PermissionValue = 'READ' | 'WRITE' | 'NONE';

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  permissions: Record<string, Record<string, PermissionValue>>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  ownerIds?: string;
  owners?: Array<{
    id: string;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Owner {
  id: string;
  name: string;
}
