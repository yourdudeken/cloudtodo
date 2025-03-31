import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';
import { useSettingsStore } from '@/store/settings';
import { Button } from './ui/button';
import { Bell, Settings, HelpCircle, Sun, Moon, Monitor, Check, X, Volume2, Mail, BellRing, BellOff } from 'lucide-react'; // Added BellOff, BellRing
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { format } from 'date-fns';
import { UserProfile } from './user-profile'; // Import UserProfile
import { requestNotificationPermission, syncBrowserNotifications } from '@/lib/browser-notifications'; // Import notification utilities
import { useTaskStore } from '@/store/tasks'; // Import useTaskStore

export function Header() {
  const { user } = useAuthStore();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();
  const { settings, updateSettings } = useSettingsStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">CT</span>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            CloudTask
          </h1>
        </div>

        {/* Right Side Actions - UserProfile moved to the end */}
        <div className="flex items-center gap-4">
          {/* Help Button */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="w-80 rounded-lg bg-white shadow-lg border p-4"
                sideOffset={5}
                align="end"
              >
                <div className="space-y-4">
                  <h3 className="font-semibold">Need Help?</h3>
                  <div className="space-y-2">
                    <a
                      href="#"
                      className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <h4 className="font-medium">Getting Started</h4>
                      <p className="text-sm text-gray-600">
                        Learn the basics of TaskMaster
                      </p>
                    </a>
                    <a
                      href="#"
                      className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <h4 className="font-medium">Video Tutorials</h4>
                      <p className="text-sm text-gray-600">
                        Watch step-by-step guides
                      </p>
                    </a>
                    <a
                      href="#"
                      className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <h4 className="font-medium">FAQ</h4>
                      <p className="text-sm text-gray-600">
                        Find answers to common questions
                      </p>
                    </a>
                  </div>
                  <div className="pt-2 border-t">
                    <Button variant="outline" className="w-full">
                      Contact Support
                    </Button>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Notifications */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="w-96 rounded-lg bg-white shadow-lg border"
                sideOffset={5}
                align="end"
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                      >
                        Mark all read
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        disabled={notifications.length === 0}
                      >
                        Clear all
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <BellRing className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b last:border-b-0 ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(notification.timestamp, 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeNotification(notification.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Settings */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-gray-600" />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="w-80 rounded-lg bg-white shadow-lg border p-4"
                sideOffset={5}
                align="end"
              >
                <div className="space-y-4">
                  <h3 className="font-semibold">Settings</h3>

                  {/* Theme */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <Select.Root
                      value={settings.theme}
                      onValueChange={(value: any) =>
                        updateSettings({ theme: value })
                      }
                    >
                      <Select.Trigger className="w-full px-3 py-2 border rounded-lg">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-lg shadow-lg border p-1">
                          <Select.Viewport>
                            {themeOptions.map((option) => (
                              <Select.Item
                                key={option.value}
                                value={option.value}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                              >
                                <option.icon className="h-4 w-4" />
                                <Select.ItemText>{option.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Select.Root
                      value={settings.language}
                      onValueChange={(value: any) =>
                        updateSettings({ language: value })
                      }
                    >
                      <Select.Trigger className="w-full px-3 py-2 border rounded-lg">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-lg shadow-lg border p-1">
                          <Select.Viewport>
                            {languageOptions.map((option) => (
                              <Select.Item
                                key={option.value}
                                value={option.value}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                              >
                                <Select.ItemText>{option.label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notifications</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={(e) =>
                            updateSettings({
                              notifications: {
                                ...settings.notifications,
                                email: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.notifications.push}
                          onChange={(e) =>
                            updateSettings({
                              notifications: {
                                ...settings.notifications,
                                push: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        <Bell className="h-4 w-4" />
                        <span className="text-sm">Push notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sound}
                          onChange={(e) =>
                            updateSettings({
                              notifications: {
                                ...settings.notifications,
                                sound: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        <Volume2 className="h-4 w-4" />
                        <span className="text-sm">Sound notifications</span>
                      </label>
                    </div>
                  </div>

                  {/* View Settings */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">View Settings</label>
                    <div className="space-y-2">
                      <Select.Root
                        value={settings.defaultView}
                        onValueChange={(value: any) =>
                          updateSettings({ defaultView: value })
                        }
                      >
                        <Select.Trigger className="w-full px-3 py-2 border rounded-lg">
                          <Select.Value placeholder="Default View" />
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content className="bg-white rounded-lg shadow-lg border p-1">
                            <Select.Viewport>
                              <Select.Item value="list" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                                <Select.ItemText>List View</Select.ItemText>
                              </Select.Item>
                              <Select.Item value="kanban" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                                <Select.ItemText>Kanban Board</Select.ItemText>
                              </Select.Item>
                              <Select.Item value="calendar" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                                <Select.ItemText>Calendar View</Select.ItemText>
                              </Select.Item>
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.compactMode}
                          onChange={(e) =>
                            updateSettings({ compactMode: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Compact mode</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => useSettingsStore.getState().resetSettings()}
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <UserProfile /> {/* UserProfile moved to the end */}
        </div>
      </div>
    </header>
  );
}
