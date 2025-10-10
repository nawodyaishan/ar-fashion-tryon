import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Settings store - currently empty but kept for future settings
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({}),
    {
      name: 'settings-store',
    },
  ),
);
