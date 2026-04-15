import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../constants/permissions';

export type PermissionModule = keyof typeof ROLE_PERMISSIONS.ADMIN;
export type PermissionAction =
  | 'orders' | 'import' | 'export' | 'cancel'
  | 'inbound' | 'outbound' | 'inventory' | 'batch' | 'location' | 'adjustment' | 'transfer'
  | 'dispatch' | 'vehicle' | 'driver' | 'route' | 'track' | 'report'
  | 'returns' | 'refund' | 'complaint' | 'statistics'
  | 'users' | 'roles' | 'owners' | 'parameters' | 'backup' | 'logs';

export interface PermissionCheck {
  module: PermissionModule;
  action: PermissionAction;
  required: 'READ' | 'WRITE';
}

// 模块到操作的映射
const MODULE_ACTION_MAP: Record<PermissionAction, PermissionModule> = {
  // OMS模块
  orders: 'oms',
  import: 'oms',
  export: 'oms',
  cancel: 'oms',
  // WMS模块
  inbound: 'wms',
  outbound: 'wms',
  inventory: 'wms',
  batch: 'wms',
  location: 'wms',
  adjustment: 'wms',
  transfer: 'wms',
  // TMS模块
  dispatch: 'tms',
  vehicle: 'tms',
  driver: 'tms',
  route: 'tms',
  track: 'tms',
  report: 'tms',
  // 售后模块
  returns: 'afterSales',
  refund: 'afterSales',
  complaint: 'afterSales',
  statistics: 'afterSales',
  // 系统模块
  users: 'system',
  roles: 'system',
  owners: 'system',
  parameters: 'system',
  backup: 'system',
  logs: 'system',
};

export function checkPermission(
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction
): 'READ' | 'WRITE' | 'NONE' {
  // ADMIN拥有所有权限
  if (role === 'ADMIN') {
    return 'WRITE';
  }

  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) {
    return 'NONE';
  }

  const modulePermissions = rolePermissions[module];
  if (!modulePermissions) {
    return 'NONE';
  }

  return modulePermissions[action] || 'NONE';
}

export function hasPermission(
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction,
  required: 'READ' | 'WRITE'
): boolean {
  const permission = checkPermission(role, module, action);

  if (required === 'READ') {
    return permission === 'READ' || permission === 'WRITE';
  }

  return permission === 'WRITE';
}

// 权限检查中间件工厂函数
export function requirePermission(module: PermissionModule, action: PermissionAction, required: 'READ' | 'WRITE' = 'WRITE') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录或登录已过期' });
    }

    const { role } = req.user;

    // ADMIN拥有所有权限
    if (role === 'ADMIN') {
      return next();
    }

    if (!hasPermission(role, module, action, required)) {
      return res.status(403).json({
        success: false,
        message: `您没有${action}的${required === 'WRITE' ? '读写' : '读取'}权限`
      });
    }

    next();
  };
}

// 简化的权限检查中间件，根据action自动推断module
export function requireAction(action: PermissionAction, required: 'READ' | 'WRITE' = 'WRITE') {
  const module = MODULE_ACTION_MAP[action];
  if (!module) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  return requirePermission(module, action, required);
}

// 获取用户的数据范围
export function getUserDataScope(user: { role: UserRole; ownerId?: string | null }) {
  // ADMIN可以看到所有数据
  if (user.role === 'ADMIN') {
    return { all: true, ownerId: undefined };
  }

  // 其他角色只能看到自己主体的数据
  return { all: false, ownerId: user.ownerId || undefined };
}

// 获取用户可访问的模块列表
export function getUserAccessibleModules(role: UserRole): PermissionModule[] {
  if (role === 'ADMIN') {
    return ['oms', 'wms', 'tms', 'afterSales', 'system'];
  }

  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) {
    return [];
  }

  return Object.keys(rolePermissions) as PermissionModule[];
}

// 获取角色在某个模块下的所有操作权限
export function getModulePermissions(role: UserRole, module: PermissionModule): Record<PermissionAction, 'READ' | 'WRITE' | 'NONE'> {
  if (role === 'ADMIN') {
    const adminModulePermissions = ROLE_PERMISSIONS.ADMIN[module];
    return adminModulePermissions as Record<PermissionAction, 'READ' | 'WRITE' | 'NONE'>;
  }

  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) {
    return {} as Record<PermissionAction, 'READ' | 'WRITE' | 'NONE'>;
  }

  const modulePermissions = rolePermissions[module];
  if (!modulePermissions) {
    return {} as Record<PermissionAction, 'READ' | 'WRITE' | 'NONE'>;
  }

  return modulePermissions as Record<PermissionAction, 'READ' | 'WRITE' | 'NONE'>;
}
