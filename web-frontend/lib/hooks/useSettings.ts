'use client';

import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export function useSettings() {
  const { theme, setTheme } = useTheme();

  const exportSettings = () => {
    const settings = {
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
    setTheme('system');
    toast.info('Settings reset to default values');
  };

  return {
    theme,
    setTheme,
    exportSettings,
    resetSettings,
  };
}
