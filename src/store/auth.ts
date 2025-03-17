import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { getUserProfile } from '../lib/google-drive';

interface UserProfile {
  id: string;
  name: string;
  givenName?: string;
  familyName?: string;
  email: string;
  picture: string;
  locale: string;
  verified_email: boolean;
  hd?: string;
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
        try {
          await api.logout();
          
          // Clear all auth-related storage
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('todos-storage');
          sessionStorage.clear();
          
          // Reset state
          set({ 
            isAuthenticated: false, 
            user: null, 
            accessToken: null,
            isVerifying: false
          });
          
          // Redirect to home page
          window.location.href = '/';
        } catch (error) {
          console.error('Logout failed:', error);
          throw error;
        }
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
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken
      })
    }
  )
);