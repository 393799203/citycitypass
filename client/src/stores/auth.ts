import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';

interface OwnerInfo {
  id: string;
  name: string;
  roleId: string;
  roleCode?: string;
  roleName?: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  phone?: string;
  email?: string;
  owners?: OwnerInfo[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: Record<string, Record<string, string>> | null;
  owners: OwnerInfo[];
  setAuth: (token: string, user: User, permissions?: Record<string, Record<string, string>>, owners?: OwnerInfo[]) => void;
  setPermissions: (permissions: Record<string, Record<string, string>>) => void;
  refreshPermissions: () => Promise<void>;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: null,
      owners: [],
      setAuth: (token, user, permissions, owners) => set({
        token,
        user,
        permissions: permissions || null,
        owners: owners || []
      }),
      setPermissions: (permissions) => set({ permissions }),
      refreshPermissions: async () => {
        try {
          const res = await authApi.me();
          if (res.data.success) {
            const { user, permissions, owners } = res.data.data;
            set({ user, permissions, owners });
          }
        } catch (error) {
          console.error('Failed to refresh permissions:', error);
        }
      },
      logout: () => {
        set({ token: null, user: null, permissions: null, owners: [] });
        localStorage.removeItem('auth-storage');
      },
      clearAuth: () => set({ token: null, user: null, permissions: null, owners: [] }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
