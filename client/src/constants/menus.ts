import { PermissionValue } from '../pages/System/types';

export type MenuModule = 'business' | 'config' | 'system';

export interface MenuItem {
  path: string;
  module: MenuModule;
  permission: string;
  labelKey: string;
};

export const MENU_ITEMS: MenuItem[] = [
  { path: '/orders', module: 'business', permission: 'orders', labelKey: 'menu.orderCenter' },
  { path: '/outbound', module: 'business', permission: 'outbound', labelKey: 'menu.shippingManagement' },
  { path: '/dispatch', module: 'business', permission: 'dispatch', labelKey: 'menu.dispatchCenter' },
  { path: '/returns', module: 'business', permission: 'returns', labelKey: 'menu.returnManagement' },
  { path: '/inventory', module: 'business', permission: 'inventory', labelKey: 'menu.inventoryDashboard' },
  { path: '/batch-trace', module: 'business', permission: 'batch', labelKey: 'menu.batchTracking' },
  { path: '/purchases', module: 'business', permission: 'purchases', labelKey: 'menu.purchaseManagement' },
  { path: '/inbound', module: 'business', permission: 'inbound', labelKey: 'menu.inboundManagement' },
  { path: '/stock-transfers', module: 'business', permission: 'transfer', labelKey: 'menu.transferManagement' },
  { path: '/transport', module: 'business', permission: 'transport', labelKey: 'menu.transportDashboard' },
  { path: '/warehouses', module: 'config', permission: 'warehouses', labelKey: 'menu.warehouseManagement' },
  { path: '/products', module: 'config', permission: 'products', labelKey: 'menu.productManagement' },
  { path: '/customers', module: 'config', permission: 'customers', labelKey: 'menu.customerManagement' },
  { path: '/suppliers', module: 'config', permission: 'suppliers', labelKey: 'menu.supplierManagement' },
  { path: '/carriers', module: 'config', permission: 'carriers', labelKey: 'menu.carrierManagement' },
  { path: '/system', module: 'system', permission: 'system', labelKey: 'menu.systemManagement' },
];
