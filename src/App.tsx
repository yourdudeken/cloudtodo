import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/auth';
import { useTodoStore } from './store/todos';
import { getAuthUrl } from './lib/google-drive';
import { TodoList } from './components/TodoList';
import { AddTodo } from './components/AddTodo';
import { Sidebar } from './components/Sidebar';
import { DigitVerification } from './components/DigitVerification';
import { CheckCircle2, Cloud, Lock, ListTodo } from 'lucide-react';

function App() {
  const { isAuthenticated, setAccessToken, user, isVerifying, verifyCode } = useAuthStore();
  const { fetchTodos, theme } = useTodoStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Handle OAuth callback
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Only handle the callback if we're on the callback path
    if (path === '/auth/callback' && hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setAccessToken(accessToken);
        // Redirect to home page after successful authentication
        window.location.href = '/';
      }
    }
  }, []);

  // Add this effect to fetch todos when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTodos();
    }
  }, [isAuthenticated, fetchTodos]);

  // Apply theme to root element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleVerification = async (code: string) => {
    const success = await verifyCode(code);
    if (!success) {
      throw new Error('Invalid code');
    }
  };

  // If we're on the callback page, show a loading state
  if (window.location.pathname === '/auth/callback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show verification dialog if needed
  if (isVerifying && user?.emails?.[0]?.value) {
    return (
      <DigitVerification
        email={user.emails[0].value}
        onVerify={handleVerification}
        onCancel={() => window.location.href = '/'}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Your Tasks, Your Drive
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              A beautiful and secure way to manage your tasks, seamlessly integrated with Google Drive.
            </p>
            <button
              onClick={() => window.location.href = getAuthUrl()}
              className="inline-flex items-center px-8 py-4 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-150"
            >
              <Cloud className="w-6 h-6 mr-2" />
              Connect with Google Drive
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <ListTodo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Smart Organization</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Organize tasks with categories, tags, and priorities. Keep everything in one place.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Cloud-Powered</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your tasks are securely stored in your personal Google Drive, accessible anywhere, anytime.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Private & Secure</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your data stays in your Google Drive. No external servers, complete privacy.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-300 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>No account needed, just connect with Google Drive</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Your tasks are stored securely in your own Google Drive account
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div 
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
          </div>
          <div className="space-y-8">
            <AddTodo />
            <TodoList />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;