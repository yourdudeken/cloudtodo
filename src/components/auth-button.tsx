import React from 'react';
import { useGoogleLogin } from '@react-oauth/google'; // Re-import useGoogleLogin
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications'; // Import notification store
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
// Remove Shield, Dialog imports if 2FA is not being re-added

export function AuthButton() {
  // Use loginSuccess instead of login. Add isLoadingProfile.
  const { isAuthenticated, loginSuccess, logout, isLoggingIn, isLoadingProfile } = useAuthStore();

  // Re-introduce useGoogleLogin hook
  const googleLogin = useGoogleLogin({
    onSuccess: loginSuccess, // Call loginSuccess from the store
    onError: (error) => {
      console.error('Google Login Error:', error);
      // Optionally trigger a notification via the store
      useNotificationStore.getState().addNotification({
         type: 'error',
          message: 'Google Sign-In failed. Please try again.'
       });
     },
     // Explicitly request necessary scopes, including drive.file
     scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
     // Force consent screen to ensure permissions are re-granted
     prompt: 'consent',
     flow: 'implicit',
   });

  // Determine overall loading state
  const isLoading = isLoggingIn || isLoadingProfile;

  if (isAuthenticated) {
    return (
      <Button variant="ghost" onClick={logout} disabled={isLoading}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    );
  }

  return (
    <Button
      // Trigger the hook function
      onClick={() => googleLogin()}
      // Disable button during login process or profile fetch
      disabled={isLoading}
      size="lg"
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-10 py-6 h-auto rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <LogIn className="mr-3 h-5 w-5" />
      {isLoading ? 'Connecting...' : 'Connect with Google Drive'}
    </Button>
  );
}
