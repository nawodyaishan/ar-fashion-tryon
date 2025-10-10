import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SettingsState {
  // Settings store - currently empty but kept for future settings
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    () => ({}),
    {
      name: 'settings-store',
    },
  ),
);
