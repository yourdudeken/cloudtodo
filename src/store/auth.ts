import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GoogleDriveService } from '@/lib/google-drive';
import { useTaskStore } from './tasks'; // Keep this for logout clearing
import { useNotificationStore } from './notifications';
// taskCache is no longer needed here for loading, but keep for logout clearing
import { taskCache } from '@/lib/cache';
import { socketService } from '@/lib/socket';

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

          // --- Task loading is handled by socketService.initialize() below ---

          // Set auth state (without setting tasks here)
          set({
            isAuthenticated: true,
            user: {
              id: userInfo.sub,
              name: userInfo.name,
              email: userInfo.email,
              picture: userInfo.picture
            },
            accessToken,
            googleDrive // Keep the service instance for file uploads/deletes
          });

          // Initialize socket connection AFTER setting auth state
          // This will trigger the 'authenticate' event on the server
          socketService.initialize();

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

      // reloadTasks is no longer needed in its current form as sync is handled by socket connection
      reloadTasks: async () => {
        console.warn("reloadTasks called, but task synchronization is now handled by socketService.initialize().");
        // If a manual re-sync is desired, trigger socket initialization again.
        const { isAuthenticated } = get();
        if (isAuthenticated) {
           console.log("Attempting re-sync via socketService.initialize()...");
           socketService.initialize();
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          googleDrive: null
        });
        // Clear task store state on logout
        useTaskStore.setState({ tasks: [] }, true); // Replace state entirely
        taskCache.clear(); // Clear cache on logout
        console.log('User logged out, auth state cleared.');
      },
    }),
    {
      name: 'auth-storage', // Local storage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these specific fields
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
      }),
      // This function runs after the state is rehydrated from localStorage
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate auth store:', error);
            // Optionally clear state on rehydration error
            // state?.logout?.();
            return;
          }
          // Check if rehydrated state indicates user was previously authenticated
          if (state?.isAuthenticated && state.accessToken) {
            console.log('Rehydrating auth state, initializing Google Drive service...');
            try {
              // Initialize the GoogleDriveService instance needed for file operations
              const googleDrive = new GoogleDriveService({
                accessToken: state.accessToken,
                clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              });
              // IMPORTANT: Directly mutating the state object here is how Zustand recommends handling this in onRehydrateStorage
              state.googleDrive = googleDrive;

              // Initialize socket connection after rehydration if authenticated
              // Use setTimeout to ensure this runs after the store is fully updated
              setTimeout(() => {
                console.log('Attempting to initialize socket after rehydration...');
                // Access the potentially updated state via getState() to ensure service is set
                if (useAuthStore.getState().isAuthenticated) {
                   socketService.initialize();
                }
              }, 0);
            } catch (initError) {
              console.error("Error initializing GoogleDriveService during rehydration:", initError);
              // Optionally logout user if service init fails critically
              // state.logout?.(); 
            }
          } else {
            console.log('No authenticated state found during rehydration.');
          }
        };
      },
    }
  )
);
