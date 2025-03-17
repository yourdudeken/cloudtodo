import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { getUserProfile } from '../lib/google-drive';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  locale: string;
  verified_email: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;
  isVerifying: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => Promise<void>;
  verifyCode: (code: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      isVerifying: false,

      login: async () => {
        await api.login();
      },

      logout: async () => {
        await api.logout();
        set({ isAuthenticated: false, user: null, accessToken: null });
      },

      setAccessToken: async (token: string) => {
        try {
          const profile = await getUserProfile(token);
          set({ 
            accessToken: token,
            user: profile,
            isVerifying: true 
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          throw error;
        }
      },

      verifyCode: async (code: string) => {
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