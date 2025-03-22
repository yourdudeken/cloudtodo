import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GoogleDriveService } from '@/lib/google-drive';
import { useTaskStore } from './tasks';
import { useNotificationStore } from './notifications';
import { taskCache } from '@/lib/cache';

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  googleDrive: GoogleDriveService | null;
  login: (response: any) => Promise<void>;
  logout: () => void;
  reloadTasks: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      googleDrive: null,

      login: async (response) => {
        const accessToken = response.access_token;
        
        try {
          // Get user info from Google
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          }).then(res => res.json());

          // Initialize Google Drive service
          const googleDrive = new GoogleDriveService({
            accessToken,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          });

          // First check cache for tasks
          let tasks = taskCache.getTasks();
          
          // If no cached tasks, load from Google Drive
          if (!tasks) {
            tasks = await googleDrive.loadTasks();
            if (tasks && tasks.length > 0) {
              taskCache.setTasks(tasks);
            }
          }

          // Set tasks in store
          useTaskStore.setState({ tasks: tasks || [] });

          // Set auth state
          set({
            isAuthenticated: true,
            user: {
              id: userInfo.sub,
              name: userInfo.name,
              email: userInfo.email,
              picture: userInfo.picture
            },
            accessToken,
            googleDrive
          });

          useNotificationStore.getState().addNotification({
            type: 'success',
            message: 'Successfully connected to Google Drive'
          });
        } catch (error) {
          console.error('Login error:', error);
          useNotificationStore.getState().addNotification({
            type: 'error',
            message: 'Failed to connect to Google Drive'
          });
        }
      },

      reloadTasks: async () => {
        const { googleDrive } = get();
        if (!googleDrive) return;

        try {
          // First check cache
          let tasks = taskCache.getTasks();
          
          // If no valid cache, load from Google Drive
          if (!tasks) {
            tasks = await googleDrive.loadTasks();
            if (tasks && tasks.length > 0) {
              taskCache.setTasks(tasks);
            }
          }

          useTaskStore.setState({ tasks: tasks || [] });
        } catch (error) {
          console.error('Error reloading tasks:', error);
          useNotificationStore.getState().addNotification({
            type: 'error',
            message: 'Failed to reload tasks'
          });
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          googleDrive: null
        });
        useTaskStore.setState({ tasks: [] });
        taskCache.clear(); // Clear cache on logout
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);