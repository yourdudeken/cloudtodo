import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Star, 
  Clock, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Kanban,
  Sun,
  Moon,
  LogOut,
  Pin,
  User,
  Mail,
  Globe,
  Shield,
  ChevronDown
} from 'lucide-react';
import { useTodoStore } from '../store/todos';
import { useAuthStore } from '../store/auth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { view, setView, theme, setTheme } = useTodoStore();
  const { logout, user } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'list' },
    { icon: Pin, label: 'Pinned', view: 'pinned' },
    { icon: Kanban, label: 'Kanban', view: 'kanban' },
    { icon: Calendar, label: 'Calendar', view: 'calendar' },
    { icon: Star, label: 'Starred', view: 'starred' },
    { icon: Clock, label: 'Recent', view: 'recent' },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64' : 'w-16'
      } flex flex-col`}
    >
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 bg-white dark:bg-gray-700 rounded-full p-1 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={() => isOpen && setShowProfile(!showProfile)}
          className="w-full"
        >
          <div className="flex items-center space-x-3">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name || 'User'} 
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 dark:border-blue-400"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {isOpen && (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transform transition-transform ${
                    showProfile ? 'rotate-180' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </button>

        {isOpen && showProfile && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                <Mail className="w-4 h-4" />
                <span className="truncate">{user?.email}</span>
              </div>
              {user?.locale && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Globe className="w-4 h-4" />
                  <span>{new Intl.DisplayNames([user.locale], { type: 'language' }).of(user.locale)}</span>
                </div>
              )}
              {user?.verified_email && (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <Shield className="w-4 h-4" />
                  <span>Verified Account</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t dark:border-gray-700">
              <button
                onClick={logout}
                className="w-full flex items-center space-x-2 px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.view}>
                <button
                  onClick={() => setView(item.view as any)}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    view === item.view
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isOpen && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t dark:border-gray-700">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`w-full flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${
            showSettings ? 'bg-gray-50 dark:bg-gray-700' : ''
          }`}
        >
          <Settings className="w-5 h-5" />
          {isOpen && <span>Settings</span>}
        </button>

        {showSettings && isOpen && (
          <div className="mt-2 space-y-2 pl-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};