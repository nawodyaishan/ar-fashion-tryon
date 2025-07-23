'use client';

import { useSettingsStore } from '@/lib/settings-store';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export function useSettings() {
  const lighting = useSettingsStore((s) => s.lighting);
  const setLighting = useSettingsStore((s) => s.setLighting);
  const { theme, setTheme } = useTheme();

  const exportSettings = () => {
    const settings = {
      lighting,
      theme,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ar-fashion-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Settings exported successfully!');
  };

  const resetSettings = () => {
    setLighting(false);
    setTheme('system');
    toast.info('Settings reset to default values');
  };

  return {
    lighting,
    setLighting,
    theme,
    setTheme,
    exportSettings,
    resetSettings,
  };
}
