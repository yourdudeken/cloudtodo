import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';

export function AuthButton() {
  const { isAuthenticated, login, logout } = useAuthStore();

  const googleLogin = useGoogleLogin({
    onSuccess: login,
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  if (isAuthenticated) {
    return (
      <Button variant="ghost" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    );
  }

  return (
    <Button
      onClick={() => googleLogin()}
      size="lg"
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-10 py-6 h-auto rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
    >
      <LogIn className="mr-3 h-5 w-5" />
      Connect with Google Drive
    </Button>
  );
}