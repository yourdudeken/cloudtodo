import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  defaultView: 'list' | 'kanban' | 'calendar';
  compactMode: boolean;
}

interface SettingsState {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    sound: true,
  },
  defaultView: 'list',
  compactMode: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'settings-storage',
    }
  )
);