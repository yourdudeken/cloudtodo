import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Pin, Star, Calendar, Clock, Kanban as LayoutKanban, ChevronLeft, ChevronRight, Menu, Users, Plus } from 'lucide-react'; // Re-added Plus
import { cn } from '@/lib/utils';
import { AddTaskDialog } from './add-task-dialog';
import { CollaborateDialog } from './collaborate-dialog'; // Re-added CollaborateDialog import
import { useLocation } from '@/lib/hooks';
import { UserProfile } from './user-profile';
import { useSidebarContext } from '@/lib/sidebar-context'; // Corrected context import path
// Removed task store import as it's no longer needed here

export function Sidebar() {
  // Use context for isCollapsed state
  const { isCollapsed, setIsCollapsed } = useSidebarContext(); 
  // const [showCollaborateDialog, setShowCollaborateDialog] = useState(false); // Removed unused dialog state
  const { pathname } = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Pin, label: 'Pinned', href: '/pinned' },
    { icon: Star, label: 'Starred', href: '/starred' },
    { icon: Calendar, label: 'Calendar', href: '/calendar' },
    { icon: Clock, label: 'Recent', href: '/recent' },
    { icon: LayoutKanban, label: 'Kanban', href: '/kanban' },
    { icon: Users, label: 'Collaborate', href: '/collaborate' },
  ];

  // Corrected type for handleNavigation - items only have href now
  const handleNavigation = (item: { href: string; icon: React.ElementType; label: string }) => { 
    if (item.href) {
      window.history.pushState({}, '', item.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="relative">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 md:hidden h-10 w-10"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <aside
        className={cn(
          "bg-white border-r border-gray-200 h-screen transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          "hidden md:flex"
        )}
      >
        {/* Removed User Profile */}

        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && <h2 className="text-xl font-semibold">My Tasks</h2>}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Add Task Button - Centered */}
        <div className="flex justify-center px-2 py-4">
          {/* Pass custom button as children */}
          <AddTaskDialog>
            <Button
              className={cn(
                "w-full justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white",
                isCollapsed && "px-2" // Adjust padding when collapsed
              )}
              aria-label={isCollapsed ? "Add Task" : undefined} // Add aria-label when collapsed
            >
              <Plus className="h-5 w-5" />
              {!isCollapsed && <span>Add Task</span>} {/* Conditionally render text */}
            </Button>
          </AddTaskDialog>
        </div>

        <nav className="p-2 space-y-1"> {/* Removed flex-grow and overflow */}
          {navItems.map((item) => (
            <Button
              key={item.href || item.label}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 px-3",
                isCollapsed && "justify-center px-2"
              )}
              onClick={() => handleNavigation(item)}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 bg-white border-r border-gray-200 w-64 transition-transform duration-300 ease-in-out z-50 md:hidden flex flex-col",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        {/* Removed User Profile */}

        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">My Tasks</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Add Task Button - Centered */}
        <div className="flex justify-center px-2 py-4">
          <AddTaskDialog />
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.href || item.label}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 px-3"
              onClick={() => {
                handleNavigation(item);
                setIsCollapsed(true);
              }}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Button>
          ))}
        </nav>
      </aside>

      {/* Removed CollaborateDialog rendering */}
    </div>
  );
}
