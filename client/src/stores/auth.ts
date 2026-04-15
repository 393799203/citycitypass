import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: Record<string, Record<string, string>> | null;
  setAuth: (token: string, user: User, permissions?: Record<string, Record<string, string>>) => void;
  setPermissions: (permissions: Record<string, Record<string, string>>) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: null,
      setAuth: (token, user, permissions) => set({ token, user, permissions: permissions || null }),
      setPermissions: (permissions) => set({ permissions }),
      logout: () => {
        set({ token: null, user: null, permissions: null });
        localStorage.clear();
      },
      clearAuth: () => set({ token: null, user: null, permissions: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
