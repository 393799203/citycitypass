import React, { useEffect, useState } from 'react';
import { checkPermission, canAccessModule } from './permissions';
import { authApi } from '../../api';

interface PermissionGuardProps {
  module: string;
  action?: string;
  required?: 'READ' | 'WRITE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action,
  required = 'READ',
  children,
  fallback = null,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserPermission = async () => {
      try {
        const res = await authApi.me();
        if (res.data.success && res.data.data) {
          const userRole = res.data.data.user.role;
          if (action) {
            const permission = checkPermission(userRole, module, action);
            setHasPermission(
              required === 'READ'
                ? permission === 'READ' || permission === 'WRITE'
                : permission === 'WRITE'
            );
          } else {
            setHasPermission(canAccessModule(userRole, module));
          }
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('检查权限失败:', error);
        setHasPermission(false);
      }
      setLoading(false);
    };

    checkUserPermission();
  }, [module, action, required]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

interface ModuleGuardProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ModuleGuard: React.FC<ModuleGuardProps> = ({
  module,
  children,
  fallback = null,
}) => {
  return (
    <PermissionGuard module={module} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

interface ActionGuardProps {
  module: string;
  action: string;
  required?: 'READ' | 'WRITE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ActionGuard: React.FC<ActionGuardProps> = ({
  module,
  action,
  required = 'WRITE',
  children,
  fallback = null,
}) => {
  return (
    <PermissionGuard module={module} action={action} required={required} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

export const PermissionDenied: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">权限不足</h2>
      <p className="text-gray-600">您没有访问该页面的权限，请联系管理员申请权限。</p>
    </div>
  );
};
