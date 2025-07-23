'use client';
import { ThemeProvider } from '@/components/theme-provider';
import NavBar from '@/components/NavBar';
import { useSettingsStore } from '@/lib/settings-store';
import { Toaster } from '@/components/ui/sonner';
import { useMount } from '@/lib/hooks/useMount';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const lighting = useSettingsStore((s) => s.lighting);
  const mounted = useMount();

  if (!mounted) return null;
  return (
    <div className="min-h-screen relative">
      {lighting && <div className="dynamic-bg" aria-hidden="true" />}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NavBar />
        {children}
        <Toaster />
      </ThemeProvider>
    </div>
  );
}
