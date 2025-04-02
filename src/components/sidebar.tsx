import React from 'react';
import { Button } from '@/components/ui/button';
// Add X icon import
import { LayoutDashboard, Pin, Star, Calendar, Clock, Kanban as LayoutKanban, ChevronLeft, ChevronRight, Users, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddTaskDialog } from './add-task-dialog';
// Removed CollaborateDialog import
import { useLocation } from '@/lib/hooks';
// Removed UserProfile import as it's not used here anymore
import { useSidebarContext } from '@/lib/sidebar-context';

export function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebarContext();
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

  const handleNavigation = (item: { href: string; icon: React.ElementType; label: string }) => {
    if (item.href) {
      window.history.pushState({}, '', item.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <> {/* Use Fragment */}
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen transition-all duration-300 ease-in-out flex-col flex-shrink-0", // Added dark mode, flex-shrink-0
          isCollapsed ? "w-[60px]" : "w-[240px]",
          "hidden lg:flex" // Hidden below lg, flex on lg+
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && <h2 className="text-xl font-semibold dark:text-white">My Tasks</h2>}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex justify-center px-2 py-4">
          <AddTaskDialog>
            <Button
              className={cn(
                "w-full justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white",
                isCollapsed && "px-2"
              )}
              aria-label={isCollapsed ? "Add Task" : undefined}
            >
              <Plus className="h-5 w-5" />
              {!isCollapsed && <span>Add Task</span>}
            </Button>
          </AddTaskDialog>
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.href || item.label}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 px-3 dark:text-gray-300 dark:hover:bg-gray-700", // Added dark mode styles
                isCollapsed && "justify-center px-2"
              )}
              onClick={() => handleNavigation(item)}
              title={isCollapsed ? item.label : undefined} // Show tooltip when collapsed
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {/* Overlay - visible only on small screens when sidebar is open */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" // Hidden on large screens
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Content */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-[240px] transition-transform duration-300 ease-in-out z-50 flex flex-col", // Always flex-col
          "lg:hidden", // Hidden on large screens
          isCollapsed ? "-translate-x-full" : "translate-x-0" // Slide in/out
        )}
      >
         <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-white">My Tasks</h2>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" /> {/* Use X icon */}
          </Button>
        </div>

        <div className="flex justify-center px-2 py-4">
           {/* Ensure AddTaskDialog trigger works correctly here */}
           <AddTaskDialog>
             <Button className="w-full justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white">
               <Plus className="h-5 w-5" />
               <span>Add Task</span>
             </Button>
           </AddTaskDialog>
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.href || item.label}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 px-3 dark:text-gray-300 dark:hover:bg-gray-700" // Added dark mode styles
              onClick={() => {
                handleNavigation(item);
                setIsCollapsed(true); // Close sidebar on mobile navigation
              }}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Button>
          ))}
        </nav>
      </aside>
    </>
  );
}
