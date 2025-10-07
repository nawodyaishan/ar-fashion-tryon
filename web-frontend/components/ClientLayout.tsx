'use client';
import { ThemeProvider } from '@/components/theme-provider';
import NavBar from '@/components/NavBar';
import StatusFooter from '@/components/StatusFooter';
import HelpModal from '@/components/tryon/HelpModal';
import AboutModal from '@/components/tryon/AboutModal';
import GarmentGallery from '@/components/tryon/GarmentGallery';
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
        <StatusFooter />
        <Toaster />

        {/* Global Modals */}
        <HelpModal />
        <AboutModal />
        <GarmentGallery />
      </ThemeProvider>
    </div>
  );
}
