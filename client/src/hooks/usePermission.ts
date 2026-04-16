import { useAuthStore } from '../stores/auth';

export type ModuleType = 'config' | 'business' | 'system';
export type ActionType = 'warehouses' | 'products' | 'customers' | 'suppliers' | 'carriers' |
  'orders' | 'outbound' | 'dispatch' | 'returns' | 'inventory' | 'batch' |
  'purchases' | 'inbound' | 'transfer' | 'transport' | 'system';

export function usePermission(module: ModuleType, action: ActionType) {
  const { permissions } = useAuthStore();
  const permissionValue = permissions?.[module]?.[action];
  return {
    canRead: permissionValue === 'READ' || permissionValue === 'WRITE',
    canWrite: permissionValue === 'WRITE',
    permission: permissionValue,
  };
}

export function useHasAnyWritePermission(module: ModuleType, actions: ActionType[]) {
  const { permissions } = useAuthStore();
  return actions.some(action => permissions?.[module]?.[action] === 'WRITE');
}