import { Role, PermissionValue } from './types';

export const ROLE_PERMISSIONS: Record<string, Record<string, Record<string, PermissionValue>>> = {
  // 系统管理员 - 跨所有主体，拥有最高权限
  ADMIN: {
    business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
    config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
    system: { system: 'WRITE' },
  },

  // 管理员 - 某主体内的全部权限
  MANAGER: {
    business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
    config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
    system: { system: 'WRITE' },
  },

  // 仓储管理 - WMS全部权限
  WAREHOUSE_MANAGER: {
    business: { orders: 'READ', outbound: 'WRITE', dispatch: 'READ', returns: 'READ', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'READ' },
    config: { warehouses: 'WRITE', products: 'WRITE', customers: 'READ', suppliers: 'WRITE', carriers: 'READ' },
    system: { system: 'NONE' },
  },

  // 运力管理 - TMS全部权限
  TRANSPORT_MANAGER: {
    business: { orders: 'READ', outbound: 'READ', dispatch: 'WRITE', returns: 'READ', inventory: 'READ', batch: 'READ', purchases: 'READ', inbound: 'READ', transfer: 'NONE', transport: 'WRITE' },
    config: { warehouses: 'READ', products: 'READ', customers: 'READ', suppliers: 'READ', carriers: 'WRITE' },
    system: { system: 'NONE' },
  },

  // 售后管理 - 售后模块全部权限
  AFTER_SALES_MANAGER: {
    business: { orders: 'READ', outbound: 'READ', dispatch: 'READ', returns: 'WRITE', inventory: 'READ', batch: 'READ', purchases: 'READ', inbound: 'READ', transfer: 'NONE', transport: 'READ' },
    config: { warehouses: 'READ', products: 'READ', customers: 'READ', suppliers: 'READ', carriers: 'READ' },
    system: { system: 'NONE' },
  },

  // 访客 - 全部只读
  GUEST: {
    business: { orders: 'READ', outbound: 'READ', dispatch: 'READ', returns: 'READ', inventory: 'READ', batch: 'READ', purchases: 'READ', inbound: 'READ', transfer: 'READ', transport: 'READ' },
    config: { warehouses: 'READ', products: 'READ', customers: 'READ', suppliers: 'READ', carriers: 'READ' },
    system: { system: 'NONE' },
  },
};

export function checkPermission(
  role: string,
  module: string,
  action: string
): PermissionValue {
  if (role === 'ADMIN') return 'WRITE';

  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return 'NONE';

  const modulePermissions = rolePermissions[module];
  if (!modulePermissions) return 'NONE';

  return modulePermissions[action] || 'NONE';
}

export function hasPermission(
  role: string,
  module: string,
  action: string,
  required: 'READ' | 'WRITE'
): boolean {
  const permission = checkPermission(role, module, action);

  if (required === 'READ') {
    return permission === 'READ' || permission === 'WRITE';
  }

  return permission === 'WRITE';
}

export function getUserPermissions(role: string) {
  return ROLE_PERMISSIONS[role] || {};
}

export function canAccessModule(role: string, module: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions || !permissions[module]) {
    return false;
  }
  return Object.values(permissions[module]).some(p => p !== 'NONE');
}
