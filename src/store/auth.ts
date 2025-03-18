import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GoogleDriveService } from '@/lib/google-drive';
import { useTaskStore } from './tasks';
import jwtDecode from 'jwt-decode';

interface User {
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      googleDrive: null,
      login: async (response) => {
        const accessToken = response.access_token;
        const googleDrive = new GoogleDriveService({
          accessToken,
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        });

        // Decode the credential to get user info
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        }).then(res => res.json());

        // Load tasks from Google Drive after login
        const tasks = await googleDrive.loadTasks();
        useTaskStore.setState({ tasks });

        set({
          isAuthenticated: true,
          user: {
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture
          },
          accessToken,
          googleDrive,
        });
      },
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          googleDrive: null,
        });
        // Clear tasks when logging out
        useTaskStore.setState({ tasks: [] });
      },
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);