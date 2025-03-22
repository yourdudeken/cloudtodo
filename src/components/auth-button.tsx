import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Shield } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export function AuthButton() {
  const { isAuthenticated, twoFactorPending, login, logout, verifyTwoFactor } = useAuthStore();
  const [verificationCode, setVerificationCode] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: login,
    scope: 'https://www.googleapis.com/auth/drive.file',
    flow: 'implicit',
    ux_mode: 'popup',
  });

  const handleVerifyCode = async () => {
    setIsVerifying(true);
    try {
      const success = await verifyTwoFactor(verificationCode);
      if (!success) {
        setVerificationCode('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (twoFactorPending) {
    return (
      <Dialog.Root open={true}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg">
            <div className="flex flex-col items-center gap-4">
              <Shield className="h-12 w-12 text-blue-600" />
              <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
              <p className="text-center text-gray-600">
                Please enter the verification code sent to your email
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter code"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button 
                onClick={handleVerifyCode}
                disabled={!verificationCode || isVerifying}
                className="w-full"
              >
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

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