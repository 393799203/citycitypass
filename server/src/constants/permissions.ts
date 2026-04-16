export const PERMISSIONS = {
  // 业务模块
  business: {
    orders: { name: '订单中心', read: true, write: true },
    outbound: { name: '发货管理', read: true, write: true },
    dispatch: { name: '运力调度', read: true, write: true },
    returns: { name: '退货管理', read: true, write: true },
    inventory: { name: '库存看板', read: true, write: true },
    batch: { name: '批次追踪', read: true, write: true },
    purchases: { name: '采购管理', read: true, write: true },
    inbound: { name: '入库管理', read: true, write: true },
    transfer: { name: '移库管理', read: true, write: true },
    transport: { name: '运力看板', read: true, write: true },
  },

  // 配置模块
  config: {
    warehouses: { name: '仓库管理', read: true, write: true },
    products: { name: '商品管理', read: true, write: true },
    customers: { name: '客户管理', read: true, write: true },
    suppliers: { name: '供应商管理', read: true, write: true },
    carriers: { name: '承运商管理', read: true, write: true },
  },

  // 系统模块
  system: {
    system: { name: '系统管理', read: true, write: true },
  },
};

export const ROLE_PERMISSIONS = {
  // 系统管理员 - 跨所有主体，拥有最高权限
  ADMIN: {
    business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
    config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
    system: { system: 'WRITE' },
  },

  // 主体拥有者 - 该主体的最高权限
  OWNER: {
    business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
    config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
    system: { system: 'READ' },
  },

  // 管理员 - 某主体内的全部权限
  MANAGER: {
    business: { orders: 'WRITE', outbound: 'WRITE', dispatch: 'WRITE', returns: 'WRITE', inventory: 'WRITE', batch: 'WRITE', purchases: 'WRITE', inbound: 'WRITE', transfer: 'WRITE', transport: 'WRITE' },
    config: { warehouses: 'WRITE', products: 'WRITE', customers: 'WRITE', suppliers: 'WRITE', carriers: 'WRITE' },
    system: { system: 'NONE' },
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

export const DEFAULT_ROLES = [
  {
    code: 'ADMIN',
    name: '系统管理员',
    description: '跨所有主体，拥有最高权限，可以看所有主体的数据',
    permissions: ROLE_PERMISSIONS.ADMIN,
    isDefault: false,
  },
  {
    code: 'OWNER',
    name: '主体拥有者',
    description: '该主体的最高权限，可以管理该主体的所有业务',
    permissions: ROLE_PERMISSIONS.OWNER,
    isDefault: false,
  },
  {
    code: 'MANAGER',
    name: '管理员',
    description: '某主体内的全部权限，只能看自己所属主体的数据',
    permissions: ROLE_PERMISSIONS.MANAGER,
    isDefault: true,
  },
  {
    code: 'WAREHOUSE_MANAGER',
    name: '仓储管理',
    description: '负责仓库运营管理，拥有WMS全部功能权限，只能看自己所属主体的数据',
    permissions: ROLE_PERMISSIONS.WAREHOUSE_MANAGER,
    isDefault: true,
  },
  {
    code: 'TRANSPORT_MANAGER',
    name: '运力管理',
    description: '负责配送调度管理，拥有TMS全部功能权限，只能看自己所属主体的数据',
    permissions: ROLE_PERMISSIONS.TRANSPORT_MANAGER,
    isDefault: true,
  },
  {
    code: 'AFTER_SALES_MANAGER',
    name: '售后管理',
    description: '负责退货和客服管理，拥有售后模块全部权限，只能看自己所属主体的数据',
    permissions: ROLE_PERMISSIONS.AFTER_SALES_MANAGER,
    isDefault: true,
  },
  {
    code: 'GUEST',
    name: '访客',
    description: '外部人员查看，仅有查看权限，只能看自己所属主体的数据',
    permissions: ROLE_PERMISSIONS.GUEST,
    isDefault: true,
  },
];

export function checkPermission(
  userRole: keyof typeof ROLE_PERMISSIONS,
  module: keyof typeof PERMISSIONS,
  action: keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
): 'READ' | 'WRITE' | 'NONE' {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions || !rolePermissions[module]) {
    return 'NONE';
  }
  return rolePermissions[module][action] || 'NONE';
}

export function hasPermission(
  userRole: keyof typeof ROLE_PERMISSIONS,
  module: keyof typeof PERMISSIONS,
  action: keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  required: 'READ' | 'WRITE' | 'NONE'
): boolean {
  const userPermission = checkPermission(userRole, module, action);
  if (required === 'READ') {
    return userPermission === 'READ' || userPermission === 'WRITE';
  }
  if (required === 'WRITE') {
    return userPermission === 'WRITE';
  }
  return userPermission === required;
}
