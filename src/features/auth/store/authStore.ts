import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { googleLogout, TokenResponse } from '@react-oauth/google'; // Import googleLogout and TokenResponse
import axios, { AxiosError } from 'axios'; // Import axios
import { useTaskStore } from '@/features/tasks/store/tasksStore';
import { useNotificationStore } from '@/features/notifications/store/notificationsStore';
import { taskCache } from '@/services/storage';
// Remove socketService import if no longer needed for auth/user info
// import { socketService } from '@/services/socket';

// --- Remove PKCE Helpers ---

// Define UserProfile interface based on example
interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

// Update AuthState
interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null; // Use UserProfile type
  accessToken: string | null;
  isLoggingIn: boolean; // Keep for loading state during profile fetch
  isLoadingProfile: boolean; // Specific loading state for profile fetch
  // Remove PKCE-related methods
  // login: () => Promise<void>;
  // handleAuthCallback: () => Promise<void>;
  loginSuccess: (tokenResponse: Omit<TokenResponse, 'error' | 'error_description' | 'error_uri'>) => void; // New method
  fetchUserProfile: () => Promise<void>; // New method
  logout: () => void;
}

// Remove CODE_VERIFIER_KEY

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      isLoggingIn: false, // Used during token acquisition/profile fetch
      isLoadingProfile: false, // Initialize profile loading state

      // New method to handle successful login from @react-oauth/google
      loginSuccess: (tokenResponse) => {
        console.log('Login Success (Token Response):', tokenResponse);
        set({
          accessToken: tokenResponse.access_token,
          isLoggingIn: true, // Indicate that we are now fetching the profile
          isLoadingProfile: true,
          isAuthenticated: false, // Not fully authenticated until profile is fetched
          user: null, // Clear previous user data
        });
        // Fetch user profile after getting the token
        get().fetchUserProfile();
      },

      // New method to fetch user profile
      fetchUserProfile: async () => {
        const accessToken = get().accessToken;
        if (!accessToken) {
          set({ isLoadingProfile: false, isLoggingIn: false });
          return; // Should not happen if called correctly
        }

        set({ isLoadingProfile: true }); // Ensure loading state is true

        try {
          const response = await axios.get<UserProfile>(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const userProfile = response.data;
          set({
            user: userProfile,
            isAuthenticated: true, // Now fully authenticated
            isLoggingIn: false, // Finished the login process
            isLoadingProfile: false,
          });
          console.log('User profile fetched:', userProfile);
          // Trigger Drive initialization from task store *after* user profile is set
          // Use setTimeout to ensure state update propagates
          setTimeout(() => {
            useTaskStore.getState().initializeDrive();
          }, 0);

        } catch (error: unknown) {
          console.error('Error fetching user profile:', error);
          const axiosError = error as AxiosError;
          useNotificationStore.getState().addNotification({
            type: 'error',
            message: `Failed to fetch user profile: ${axiosError.message || 'Unknown error'}`,
          });
          // Logout if profile fetch fails
          get().logout(); // Call internal logout to clear state
        } finally {
          // Ensure loading states are reset even if initializeDrive fails
          set({ isLoadingProfile: false, isLoggingIn: false });
        }
      },

      // Updated Logout Function
      logout: () => {
        console.log('Logging out...');
        const accessToken = get().accessToken;
        if (accessToken) {
          // Revoke token (optional but good practice)
          axios.post(`https://oauth2.googleapis.com/revoke?token=${accessToken}`)
            .catch(err => console.error("Token revocation failed:", err));
        }
        googleLogout(); // Call logout from @react-oauth/google
        // Clear local state
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isLoggingIn: false,
          isLoadingProfile: false,
        });
        // Clear task store state
        useTaskStore.getState().clearTasks(); // Call clearTasks from task store
        taskCache.clear(); // Clear cache
        // Disconnect socket if it was used
        // socketService.disconnect();
        localStorage.removeItem('auth-storage'); // Clear persisted state
        console.log('User logged out, auth state and storage cleared.');
      },

      // --- Remove PKCE login/handleAuthCallback ---

    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist token and potentially user info (though profile fetch on load is better)
        accessToken: state.accessToken,
        // Persisting user might lead to stale data, fetch on load instead
        // user: state.user,
        // isAuthenticated: state.isAuthenticated // Re-evaluate based on token validity
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate auth store:', error);
            return;
          }

          // Reset loading flags on rehydration
          if (state) {
            state.isLoggingIn = false;
            state.isLoadingProfile = false;
          }


          // If accessToken exists after rehydration, try fetching profile
          if (state?.accessToken) {
            console.log('Rehydrated with access token, attempting to fetch profile...');
            // Use setTimeout to ensure this runs after initial setup
            setTimeout(() => {
              // Check token validity before fetching profile (optional but recommended)
              // A simple way is just to try fetching the profile
              state.fetchUserProfile();
            }, 50); // Small delay
          } else {
            console.log('No access token found during rehydration.');
            // Ensure user is logged out if no token
            state?.logout?.();
          }
        };
      },
    }
  )
);

// --- Remove previous subscribe logic ---
