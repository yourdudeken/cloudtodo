import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Pin, Star, Calendar, Clock, Kanban as LayoutKanban, ChevronLeft, ChevronRight, Menu, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddTaskDialog } from './add-task-dialog';
import { CollaborateDialog } from './collaborate-dialog';
import { useLocation } from '@/lib/hooks';
import { UserProfile } from './user-profile';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCollaborateDialog, setShowCollaborateDialog] = useState(false);
  const { pathname } = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Pin, label: 'Pinned', href: '/pinned' },
    { icon: Star, label: 'Starred', href: '/starred' },
    { icon: Calendar, label: 'Calendar', href: '/calendar' },
    { icon: Clock, label: 'Recent', href: '/recent' },
    { icon: LayoutKanban, label: 'Kanban', href: '/kanban' },
    { icon: Users, label: 'Collaborate', onClick: () => setShowCollaborateDialog(true) },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
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
        className="absolute right-4 top-4 lg:hidden"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <aside
        className={cn(
          "bg-white border-r border-gray-200 h-screen transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? "w-[60px]" : "w-[240px]",
          "hidden lg:flex"
        )}
      >
        {/* User Profile */}
        {!isCollapsed && <UserProfile />}

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
          <AddTaskDialog />
        </div>

        <nav className="p-2 space-y-1">
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
          "fixed inset-y-0 left-0 bg-white border-r border-gray-200 w-[240px] transition-transform duration-300 ease-in-out z-50 lg:hidden flex flex-col",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        {/* User Profile */}
        <UserProfile />

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

      {showCollaborateDialog && (
        <CollaborateDialog onClose={() => setShowCollaborateDialog(false)} />
      )}
    </div>
  );
}