import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth';
import { ROLE_PERMISSIONS } from '../pages/System/permissions';
import { PermissionValue } from '../pages/System/types';
import { MenuModule } from '../constants/menuPermissions';

export function usePermission() {
  const { user } = useAuthStore();

  const checkPermission = (module: MenuModule, action: string): PermissionValue => {
    if (!user?.role) return 'NONE';

    // ADMIN拥有所有权限
    if (user.role === 'ADMIN') return 'WRITE';

    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) return 'NONE';

    const modulePermissions = rolePermissions[module];
    if (!modulePermissions) return 'NONE';

    return modulePermissions[action] || 'NONE';
  };

  const hasPermission = (module: MenuModule, action: string, required: 'READ' | 'WRITE' = 'READ'): boolean => {
    const permission = checkPermission(module, action);

    if (required === 'READ') {
      return permission === 'READ' || permission === 'WRITE';
    }

    return permission === 'WRITE';
  };

  const hasWritePermission = (module: MenuModule, action: string): boolean => {
    return hasPermission(module, action, 'WRITE');
  };

  const hasReadPermission = (module: MenuModule, action: string): boolean => {
    const permission = checkPermission(module, action);
    return permission === 'READ' || permission === 'WRITE';
  };

  // 获取用户可访问的模块列表
  const accessibleModules = useMemo((): MenuModule[] => {
    if (!user?.role) return [];

    // ADMIN可以访问所有模块
    if (user.role === 'ADMIN') {
      return ['oms', 'wms', 'tms', 'afterSales', 'system'];
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) return [];

    return Object.keys(rolePermissions) as MenuModule[];
  }, [user?.role]);

  // 获取用户在某个模块下的所有操作权限
  const getModulePermissions = (module: MenuModule): Record<string, PermissionValue> => {
    if (!user?.role) return {};

    // ADMIN拥有所有权限
    if (user.role === 'ADMIN') {
      const adminModulePermissions = ROLE_PERMISSIONS.ADMIN[module];
      return adminModulePermissions || {};
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) return {};

    const modulePermissions = rolePermissions[module];
    return modulePermissions || {};
  };

  // 判断是否为ADMIN
  const isAdmin = user?.role === 'ADMIN';

  // 判断是否可以管理用户
  const canManageUsers = hasPermission('system', 'users', 'WRITE');

  // 判断是否可以管理系统
  const canManageSystem = hasPermission('system', 'system', 'WRITE');

  return {
    checkPermission,
    hasPermission,
    hasWritePermission,
    hasReadPermission,
    accessibleModules,
    getModulePermissions,
    isAdmin,
    canManageUsers,
    canManageSystem,
  };
}
