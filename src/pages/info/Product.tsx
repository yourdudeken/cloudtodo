import { Footer } from '@/components/Footer';
import { Box, Layers, Zap, Shield, AppWindow } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Product() {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Simple Nav */}
            <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group cursor-pointer">
                        <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent uppercase">
                            CloudTodo
                        </span>
                    </Link>
                    <Link to="/login" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">
                        Get Started
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-24">
                <div className="text-center mb-24">
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter">The Product.</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-2xl mx-auto">
                        A modern, minimalist task manager built on top of the world's most trusted cloud storage.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <Link to="/features" className="p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Layers className="w-32 h-32 text-indigo-400" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Features</h2>
                        <p className="text-gray-400 mb-8 max-w-xs">Explore everything CloudTodo can do for your workflow.</p>
                        <span className="text-indigo-400 font-bold group-hover:gap-4 flex items-center gap-2 transition-all">
                            View all features <Zap className="w-4 h-4" />
                        </span>
                    </Link>

                    <Link to="/how-it-works" className="p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Box className="w-32 h-32 text-purple-400" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Mechanism</h2>
                        <p className="text-gray-400 mb-8 max-w-xs">Understand the zero-knowledge architecture behind the app.</p>
                        <span className="text-purple-400 font-bold group-hover:gap-4 flex items-center gap-2 transition-all">
                            How it works <Shield className="w-4 h-4" />
                        </span>
                    </Link>

                    <Link to="/desktop" className="p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:border-green-500/30 transition-all group overflow-hidden relative md:col-span-2">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AppWindow className="w-32 h-32 text-green-400" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Ecosystem</h2>
                        <p className="text-gray-400 mb-8 max-w-md">Download CloudTodo for your desktop or access it via our high-performance web app.</p>
                        <span className="text-green-400 font-bold group-hover:gap-4 flex items-center gap-2 transition-all">
                            View Download Options
                        </span>
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
