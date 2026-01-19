import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function Login() {
    const { login, isLoading } = useGoogleAuth();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/" />;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black overflow-hidden relative">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-pink-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob animation-delay-4000"></div>

            <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg transform rotate-12 hover:rotate-0 transition-all duration-300">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">CloudTodo</h1>
                <p className="text-gray-300 mb-8 text-lg">Your tasks, your drive, your control.</p>

                <button
                    onClick={login}
                    disabled={isLoading}
                    className="w-full group relative flex items-center justify-center gap-3 py-4 px-6 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                >
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    ) : (
                        <>
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Sign in with Google
                        </>
                    )}
                </button>

                <div className="mt-8 text-sm text-gray-400">
                    <p>Stored directly in your Google Drive.</p>
                    <p>We don't see your data.</p>
                </div>
            </div>
        </div>
    );
}
