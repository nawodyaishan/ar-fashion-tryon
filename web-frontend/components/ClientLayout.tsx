'use client';
import { ThemeProvider } from '@/components/theme-provider';
import NavBar from '@/components/NavBar';
import { useSettingsStore } from '@/lib/settings-store';
import { useEffect, useState } from 'react';

const geistSans = 'var(--font-geist-sans)';
const geistMono = 'var(--font-geist-mono)';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const lighting = useSettingsStore((s) => s.lighting);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <div className="min-h-screen relative">
      {lighting && <div className="dynamic-bg" aria-hidden="true" />}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NavBar />
        {children}
      </ThemeProvider>
    </div>
  );
}
