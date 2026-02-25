import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAuthStore } from '@/store/authStore';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, Cloud, Shield, Lock, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
    const { login, isLoading } = useGoogleAuth();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [isLoginView, setIsLoginView] = useState(true);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black overflow-hidden relative font-sans">
            {/* Background Effects matching Landing */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo Section */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-12 group">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                        <Cloud className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        CloudTodo
                    </span>
                </Link>

                {/* Auth Card */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-white mb-3">
                            {isLoginView ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="text-gray-400">
                            {isLoginView
                                ? 'Sign in to access your tasks on Google Drive.'
                                : 'Join thousands of users who own their data.'}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={login}
                            disabled={isLoading}
                            className="w-full group relative flex items-center justify-center gap-3 py-4 px-6 bg-white text-black rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all duration-200 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
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
                                    Continue with Google
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-8 flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500 justify-center">
                            <div className="h-px bg-white/10 flex-1"></div>
                            <span>Secure & Private</span>
                            <div className="h-px bg-white/10 flex-1"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <Shield className="w-5 h-5 text-indigo-400" />
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Encrypted</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <Lock className="w-5 h-5 text-purple-400" />
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Full Control</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <button
                            onClick={() => setIsLoginView(!isLoginView)}
                            className="text-gray-400 hover:text-white transition-colors text-sm font-medium inline-flex items-center gap-2 group"
                        >
                            {isLoginView
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Login"}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="mt-8 grid grid-cols-1 gap-4 text-center">
                    <p className="text-xs text-gray-600 px-8 leading-relaxed">
                        By continuing, you agree to our terms. Your data will be stored exclusively in a folder named <span className="text-gray-400 font-mono">CLOUDTODO</span> in your Google Drive.
                    </p>
                </div>
            </div>
        </div>
    );
}
