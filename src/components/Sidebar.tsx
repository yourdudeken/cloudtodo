import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Star, 
  Clock, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Kanban
} from 'lucide-react';
import { useTodoStore } from '../store/todos';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { view, setView } = useTodoStore();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'list' },
    { icon: Kanban, label: 'Kanban', view: 'kanban' },
    { icon: Calendar, label: 'Calendar', view: 'calendar' },
    { icon: Star, label: 'Starred', view: 'starred' },
    { icon: Clock, label: 'Recent', view: 'recent' },
  ];

  return (
    <div 
      className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64' : 'w-16'
      } flex flex-col`}
    >
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 bg-white rounded-full p-1 shadow-md hover:bg-gray-50"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )}
      </button>

      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <ListTodo className="w-8 h-8 text-blue-600" />
          {isOpen && (
            <span className="font-semibold text-xl text-gray-800">Tasks</span>
          )}
        </div>
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
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
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

      <div className="p-4 border-t">
        <button
          className={`w-full flex items-center space-x-3 p-2 rounded-lg text-gray-600 hover:bg-gray-50`}
        >
          <Settings className="w-5 h-5" />
          {isOpen && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
};