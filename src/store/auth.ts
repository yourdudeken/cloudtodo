import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isVerifying: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void;
  verifyCode: (code: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      isVerifying: false,
      login: async () => {
        await api.login();
      },
      logout: async () => {
        await api.logout();
        set({ isAuthenticated: false, user: null });
      },
      setUser: (user) => set({ user, isVerifying: true }),
      verifyCode: async (code) => {
        try {
          const success = await api.verifyCode(code);
          if (success) {
            set({ isAuthenticated: true, isVerifying: false });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Verification failed:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);