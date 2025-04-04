//import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useAuthStore } from '@/store/auth';
import { LogOut, User } from 'lucide-react';
import { Button } from './ui/button';

export function UserProfile() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <Popover.Root>
      {/* Trigger is now just the profile picture */}
      <Popover.Trigger asChild>
        <button className="flex items-center justify-center p-3 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name} // Keep alt text for accessibility
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-80 rounded-lg bg-white shadow-lg border p-4 z-50"
          sideOffset={5}
        >
          <div className="flex items-center gap-4 mb-4">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            )}
            <div>
              <div className="font-semibold text-lg">{user.name}</div>
              <div className="text-gray-500">{user.email}</div>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              logout();
              document.body.click(); // Close popover
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
