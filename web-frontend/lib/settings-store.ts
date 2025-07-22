import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  lighting: boolean;
  setLighting: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lighting: true,
      setLighting: (lighting) => set({ lighting }),
    }),
    {
      name: 'settings-store',
    },
  ),
);
