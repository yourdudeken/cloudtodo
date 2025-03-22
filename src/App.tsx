import React, { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Sidebar } from '@/components/sidebar';
import { TaskList } from '@/components/task-list';
import { AuthButton } from '@/components/auth-button';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { socketService } from '@/lib/socket';
import { Cloud, ListTodo, Lock, CheckCircle } from 'lucide-react';

function App() {
  const { isAuthenticated, accessToken, user, reloadTasks } = useAuthStore();
  const { settings } = useSettingsStore();

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      socketService.initialize();
    }
  }, [isAuthenticated, accessToken, user]);

  // Reload tasks when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      reloadTasks();
    }
  }, [isAuthenticated, accessToken]);

  // Handle theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    const setTheme = (theme: 'light' | 'dark') => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'dark' : 'light');

      const listener = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      setTheme(settings.theme);
    }
  }, [settings.theme]);

  return (
    <GoogleOAuthProvider 
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <div className="flex min-h-screen bg-background text-foreground">
        {isAuthenticated ? (
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 p-6">
                <TaskList />
              </main>
              <Footer />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
              <div className="max-w-4xl w-full">
                <div className="text-center mb-16 space-y-6">
                  <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text animate-fade-in">
                    Your Tasks, Your Drive
                  </h1>
                  <p className="text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                    A beautiful and secure way to manage your tasks, seamlessly integrated
                    with Google Drive.
                  </p>
                  <div className="pt-8">
                    <AuthButton />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mt-20">
                  <div className="bg-card text-card-foreground backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mb-6 mx-auto rotate-3">
                      <ListTodo className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">Smart Organization</h3>
                    <p className="text-muted-foreground">
                      Organize tasks with categories, tags, and priorities. Keep everything in
                      one place with intelligent sorting and filtering.
                    </p>
                  </div>

                  <div className="bg-card text-card-foreground backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-2xl flex items-center justify-center mb-6 mx-auto -rotate-3">
                      <Cloud className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">Cloud-Powered</h3>
                    <p className="text-muted-foreground">
                      Your tasks are securely stored in your personal Google Drive,
                      accessible anywhere, anytime with real-time sync.
                    </p>
                  </div>

                  <div className="bg-card text-card-foreground backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mb-6 mx-auto rotate-3">
                      <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">Private & Secure</h3>
                    <p className="text-muted-foreground">
                      Your data stays in your Google Drive with end-to-end encryption.
                      No external servers, complete privacy.
                    </p>
                  </div>
                </div>

                <div className="mt-20 flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center justify-center gap-3 bg-card text-card-foreground backdrop-blur-sm px-6 py-3 rounded-full shadow-sm">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-lg">No account needed, just connect with Google Drive</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your tasks are stored securely in your own Google Drive account
                  </p>
                </div>
              </div>
            </div>
            <Footer />
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;