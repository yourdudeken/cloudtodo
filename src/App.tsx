import React, { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Sidebar } from '@/components/sidebar';
import { TaskList } from '@/components/task-list';
import { AuthButton } from '@/components/auth-button';
import { useAuthStore } from '@/store/auth';
import { socketService } from '@/lib/socket';
import { Cloud, ListTodo, Lock, CheckCircle } from 'lucide-react';

function App() {
  const { isAuthenticated, accessToken, user } = useAuthStore();

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      socketService.initialize();
    }
  }, [isAuthenticated, accessToken, user]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {isAuthenticated ? (
          <>
            <Sidebar />
            <main className="flex-1 p-6">
              <TaskList />
            </main>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
            <div className="max-w-4xl w-full">
              <div className="text-center mb-16 space-y-6">
                <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text animate-fade-in">
                  Your Tasks, Your Drive
                </h1>
                <p className="text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  A beautiful and secure way to manage your tasks, seamlessly integrated
                  with Google Drive.
                </p>
                <div className="pt-8">
                  <AuthButton />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mt-20">
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto rotate-3">
                    <ListTodo className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-blue-900">Smart Organization</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Organize tasks with categories, tags, and priorities. Keep everything in
                    one place with intelligent sorting and filtering.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 mx-auto -rotate-3">
                    <Cloud className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-green-900">Cloud-Powered</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Your tasks are securely stored in your personal Google Drive,
                    accessible anywhere, anytime with real-time sync.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 mx-auto rotate-3">
                    <Lock className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-purple-900">Private & Secure</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Your data stays in your Google Drive with end-to-end encryption.
                    No external servers, complete privacy.
                  </p>
                </div>
              </div>

              <div className="mt-20 flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center justify-center gap-3 text-gray-600 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-lg">No account needed, just connect with Google Drive</p>
                </div>
                <p className="text-sm text-gray-500">
                  Your tasks are stored securely in your own Google Drive account
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;