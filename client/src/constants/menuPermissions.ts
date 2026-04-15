import { PermissionValue } from '../pages/System/types';

export type MenuModule = 'business' | 'config' | 'system';

export interface MenuItem {
  path: string;
  module: MenuModule;
  permission: string;
  label: string;
}

export const MENU_PERMISSIONS: Record<string, MenuModule> = {
  // 业务模块
  '/orders': 'business',
  '/outbound': 'business',
  '/dispatch': 'business',
  '/returns': 'business',
  '/inventory': 'business',
  '/batch-trace': 'business',
  '/purchases': 'business',
  '/inbound': 'business',
  '/stock-transfers': 'business',
  '/transport': 'business',
  // 配置模块
  '/warehouses': 'config',
  '/products': 'config',
  '/customers': 'config',
  '/suppliers': 'config',
  '/carriers': 'config',
  // 系统模块
  '/system': 'system',
};

export const MENU_ITEMS: MenuItem[] = [
  // 业务菜单
  { path: '/orders', module: 'business', permission: 'orders', label: '订单中心' },
  { path: '/outbound', module: 'business', permission: 'outbound', label: '发货管理' },
  { path: '/dispatch', module: 'business', permission: 'dispatch', label: '运力调度' },
  { path: '/returns', module: 'business', permission: 'returns', label: '退货管理' },
  { path: '/inventory', module: 'business', permission: 'inventory', label: '库存看板' },
  { path: '/batch-trace', module: 'business', permission: 'batch', label: '批次追踪' },
  { path: '/purchases', module: 'business', permission: 'purchases', label: '采购管理' },
  { path: '/inbound', module: 'business', permission: 'inbound', label: '入库管理' },
  { path: '/stock-transfers', module: 'business', permission: 'transfer', label: '移库管理' },
  { path: '/transport', module: 'business', permission: 'transport', label: '运力看板' },
  // 配置菜单
  { path: '/warehouses', module: 'config', permission: 'warehouses', label: '仓库管理' },
  { path: '/products', module: 'config', permission: 'products', label: '商品管理' },
  { path: '/customers', module: 'config', permission: 'customers', label: '客户管理' },
  { path: '/suppliers', module: 'config', permission: 'suppliers', label: '供应商管理' },
  { path: '/carriers', module: 'config', permission: 'carriers', label: '承运商管理' },
  // 系统菜单
  { path: '/system', module: 'system', permission: 'system', label: '系统管理' },
];
